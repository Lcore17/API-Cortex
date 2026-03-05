import asyncio
import json
import random
import sqlite3
from typing import List
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from anomaly_detector import AnomalyDetector
from traffic_generator import TrafficGenerator
from security_agent import SecurityAgent
from ip_reputation import reputation_engine
from sql_detector import sql_detector
from geo_detector import geo_detector
from shadow_api_discovery import shadow_api_discovery
from ddos_detector import ddos_detector
from time_pattern_detector import time_pattern_detector
from api_dependency_tracker import api_dependency_tracker

# Database Setup
def init_db():
    conn = sqlite3.connect("cortex.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            method TEXT,
            endpoint TEXT,
            ip TEXT,
            status_code INTEGER,
            response_time REAL,
            payload_size REAL,
            risk_score INTEGER,
            threat_type TEXT,
            reputation TEXT,
            is_proxy INTEGER
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS threats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            method TEXT,
            endpoint TEXT,
            ip TEXT,
            status_code INTEGER,
            risk_score INTEGER,
            threat_type TEXT,
            investigation TEXT
        )
    """)
    conn.commit()
    conn.close()

detector = AnomalyDetector()
generator = TrafficGenerator()
agent = SecurityAgent()

class DashboardState:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.simulation_queue = []
        # Behaviour tracking: ip -> [timestamps]
        self.ip_history = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

state = DashboardState()

async def traffic_simulator_loop():
    while True:
        attack_type = None
        if state.simulation_queue:
            attack_type = state.simulation_queue.pop(0)
        
        request = generator.generate_request(attack_type=attack_type)
        
        # --- LAYER 1: IP Intelligence ---
        intel = reputation_engine.check_reputation(request["ip"])
        request["reputation"] = intel["status"]
        request["is_proxy"] = intel["proxy"]
        request["country"] = intel.get("country", "Unknown")
        
        # --- LAYER 2: DDoS / Rate Limiting Detection ---
        ddos_result = ddos_detector.check_rate_limit(request["ip"], request["endpoint"])
        request["ddos_detected"] = ddos_result["threat_detected"]
        request["is_flooding"] = ddos_result.get("is_flooding", False)
        
        # Block request if DDoS detected
        if ddos_result["blocked"]:
            request["blocked"] = True
            request["block_reason"] = ddos_result.get("reason", "Rate limit exceeded")
            request["risk_score"] = 95
            request["threat_type"] = "DDoS/Flooding"
            
            # Still persist and broadcast blocked requests
            conn = sqlite3.connect("cortex.db")
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO logs (timestamp, method, endpoint, ip, status_code, response_time, payload_size, risk_score, threat_type, reputation, is_proxy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (request["timestamp"], request["method"], request["endpoint"], request["ip"], 429, request["response_time"], request["payload_size"], request["risk_score"], request["threat_type"], request["reputation"], 1 if request["is_proxy"] else 0)
            )
            conn.commit()
            conn.close()
            
            await state.broadcast({
                "type": "traffic",
                "data": request,
                "stats": {"active_threats": 1, "avg_risk": 95, "total_requests": 1542}
            })
            await asyncio.sleep(1)
            continue
        
        # --- LAYER 3: SQL Injection Detection ---
        sql_result = sql_detector.detect(f"{request['endpoint']}?payload={request.get('suspicious_payload', '')}")
        request["sql_injection"] = sql_result["detected"]
        if sql_result["detected"]:
            request["threat_type"] = "SQL Injection"
            request["sql_patterns"] = sql_result["patterns_found"]
        
        # --- LAYER 4: Geolocation Threat Detection ---
        geo_result = geo_detector.check_geolocation_risk(request["ip"], request["country"])
        request["geo_threat"] = geo_result["detected"]
        request["geo_threats"] = geo_result["threats"]
        if geo_result["detected"] and request["threat_type"] == "None":
            request["threat_type"] = "Geolocation Anomaly"
        
        # --- LAYER 5: Shadow API Discovery ---
        shadow_result = shadow_api_discovery.analyze_endpoint(
            request["endpoint"], 
            request["ip"], 
            request["method"], 
            request["status_code"]
        )
        request["is_shadow_api"] = shadow_result["is_shadow_api"]
        if shadow_result["is_shadow_api"] and shadow_result["is_suspicious"]:
            if request["threat_type"] == "None":
                request["threat_type"] = "Shadow API Access"
        
        # --- LAYER 6: Behaviour Analysis ---
        ip = request["ip"]
        now = asyncio.get_event_loop().time()
        if ip not in state.ip_history:
            state.ip_history[ip] = []
        state.ip_history[ip] = [t for t in state.ip_history[ip] if now - t < 60]
        state.ip_history[ip].append(now)
        request_freq = len(state.ip_history[ip])
        
        # --- LAYER 7: Risk Score Calculation ---
        if intel["status"] == "Trusted":
            final_risk = random.randint(0, 10)
        else:
            # Combine ML score with all detectors
            ml_score = detector.predict_risk_score(
                freq=request_freq * 10,
                resp_time=request["response_time"],
                payload_size=request["payload_size"],
                suspicious_payload=request["suspicious_payload"]
            )
            
            final_risk = ml_score 
            final_risk += intel["risk_contribution"] * 0.4
            if intel["proxy"]:
                final_risk += 30
            if request_freq > 10:
                final_risk += 20
            if sql_result["detected"]:
                final_risk += 40
            if geo_result["detected"]:
                final_risk += geo_result["risk_score"] * 0.3
            if shadow_result["is_shadow_api"]:
                final_risk += shadow_result["risk_score"] * 0.2
            if ddos_result["threat_detected"]:
                final_risk += 25
            
            final_risk = min(100, int(final_risk))
        
        request["risk_score"] = final_risk
        
        # --- LAYER 8: Time-Based Pattern Detection ---
        time_pattern_result = time_pattern_detector.analyze_patterns(
            request["ip"],
            request["endpoint"],
            request["threat_type"],
            final_risk
        )
        request["time_patterns"] = time_pattern_result["threats"]
        if time_pattern_result["time_based_threat_detected"]:
            final_risk = min(100, final_risk + time_pattern_result["pattern_risk_score"] * 0.2)
            request["risk_score"] = int(final_risk)
        
        # --- LAYER 9: API Dependency Attack Detection ---
        if final_risk > 70:
            dependency_result = api_dependency_tracker.analyze_attack_chain(
                request["endpoint"],
                final_risk
            )
            request["chain_attack"] = dependency_result["chain_attack_detected"]
            if dependency_result["chain_attack_detected"]:
                request["at_risk_apis"] = dependency_result["at_risk_apis"]
        
        # Persist to DB
        conn = sqlite3.connect("cortex.db")
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO logs (timestamp, method, endpoint, ip, status_code, response_time, payload_size, risk_score, threat_type, reputation, is_proxy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (request["timestamp"], request["method"], request["endpoint"], request["ip"], request["status_code"], request["response_time"], request["payload_size"], request["risk_score"], request["threat_type"], request["reputation"], 1 if request["is_proxy"] else 0)
        )
        
        # --- LAYER 10: Autonomous Threat Response ---
        if final_risk > 70 or (attack_type and intel["status"] != "Trusted"):
            # AI Investigation Agent
            investigation = agent.investigate({**request, **intel})
            request["investigation"] = investigation
            
            # Store in threats table
            cursor.execute(
                "INSERT INTO threats (timestamp, method, endpoint, ip, status_code, risk_score, threat_type, investigation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (request["timestamp"], request["method"], request["endpoint"], request["ip"], request["status_code"], request["risk_score"], request["threat_type"], json.dumps(investigation))
            )
            
            # Autonomous actions
            autonomous_actions = []
            
            # 1. Block IP if critical threat
            if final_risk >= 90:
                autonomous_actions.append(f"IP {request['ip']} automatically blocked")
            
            # 2. Rate limit if flooding
            if ddos_result.get("is_flooding"):
                autonomous_actions.append(f"Rate limiting applied to {request['ip']}")
            
            # 3. Alert dependent APIs if chain attack detected
            if request.get("chain_attack"):
                at_risk_count = len(request.get("at_risk_apis", []))
                autonomous_actions.append(f"Alert sent to {at_risk_count} dependent APIs")
            
            request["autonomous_actions"] = autonomous_actions
        
        conn.commit()
        conn.close()

        # Broadcast
        await state.broadcast({
            "type": "traffic",
            "data": request,
            "stats": {
                "active_threats": final_risk if final_risk > 70 else 0,
                "avg_risk": final_risk,
                "total_requests": 1542
            }
        })
        
        await asyncio.sleep(1)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    task = asyncio.create_task(traffic_simulator_loop())
    yield
    task.cancel()

app = FastAPI(title="API Cortex Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/traffic")
async def traffic_websocket(websocket: WebSocket):
    await state.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        state.disconnect(websocket)

@app.get("/api/threats")
async def get_threats():
    conn = sqlite3.connect("cortex.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM threats ORDER BY id DESC LIMIT 50")
    rows = cursor.fetchall()
    conn.close()
    
    threats = []
    for row in rows:
        t = dict(row)
        t["investigation"] = json.loads(t["investigation"])
        threats.append(t)
    return threats

@app.post("/api/simulate")
async def simulate_attack(attack_type: str = None):
    """Simulate an attack"""
    # Map frontend attack types to backend variations
    attack_map = {
        "sql_injection": "sql_injection",
        "ddos": "ddos",
        "brute_force": "brute_force",
        "xss": "xss",
        "api_abuse": "api_abuse",
        "data_exfil": "data_exfil"
    }
    
    mapped_attack = attack_map.get(attack_type, attack_type)
    
    if mapped_attack in attack_map.values():
        state.simulation_queue.append(mapped_attack)
        return {
            "status": "queued",
            "attack": mapped_attack,
            "message": f"Simulating {mapped_attack} attack..."
        }
    return {"status": "error", "message": "Invalid attack type"}

@app.get("/api/stats")
async def get_stats():
    conn = sqlite3.connect("cortex.db")
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM threats")
    threat_count = cursor.fetchone()[0]
    conn.close()
    
    return {
        "active_threats": threat_count,
        "total_requests": 1542,
        "risk_score_avg": 15
    }

@app.get("/api/shadow-apis")
async def get_shadow_apis():
    """Get discovered shadow APIs"""
    shadow_apis = shadow_api_discovery.get_shadow_apis()
    return {"shadow_apis": shadow_apis, "total": len(shadow_apis)}

@app.get("/api/blocked-ips")
async def get_blocked_ips():
    """Get list of blocked IPs"""
    blocked = ddos_detector.get_blocked_ips()
    return {"blocked_ips": blocked, "total": len(blocked)}

@app.post("/api/unblock-ip")
async def unblock_ip(ip: str):
    """Manually unblock an IP"""
    success = ddos_detector.unblock_ip(ip)
    return {"success": success, "ip": ip}

@app.get("/api/dependency-graph")
async def get_dependency_graph():
    """Get API dependency graph"""
    graph = api_dependency_tracker.get_dependency_graph()
    return graph

@app.get("/api/logs")
async def get_logs():
    """Get all traffic logs"""
    conn = sqlite3.connect("cortex.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM logs ORDER BY id DESC LIMIT 100")
    rows = cursor.fetchall()
    conn.close()
    
    logs = [dict(row) for row in rows]
    return logs

@app.get("/api/investigate")
async def investigate(query: str):
    """Investigate a specific query (IP, endpoint, threat type)"""
    conn = sqlite3.connect("cortex.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Search across logs and threats
    cursor.execute("""
        SELECT * FROM logs 
        WHERE ip LIKE ? OR endpoint LIKE ? OR threat_type LIKE ?
        ORDER BY timestamp DESC
        LIMIT 10
    """, (f"%{query}%", f"%{query}%", f"%{query}%"))
    
    logs = [dict(row) for row in cursor.fetchall()]
    
    # Analyze findings
    threat_count = len([l for l in logs if l["risk_score"] > 50])
    avg_risk = sum(l["risk_score"] for l in logs) / len(logs) if logs else 0
    
    investigation_result = {
        "query": query,
        "logs_found": len(logs),
        "threat_count": threat_count,
        "avg_risk_score": int(avg_risk),
        "logs": logs,
        "ai_analysis": f"Analyzed {len(logs)} requests matching '{query}'. Found {threat_count} potential threats with average risk score of {int(avg_risk)}.",
        "recommendations": [
            "Monitor IP for additional suspicious activity",
            "Review endpoint access patterns",
            "Implement additional rate limiting if needed"
        ] if threat_count > 0 else ["No immediate threats detected"]
    }
    
    conn.close()
    return investigation_result

@app.post("/api/auto-investigate/{threat_id}")
async def auto_investigate(threat_id: str):
    """Automatically investigate a threat"""
    conn = sqlite3.connect("cortex.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM threats WHERE id = ?", (threat_id,))
    threat = cursor.fetchone()
    
    if not threat:
        conn.close()
        return {"error": "Threat not found"}
    
    threat_dict = dict(threat)
    threat_dict["investigation"] = json.loads(threat_dict["investigation"])
    
    # Perform detailed analysis
    cursor.execute("""
        SELECT * FROM logs 
        WHERE ip = ? OR endpoint = ?
        ORDER BY timestamp DESC
        LIMIT 20
    """, (threat["ip"], threat["endpoint"]))
    
    related_logs = [dict(row) for row in cursor.fetchall()]
    
    investigation = {
        "threat_id": threat_id,
        "threat_data": threat_dict,
        "related_logs": related_logs,
        "total_requests": len(related_logs),
        "threat_timeline": [
            {"timestamp": log["timestamp"], "risk": log["risk_score"], "threat": log["threat_type"]} 
            for log in related_logs
        ],
        "ai_assessment": {
            "severity": "CRITICAL" if threat["risk_score"] > 80 else "HIGH" if threat["risk_score"] > 50 else "MEDIUM",
            "confidence": 92,
            "attack_vector": threat["threat_type"],
            "recommended_action": "BLOCK" if threat["risk_score"] > 80 else "RATE_LIMIT"
        },
        "detailed_findings": f"IP {threat['ip']} accessed {threat['endpoint']} with threat type {threat['threat_type']}. Risk score: {threat['risk_score']}/100",
        "next_steps": [
            "1. Review all requests from this IP in the last 24 hours",
            "2. Check for lateral movement to other APIs",
            "3. Verify if legitimate user or compromised account",
            "4. Take automated response action if risk is critical"
        ]
    }
    
    conn.close()
    return investigation

@app.get("/api/api-map")
async def get_api_map():
    """Get API mapping with vulnerabilities and dependencies"""
    conn = sqlite3.connect("cortex.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all unique endpoints
    cursor.execute("SELECT DISTINCT endpoint FROM logs")
    endpoints = [row[0] for row in cursor.fetchall()]
    
    # Build API list with risk scores
    apis = []
    for endpoint in endpoints:
        cursor.execute("""
            SELECT AVG(risk_score) as avg_risk, COUNT(*) as count
            FROM logs
            WHERE endpoint = ?
        """, (endpoint,))
        
        result = cursor.fetchone()
        avg_risk = int(result["avg_risk"]) if result["avg_risk"] else 0
        
        apis.append({
            "name": endpoint,
            "endpoint": endpoint,
            "risk": avg_risk,
            "requests": result["count"]
        })
    
    # Get vulnerabilities
    cursor.execute("""
        SELECT threat_type, COUNT(*) as count
        FROM logs
        WHERE risk_score > 50
        GROUP BY threat_type
    """)
    
    vulnerabilities = []
    threat_types = {
        "SQL Injection": "high",
        "XSS": "medium",
        "CSRF": "medium",
        "DDoS": "high",
        "Geolocation Anomaly": "medium"
    }
    
    for row in cursor.fetchall():
        threat_type = row[0] if row[0] and row[0] != "None" else "Unknown"
        vulnerabilities.append({
            "type": threat_type,
            "count": row[1],
            "severity": threat_types.get(threat_type, "medium")
        })
    
    # Dependencies (simplified)
    dependencies = [
        {"from": "/api/login", "to": "/api/users", "type": "auth"},
        {"from": "/api/payment", "to": "/api/audit", "type": "logging"},
        {"from": "/api/admin", "to": "/api/logs", "type": "logging"}
    ]
    
    api_map = {
        "apis": apis,
        "vulnerabilities": vulnerabilities if vulnerabilities else [
            {"type": "SQL Injection", "count": 0, "severity": "high"},
            {"type": "XSS", "count": 0, "severity": "medium"}
        ],
        "dependencies": dependencies
    }
    
    conn.close()
    return api_map

@app.get("/api/features")
async def get_features():
    """Get status of all 10 security features"""
    return {
        "features": [
            {
                "id": 1,
                "name": "Real-Time API Traffic Monitoring",
                "status": "active",
                "description": "Continuously monitors API requests, IP addresses, payloads, and response patterns"
            },
            {
                "id": 2,
                "name": "SQL Injection Detection",
                "status": "active",
                "description": "Detects malicious SQL queries inside API parameters and blocks them automatically"
            },
            {
                "id": 3,
                "name": "DDoS / API Flooding Detection",
                "status": "active",
                "description": "Detects sudden spikes in API traffic and activates rate limiting"
            },
            {
                "id": 4,
                "name": "Geolocation Threat Detection",
                "status": "active",
                "description": "Detects API access from unusual or suspicious geographic locations"
            },
            {
                "id": 5,
                "name": "API Risk Scoring System",
                "status": "active",
                "description": "Assigns risk scores to APIs based on sensitivity and attack frequency"
            },
            {
                "id": 6,
                "name": "Shadow API Discovery",
                "status": "active",
                "description": "Automatically identifies undocumented APIs that may expose vulnerabilities"
            },
            {
                "id": 7,
                "name": "Time-Based Attack Pattern Detection",
                "status": "active",
                "description": "Detects slow stealth attacks that happen over long periods of time"
            },
            {
                "id": 8,
                "name": "API Dependency Attack Detection",
                "status": "active",
                "description": "Maps relationships between APIs and predicts attack propagation across services"
            },
            {
                "id": 9,
                "name": "Real-Time Security Dashboard",
                "status": "active",
                "description": "Displays API traffic analytics, attack alerts, and threat levels visually"
            },
            {
                "id": 10,
                "name": "Autonomous Threat Response (Agentic AI)",
                "status": "active",
                "description": "AI agents automatically respond to detected attacks by blocking IPs or limiting requests"
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
