import random
import time
from datetime import datetime

class TrafficGenerator:
    def __init__(self):
        self.endpoints = [
            "/api/v1/users",
            "/api/v1/login",
            "/api/v1/products",
            "/api/v1/payment",
            "/api/v1/settings",
            "/api/v1/data/export"
        ]
        self.methods = ["GET", "POST", "PUT", "DELETE"]
        self.ips = [f"192.168.1.{i}" for i in range(1, 100)]
        self.suspicious_ips = ["45.76.12.34", "103.21.244.1", "185.123.45.6"]
        self.trusted_ips = ["8.8.8.8", "34.1.2.3", "52.4.5.6", "104.16.0.1", "140.82.112.5"]

    def generate_request(self, attack_type=None):
        timestamp = datetime.now().isoformat()
        method = random.choice(self.methods)
        endpoint = random.choice(self.endpoints)
        status_code = random.choice([200, 201, 401, 403, 404, 500])
        
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

        if attack_type == "sqli":
            method = "POST"
            endpoint = random.choice(["/api/v1/login", "/api/v1/users?id=1 OR 1=1"])
            ip = random.choice(self.suspicious_ips)
            payload_size = random.uniform(2000, 5000)
            suspicious_payload = "' OR '1'='1' -- "
            threat_type = "SQL Injection"
            status_code = 500
        elif attack_type == "brute_force":
            method = "POST"
            endpoint = "/api/v1/login"
            ip = random.choice(self.suspicious_ips)
            status_code = 401
            threat_type = "Brute Force"
            suspicious_payload = True
        elif attack_type == "data_leak":
            endpoint = "/api/v1/users"
            threat_type = "Data Leakage"
            suspicious_payload = True
            status_code = 200

        return {
            "timestamp": timestamp,
            "method": method,
            "endpoint": endpoint,
            "ip": ip,
            "status_code": status_code,
            "response_time": response_time,
            "payload_size": payload_size,
            "suspicious_payload": suspicious_payload,
            "threat_type": threat_type
        }
