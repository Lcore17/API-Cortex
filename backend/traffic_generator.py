import random
import time
from datetime import datetime

class TrafficGenerator:
    def __init__(self):
        self.demo_endpoints = [
            "/api/login",
            "/api/user",
            "/api/products",
            "/api/payment",
            "/api/orders",
        ]
        self.endpoints = self.demo_endpoints + [
            "/api/v1/users",
            "/api/v1/login",
            "/api/v1/products",
            "/api/v1/payment",
            "/api/v1/settings",
            "/api/v1/data/export"
        ]
        self.methods = ["GET", "POST"]
        self.ips = [f"192.168.1.{i}" for i in range(1, 100)]
        self.suspicious_ips = ["45.76.12.34", "103.21.244.1", "185.123.45.6"]
        self.trusted_ips = ["8.8.8.8", "34.1.2.3", "52.4.5.6", "104.16.0.1", "140.82.112.5"]
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Mozilla/5.0 (X11; Linux x86_64)",
            "PostmanRuntime/7.43.2",
            "python-httpx/0.28",
        ]

    def generate_request(self, attack_type=None):
        timestamp = datetime.now().isoformat()
        method = random.choice(self.methods)
        endpoint = random.choice(self.demo_endpoints) if random.random() > 0.3 else random.choice(self.endpoints)
        status_code = 200
        
        # Mix in trusted, suspicious and normal IPs
        r = random.random()
        if r < 0.2:
            ip = random.choice(self.trusted_ips)
        elif r < 0.3:
            ip = random.choice(self.suspicious_ips)
        else:
            ip = random.choice(self.ips)
            
        response_time = random.uniform(20, 500)
        payload_size = random.uniform(100, 2000)
        suspicious_payload = False
        threat_type = "None"
        user_agent = random.choice(self.user_agents)
        params = {}
        payload = {}

        # Normal requests
        if not attack_type or attack_type == "normal":
            if endpoint == "/api/login":
                method = "POST"
                payload = {"username": "demo_user", "password": "safe_password"}
            elif endpoint == "/api/user":
                params = {"user_id": str(random.randint(1000, 1020))}
            elif endpoint == "/api/products":
                params = {"q": random.choice(["gateway", "monitor", "secure"])}
            elif endpoint == "/api/payment":
                method = "POST"
                payload = {"amount": random.randint(10, 500), "currency": "USD"}
            elif endpoint == "/api/orders":
                params = {"user_id": str(random.randint(1000, 1020))}
            return {
                "timestamp": timestamp,
                "method": method,
                "endpoint": endpoint,
                "ip": ip,
                "params": params,
                "payload": payload,
                "status_code": status_code,
                "response_time": response_time,
                "payload_size": payload_size,
                "user_agent": user_agent,
                "suspicious_payload": suspicious_payload,
                "threat_type": threat_type
            }

        # Attack simulations
        if attack_type == "sql_injection":
            method = "GET"
            endpoint = "/api/user"
            params = {"user_id": "1 OR 1=1 UNION SELECT * FROM users --"}
            ip = random.choice(self.suspicious_ips)
            payload_size = random.uniform(2000, 5000)
            suspicious_payload = True
            threat_type = "SQL Injection"
            status_code = 400
        elif attack_type == "ddos":
            endpoint = random.choice(["/api/products", "/api/orders"])
            ip = random.choice(self.suspicious_ips)
            response_time = random.uniform(5, 50)
            threat_type = "DDoS"
        elif attack_type == "brute_force":
            method = "POST"
            endpoint = "/api/login"
            payload = {"username": "admin", "password": random.choice(["admin123", "password", "letmein", "123456"])}
            ip = random.choice(self.suspicious_ips)
            status_code = 401
            threat_type = "Brute Force"
        elif attack_type == "shadow_api":
            endpoint = "/api/debug"
            ip = random.choice(self.suspicious_ips)
            threat_type = "Shadow API"
        elif attack_type == "data_exfil":
            endpoint = "/api/user"
            params = {"user_id": "1001; SELECT email,token FROM users WHERE 1=1"}
            ip = random.choice(self.suspicious_ips)
            threat_type = "Data Exfiltration"

        return {
            "timestamp": timestamp,
            "method": method,
            "endpoint": endpoint,
            "ip": ip,
            "params": params,
            "payload": payload,
            "status_code": status_code,
            "response_time": response_time,
            "payload_size": payload_size,
            "user_agent": user_agent,
            "suspicious_payload": suspicious_payload,
            "threat_type": threat_type
        }
