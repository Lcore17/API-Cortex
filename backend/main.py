import asyncio
import json
import random
import sqlite3
import httpx
from typing import List, Optional
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
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
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            attack_type TEXT,
            target_api TEXT,
            source_ip TEXT,
            detection_model TEXT,
            action_taken TEXT,
            recommended_prevention TEXT
        )
    """)
    
    # Migrate existing tables to add missing columns
    try:
        cursor.execute("PRAGMA table_info(logs)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'reputation' not in columns:
            cursor.execute("ALTER TABLE logs ADD COLUMN reputation TEXT DEFAULT 'Unknown'")
        if 'is_proxy' not in columns:
            cursor.execute("ALTER TABLE logs ADD COLUMN is_proxy INTEGER DEFAULT 0")
        
        cursor.execute("PRAGMA table_info(threats)")
        threat_columns = [row[1] for row in cursor.fetchall()]
        if 'status' not in threat_columns:
            cursor.execute("ALTER TABLE threats ADD COLUMN status TEXT DEFAULT 'in_progress'")
    except Exception as e:
        print(f"Migration info: {e}")
    
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
        # Traffic generation control
        self.auto_generate_enabled = False  # Default: OFF
        self.auto_generate_count = 5  # Default: generate 5 requests
        self.auto_generate_remaining = 5  # Remaining count
        self.traffic_paused = False

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
    """Make actual HTTP requests to demo APIs with automatic monitoring"""
    await asyncio.sleep(2)  # Wait for app to fully start
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        while True:
            try:
                # Check if traffic generation is paused
                if state.traffic_paused:
                    await asyncio.sleep(1)
                    continue
                
                # Check if we should generate automatic traffic
                should_generate = False
                
                # Priority 1: Process simulation queue (from attack simulator)
                if state.simulation_queue:
                    should_generate = True
                # Priority 2: Auto-generate if enabled and count remaining
                elif state.auto_generate_enabled and state.auto_generate_remaining > 0:
                    should_generate = True
                    state.auto_generate_remaining -= 1
                    if state.auto_generate_remaining == 0:
                        print(f"Auto-generation completed ({state.auto_generate_count} requests). Pausing...")
                        state.traffic_paused = True
                # Priority 3: Do nothing if auto-generate is disabled
                else:
                    await asyncio.sleep(1)
                    continue
                
                if should_generate:
                    attack_type = None
                    if state.simulation_queue:
                        attack_type = state.simulation_queue.pop(0)
                    
                    request = generator.generate_request(attack_type=attack_type)
                    
                    # Build URL with params
                    url = f"http://127.0.0.1:8000{request['endpoint']}"
                    if request.get('params'):
                        param_str = "&".join([f"{k}={v}" for k, v in request['params'].items()])
                        url = f"{url}?{param_str}"
                    
                    # Prepare headers with IP spoofing via X-Forwarded-For
                    headers = {
                        "User-Agent": request['user_agent'],
                        "X-Forwarded-For": request['ip']
                    }
                    
                    # Make the HTTP request
                    try:
                        if request['method'] == 'POST':
                            resp = await client.post(url, json=request.get('payload', {}), headers=headers)
                        else:
                            resp = await client.get(url, headers=headers)
                        status_code = resp.status_code
                    except Exception as e:
                        status_code = 500
                    
                    # Sleep briefly between requests (faster for attacks)
                    sleep_time = 0.1 if attack_type and attack_type != "normal" else 1.0
                    await asyncio.sleep(sleep_time)
                
            except Exception as e:
                print(f"Traffic simulator error: {e}")
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

class MonitoringMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        import time
        start_time = time.time()
        
        # Extract request info
        client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "127.0.0.1")
        method = request.method
        endpoint = request.url.path
        
        # Get response
        response = await call_next(request)
        response_time = time.time() - start_time
        
        # Only monitor API endpoints, not WebSocket or frontend
        if endpoint.startswith("/api/"):
            # Basic request logging
            try:
                # Determine payload size
                payload_size = 0
                if request.method in ["POST", "PUT", "PATCH"]:
                    try:
                        body = await request.body()
                        payload_size = len(body)
                    except:
                        pass
                
                # --- LAYER 1: IP Intelligence ---
                intel = reputation_engine.check_reputation(client_ip)
                
                # --- LAYER 2: DDoS / Rate Limiting Detection ---
                ddos_result = ddos_detector.check_rate_limit(client_ip, endpoint)
                
                # --- LAYER 3: SQL Injection Detection ---
                url_str = str(request.url)
                sql_result = sql_detector.detect(url_str)
                
                # --- LAYER 4: Geolocation Threat Detection ---
                geo_result = geo_detector.check_geolocation_risk(client_ip, intel.get("country", "Unknown"))
                
                # --- LAYER 5: Shadow API Discovery ---
                shadow_result = shadow_api_discovery.analyze_endpoint(endpoint, client_ip, method, response.status_code)
                
                # --- LAYER 6: Behaviour Analysis ---
                now = time.time()
                if client_ip not in state.ip_history:
                    state.ip_history[client_ip] = []
                state.ip_history[client_ip] = [t for t in state.ip_history[client_ip] if now - t < 60]
                state.ip_history[client_ip].append(now)
                request_freq = len(state.ip_history[client_ip])
                
                # --- LAYER 7: Risk Score Calculation ---
                threat_type = "None"
                final_risk = 10  # Default low risk
                
                if intel["status"] != "Trusted":
                    final_risk = 25
                    if intel["proxy"]:
                        final_risk += 15
                
                if sql_result["detected"]:
                    final_risk += 40
                    threat_type = "SQL Injection"
                
                if ddos_result["threat_detected"]:
                    final_risk += 25
                    if threat_type == "None":
                        threat_type = "DDoS/Flooding"
                
                if geo_result["detected"]:
                    final_risk += 15
                    if threat_type == "None":
                        threat_type = "Geolocation Anomaly"
                
                if shadow_result["is_shadow_api"]:
                    final_risk += 10
                    if threat_type == "None":
                        threat_type = "Shadow API Access"
                
                final_risk = min(100, final_risk)
                
                # --- LAYER 8: Time-Based Pattern Detection ---
                time_pattern_result = time_pattern_detector.analyze_patterns(client_ip, endpoint, threat_type, final_risk)
                if time_pattern_result["time_based_threat_detected"]:
                    final_risk = min(100, final_risk + 5)
                
                # --- LAYER 9: API Dependency Attack Detection ---
                chain_attack = False
                at_risk_apis = []
                if final_risk > 70:
                    dependency_result = api_dependency_tracker.analyze_attack_chain(endpoint, final_risk)
                    chain_attack = dependency_result["chain_attack_detected"]
                    at_risk_apis = dependency_result.get("at_risk_apis", [])
                
                # Store in database
                conn = sqlite3.connect("cortex.db")
                cursor = conn.cursor()
                timestamp = datetime.now().isoformat()
                
                cursor.execute(
                    "INSERT INTO logs (timestamp, method, endpoint, ip, status_code, response_time, payload_size, risk_score, threat_type, reputation, is_proxy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (timestamp, method, endpoint, client_ip, response.status_code, response_time, payload_size, final_risk, threat_type, intel["status"], 1 if intel["proxy"] else 0)
                )
                
                # --- LAYER 10: Autonomous Threat Response ---
                if final_risk > 70:
                    investigation = agent.investigate({
                        "ip": client_ip,
                        "endpoint": endpoint,
                        "method": method,
                        "threat_type": threat_type,
                        "risk_score": final_risk,
                        "payload_size": payload_size,
                        **intel
                    })
                    
                    cursor.execute(
                        "INSERT INTO threats (timestamp, method, endpoint, ip, status_code, risk_score, threat_type, investigation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        (timestamp, method, endpoint, client_ip, response.status_code, final_risk, threat_type, json.dumps(investigation))
                    )
                    
                    # Generate report
                    autonomous_actions = []
                    if final_risk >= 90:
                        autonomous_actions.append(f"Block IP {client_ip}")
                    if ddos_result.get("is_flooding"):
                        autonomous_actions.append(f"Rate limit {client_ip}")
                    if chain_attack:
                        autonomous_actions.append(f"Alert {len(at_risk_apis)} dependent APIs")
                    
                    action_str = ", ".join(autonomous_actions) if autonomous_actions else "Alert"
                    
                    cursor.execute(
                        "INSERT INTO reports (timestamp, attack_type, target_api, source_ip, detection_model, action_taken, recommended_prevention) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (timestamp, threat_type, endpoint, client_ip, "Multi-Layer Detection", action_str, "Enable input validation | Implement WAF rules | Monitor IP patterns")
                    )
                
                conn.commit()
                conn.close()
                
                # Broadcast ALL traffic to WebSocket clients for real-time monitoring
                traffic_data = {
                    "timestamp": timestamp,
                    "ip": client_ip,
                    "endpoint": endpoint,
                    "method": method,
                    "status_code": response.status_code,
                    "response_time": response_time,
                    "risk_score": final_risk,
                    "threat_type": threat_type,
                    "reputation": intel["status"],
                    "country": intel.get("country", "Unknown")
                }
                
                # Broadcast as "traffic" for all requests
                await state.broadcast({
                    "type": "traffic",
                    "data": traffic_data
                })
                
                # Also broadcast as "threat" if high risk
                if final_risk > 70:
                    await state.broadcast({
                        "type": "threat",
                        "data": traffic_data
                    })
                
            except Exception as e:
                print(f"Monitoring error: {e}")
        
        return response

app.add_middleware(MonitoringMiddleware)

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
    
    # Get all threats including resolved ones (for dashboard stats)
    cursor.execute("SELECT * FROM threats ORDER BY id DESC LIMIT 100")
    threat_rows = cursor.fetchall()
    
    # Get medium/high-risk logs (30-100) that aren't already in threats
    cursor.execute("""
        SELECT * FROM logs 
        WHERE risk_score >= 30 AND threat_type != 'None'
        ORDER BY id DESC LIMIT 100
    """)
    log_rows = cursor.fetchall()
    conn.close()
    
    threats = []
    
    # Add threats from threats table (including resolved)
    for row in threat_rows:
        t = dict(row)
        if "investigation" in t and t["investigation"]:
            t["investigation"] = json.loads(t["investigation"])
        else:
            # Generate investigation dynamically if not stored
            t["investigation"] = agent.investigate(t)
        # Ensure status field exists
        if "status" not in t:
            t["status"] = "in_progress"
        threats.append(t)
    
    # Add high-risk logs to get all threat types
    for row in log_rows:
        t = dict(row)
        # Generate investigation for each log entry
        t["investigation"] = agent.investigate(t)
        # Logs don't have status, so default to in_progress
        if "status" not in t:
            t["status"] = "in_progress"
        threats.append(t)
    
    # Sort by timestamp/id descending and limit to 50
    threats = sorted(threats, key=lambda x: x.get('id', 0), reverse=True)[:50]
    return threats

@app.get("/api/threat-stats")
async def get_threat_stats():
    """Get threat statistics from database"""
    try:
        conn = sqlite3.connect("cortex.db")
        cursor = conn.cursor()
        
        # Count resolved threats
        cursor.execute("SELECT COUNT(*) FROM threats WHERE status = 'resolved'")
        resolved_count = cursor.fetchone()[0]
        
        # Count unresolved/in_progress threats
        cursor.execute("SELECT COUNT(*) FROM threats WHERE status != 'resolved'")
        active_count = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "resolved_threats": resolved_count,
            "active_threats": active_count,
            "total_threats": resolved_count + active_count
        }
    except Exception as e:
        print(f"Error getting threat stats: {e}")
        return {
            "resolved_threats": 0,
            "active_threats": 0,
            "total_threats": 0
        }

@app.post("/api/threats/{threat_id}/resolve")
async def resolve_threat(threat_id: int, request_body: dict = None):
    """Mark a threat as resolved"""
    try:
        conn = sqlite3.connect("cortex.db")
        cursor = conn.cursor()
        
        # Update threats table
        cursor.execute(
            "UPDATE threats SET status = 'resolved' WHERE id = ?",
            (threat_id,)
        )
        
        # Also update logs table if this threat exists there
        cursor.execute(
            "UPDATE logs SET threat_type = 'None' WHERE id = ?",
            (threat_id,)
        )
        
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "message": f"Threat {threat_id} marked as resolved",
            "threat_id": threat_id,
            "status": "resolved"
        }
    except Exception as e:
        print(f"Error resolving threat: {e}")
        return {
            "success": False,
            "message": str(e),
            "threat_id": threat_id
        }

@app.post("/api/simulate")
async def simulate_attack(
    attack_type: Optional[str] = Query(default=None),
    request_data: Optional[dict] = Body(default=None)
):
    """Simulate different attack types for demonstration"""
    payload = request_data or {}
    selected_attack_type = attack_type or payload.get("attack_type", "normal")
    try:
        requested_count = int(payload.get("count", 10))
    except (TypeError, ValueError):
        requested_count = 10
    count = max(1, min(requested_count, 100))
    
    # Map old names to new ones
    attack_map = {
        "sql_injection": "sql_injection",
        "sqli": "sql_injection",
        "ddos": "ddos",
        "brute_force": "brute_force",
        "xss": "shadow_api",
        "api_abuse": "ddos",
        "data_exfil": "data_exfil",
        "shadow_api": "shadow_api",
        "brute_force": "brute_force"
    }
    
    mapped_attack = attack_map.get(selected_attack_type, selected_attack_type)
    
    # Queue attack requests (bounded to max 100)
    for _ in range(count):
        state.simulation_queue.append(mapped_attack)
    
    return {
        "status": "queued",
        "attack": mapped_attack,
        "count": count,
        "message": f"Queued {count}x {mapped_attack} attacks for simulation...",
        "attack_type": selected_attack_type,
        "mapped_to": mapped_attack
    }

@app.get("/api/stats")
async def get_stats():
    conn = sqlite3.connect("cortex.db")
    cursor = conn.cursor()
    
    # Get threat count
    cursor.execute("SELECT COUNT(*) FROM threats")
    threat_count = cursor.fetchone()[0]
    
    # Get total requests
    cursor.execute("SELECT COUNT(*) FROM logs")
    total_requests = cursor.fetchone()[0]
    
    # Get average risk score
    cursor.execute("SELECT AVG(risk_score) FROM logs")
    risk_avg = cursor.fetchone()[0] or 0
    
    conn.close()
    
    return {
        "active_threats": threat_count,
        "total_requests": total_requests,
        "risk_score_avg": float(risk_avg)
    }

@app.get("/api/traffic-control/status")
async def get_traffic_control_status():
    """Get current traffic generation settings"""
    return {
        "auto_generate_enabled": state.auto_generate_enabled,
        "auto_generate_count": state.auto_generate_count,
        "auto_generate_remaining": state.auto_generate_remaining,
        "traffic_paused": state.traffic_paused,
        "simulation_queue_length": len(state.simulation_queue)
    }

@app.post("/api/traffic-control/start")
async def start_traffic_generation(count: int = 5):
    """Start auto-generating traffic with specified count"""
    state.auto_generate_enabled = True
    state.auto_generate_count = max(1, min(count, 1000))  # Limit between 1-1000
    state.auto_generate_remaining = state.auto_generate_count
    state.traffic_paused = False
    return {
        "status": "started",
        "count": state.auto_generate_count,
        "message": f"Auto-generating {state.auto_generate_count} traffic requests"
    }

@app.post("/api/traffic-control/stop")
async def stop_traffic_generation():
    """Stop/pause traffic generation"""
    state.traffic_paused = True
    state.auto_generate_enabled = False
    return {
        "status": "stopped",
        "message": "Traffic generation paused"
    }

@app.post("/api/traffic-control/resume")
async def resume_traffic_generation():
    """Resume traffic generation"""
    state.traffic_paused = False
    if state.auto_generate_remaining == 0:
        state.auto_generate_remaining = state.auto_generate_count
    return {
        "status": "resumed",
        "remaining": state.auto_generate_remaining,
        "message": "Traffic generation resumed"
    }

@app.post("/api/traffic-control/configure")
async def configure_traffic_generation(request_data: dict):
    """Configure traffic generation settings"""
    count = request_data.get("count", 5)
    auto_start = request_data.get("auto_start", False)
    
    state.auto_generate_count = max(1, min(count, 1000))
    state.auto_generate_remaining = state.auto_generate_count
    
    if auto_start:
        state.auto_generate_enabled = True
        state.traffic_paused = False
    
    return {
        "status": "configured",
        "count": state.auto_generate_count,
        "auto_start": auto_start,
        "message": f"Traffic generation configured for {state.auto_generate_count} requests"
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

@app.get("/api/traffic-summary")
async def get_traffic_summary():
    """Get traffic summary for dashboard"""
    conn = sqlite3.connect("cortex.db")
    cursor = conn.cursor()
    
    # Total requests by status
    cursor.execute("SELECT status_code, COUNT(*) FROM logs GROUP BY status_code")
    status_codes = {str(row[0]): row[1] for row in cursor.fetchall()}
    
    # High risk requests
    cursor.execute("SELECT COUNT(*) FROM logs WHERE risk_score > 70")
    high_risk_count = cursor.fetchone()[0]
    
    # Threat distribution
    cursor.execute("SELECT threat_type, COUNT(*) FROM logs WHERE threat_type != 'None' GROUP BY threat_type")
    threat_dist = {row[0]: row[1] for row in cursor.fetchall()}
    
    # Top IPs
    cursor.execute("SELECT ip, COUNT(*) as count FROM logs GROUP BY ip ORDER BY count DESC LIMIT 10")
    top_ips = [{'ip': row[0], 'count': row[1]} for row in cursor.fetchall()]
    
    # Top endpoints
    cursor.execute("SELECT endpoint, COUNT(*) as count FROM logs GROUP BY endpoint ORDER BY count DESC LIMIT 10")
    top_endpoints = [{'endpoint': row[0], 'count': row[1]} for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        "status_codes": status_codes,
        "high_risk_count": high_risk_count,
        "threat_distribution": threat_dist,
        "top_ips": top_ips,
        "top_endpoints": top_endpoints
    }

@app.get("/api/traffic-status")
async def get_traffic_status():
    """Get current traffic generation status"""
    return {
        "auto_generate_enabled": state.auto_generate_enabled,
        "auto_generate_count": state.auto_generate_count,
        "auto_generate_remaining": state.auto_generate_remaining,
        "traffic_paused": state.traffic_paused
    }

@app.post("/api/start-traffic")
async def start_traffic(count: int = 5):
    """Start auto traffic generation for N requests (default 5)"""
    state.auto_generate_enabled = True
    state.auto_generate_count = max(1, min(count, 100))  # Min 1, Max 100
    state.auto_generate_remaining = state.auto_generate_count
    state.traffic_paused = False
    
    return {
        "status": "started",
        "count": state.auto_generate_count,
        "message": f"Auto traffic generation started. Will generate {state.auto_generate_count} requests then stop."
    }

@app.post("/api/stop-traffic")
async def stop_traffic():
    """Stop auto traffic generation"""
    state.auto_generate_enabled = False
    state.traffic_paused = True
    state.auto_generate_remaining = 0
    
    return {
        "status": "stopped",
        "message": "Auto traffic generation stopped."
    }

@app.get("/api/threat-summary")
async def get_threat_summary():
    """Get threat summary for threat center"""
    conn = sqlite3.connect("cortex.db")
    cursor = conn.cursor()
    
    # Threat distribution from stored threats (high/critical)
    cursor.execute("SELECT threat_type, COUNT(*) FROM threats GROUP BY threat_type ORDER BY COUNT(*) DESC")
    threats_by_type = {row[0]: row[1] for row in cursor.fetchall()}
    
    # Risk score distribution
    cursor.execute("SELECT COUNT(*) FROM threats WHERE risk_score >= 90")
    critical_threats = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM threats WHERE risk_score BETWEEN 70 AND 89")
    high_threats = cursor.fetchone()[0]
    
    # Medium threats: count from logs table (30-70 range) since threats table only stores >70
    cursor.execute("SELECT COUNT(*) FROM logs WHERE risk_score >= 30 AND risk_score <= 70 AND threat_type != 'None'")
    medium_threats = cursor.fetchone()[0]
    
    # Top source IPs - combine threats and logs
    cursor.execute("""
        SELECT ip, COUNT(*) as count FROM (
            SELECT ip FROM threats
            UNION ALL
            SELECT ip FROM logs WHERE risk_score >= 30 AND threat_type != 'None'
        ) combined
        GROUP BY ip ORDER BY count DESC LIMIT 10
    """)
    top_ips = [{'ip': row[0], 'count': row[1]} for row in cursor.fetchall()]
    
    # Top attacked endpoints - combine threats and logs
    cursor.execute("""
        SELECT endpoint, COUNT(*) as count FROM (
            SELECT endpoint FROM threats
            UNION ALL
            SELECT endpoint FROM logs WHERE risk_score >= 30 AND threat_type != 'None'
        ) combined
        GROUP BY endpoint ORDER BY count DESC LIMIT 10
    """)
    top_endpoints = [{'endpoint': row[0], 'count': row[1]} for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        "threats_by_type": threats_by_type,
        "critical_threats": critical_threats,
        "high_threats": high_threats,
        "medium_threats": medium_threats,
        "top_ips": top_ips,
        "top_endpoints": top_endpoints
    }

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

# Demo Application Endpoints
@app.post("/api/login")
async def login(request_body: dict = None):
    """Login endpoint for demo"""
    return {
        "status": "success",
        "message": "API request processed",
        "user": "demo_user",
        "token": "demo-auth-token-abc123"
    }

@app.get("/api/user")
async def get_user(user_id: str = "1001"):
    """Get user endpoint for demo"""
    return {
        "status": "success",
        "message": "API request processed",
        "user": {
            "id": user_id,
            "name": "Alice Johnson",
            "email": "alice@example.com",
            "tier": "premium"
        }
    }

@app.post("/api/payment")
async def process_payment(request_body: dict = None):
    """Payment processing endpoint for demo"""
    return {
        "status": "success",
        "message": "API request processed",
        "payment_id": "pay-12345",
        "amount": request_body.get("amount", 0) if request_body else 0,
        "status_payment": "completed"
    }

@app.get("/api/products")
async def get_products(q: str = ""):
    """Product search endpoint for demo"""
    return {
        "status": "success",
        "message": "API request processed",
        "results": [
            {"sku": "P-100", "name": "Secure Gateway", "price": 299},
            {"sku": "P-101", "name": "Threat Monitor", "price": 499},
            {"sku": "P-102", "name": "Security Analyzer", "price": 399}
        ],
        "query": q
    }

@app.get("/api/orders")
async def get_orders(user_id: str = "1001"):
    """Get user orders endpoint for demo"""
    return {
        "status": "success",
        "message": "API request processed",
        "orders": [
            {"id": "O-9001", "status": "shipped", "amount": 299},
            {"id": "O-9002", "status": "processing", "amount": 499},
            {"id": "O-9003", "status": "delivered", "amount": 199}
        ],
        "user_id": user_id
    }

@app.get("/api/debug")
async def debug_endpoint():
    """Hidden/Shadow API endpoint for testing detection"""
    return {
        "status": "success",
        "message": "API request processed",
        "endpoint": "debug",
        "warning": "This is a hidden endpoint"
    }

@app.get("/api/logs")
async def get_logs(limit: int = 100):
    """Get all API logs"""
    conn = sqlite3.connect("cortex.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/api/reports")
async def get_reports(limit: int = 100, active_only: bool = False):
    """Get security incident reports. Set active_only=true to get only recent threats from last 10 minutes"""
    conn = sqlite3.connect("cortex.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if active_only:
        # Get reports from the last 10 minutes (active threats)
        cursor.execute("""
            SELECT * FROM reports 
            WHERE datetime(timestamp) > datetime('now', '-10 minutes')
            ORDER BY id DESC LIMIT ?
        """, (limit,))
    else:
        cursor.execute("SELECT * FROM reports ORDER BY id DESC LIMIT ?", (limit,))
    
    rows = cursor.fetchall()
    conn.close()
    
    reports = []
    for row in rows:
        reports.append({
            "id": row["id"],
            "timestamp": row["timestamp"],
            "attack_type": row["attack_type"],
            "target_api": row["target_api"],
            "source_ip": row["source_ip"],
            "detection_model": row["detection_model"],
            "action_taken": row["action_taken"],
            "recommended_prevention": row["recommended_prevention"]
        })
    return reports

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
