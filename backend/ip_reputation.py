import ipaddress
import random

class IPReputation:
    def __init__(self):
        # Table 1 - Trusted Infrastructure
        self.trusted_ranges = [
            "8.8.8.0/24", "8.34.208.0/20", "8.35.192.0/20", "34.0.0.0/8", 
            "35.184.0.0/13", "64.233.160.0/19", "66.102.0.0/20", "72.14.192.0/18", 
            "74.125.0.0/16", "108.177.8.0/21", "142.250.0.0/15", "172.217.0.0/16", 
            "209.85.128.0/17", "216.58.192.0/19", # Google
            "3.0.0.0/8", "13.32.0.0/15", "15.230.0.0/16", "18.0.0.0/8", 
            "52.0.0.0/11", "54.0.0.0/12", "99.77.128.0/18", "130.176.0.0/16", 
            "204.246.168.0/22", # AWS
            "13.64.0.0/11", "20.33.0.0/16", "20.36.0.0/14", "20.40.0.0/13", 
            "40.64.0.0/10", "52.96.0.0/12", "104.40.0.0/13", "137.116.0.0/14", # Azure
            "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "104.16.0.0/13", 
            "104.24.0.0/14", "108.162.192.0/18", "131.0.72.0/22", "141.101.64.0/18", 
            "162.158.0.0/15", "172.64.0.0/13", "173.245.48.0/20", "188.114.96.0/20", 
            "190.93.240.0/20", "197.234.240.0/22", "198.41.128.0/17", # Cloudflare
            "140.82.112.0/20", "192.30.252.0/22", "185.199.108.0/22" # GitHub
        ]
        self.compiled_ranges = [ipaddress.ip_network(r) for r in self.trusted_ranges]
        
        # Threat Intelligence Database (Table 2 & 3 combined)
        # ip: {risk_score, proxy_flag, abuse_reports, country}
        self.threat_intel_db = {
            "45.76.12.34": {"risk_score": 85, "proxy_flag": True, "abuse_reports": 124, "country": "RU"},
            "103.21.244.1": {"risk_score": 90, "proxy_flag": False, "abuse_reports": 56, "country": "CN"},
            "185.123.45.6": {"risk_score": 75, "proxy_flag": True, "abuse_reports": 89, "country": "NL"},
            "192.168.1.45": {"risk_score": 95, "proxy_flag": True, "abuse_reports": 312, "country": "US"}
        }
        
        self.vpn_ips = ["1.1.1.2", "8.8.8.9", "10.0.0.1"] # Mock TOR/VPN

    def check_reputation(self, ip_str):
        try:
            ip_obj = ipaddress.ip_address(ip_str)
            
            # Check Trusted Infrastructure (Layer 1)
            for network in self.compiled_ranges:
                if ip_obj in network:
                    return {
                        "status": "Trusted",
                        "risk_contribution": 0,
                        "proxy": False,
                        "abuse_reports": 0,
                        "country": "Cloud"
                    }
            
            # Check Threat Intel DB (Layer 1)
            if ip_str in self.threat_intel_db:
                intel = self.threat_intel_db[ip_str]
                return {
                    "status": "Malicious",
                    "risk_contribution": intel["risk_score"],
                    "proxy": intel["proxy_flag"],
                    "abuse_reports": intel["abuse_reports"],
                    "country": intel["country"]
                }
            
            # Check for generic Proxy/VPN/TOR (Layer 1)
            is_proxy = ip_str in self.vpn_ips or random.random() < 0.05
            return {
                "status": "Unknown",
                "risk_contribution": 40 if is_proxy else 10,
                "proxy": is_proxy,
                "abuse_reports": 0,
                "country": random.choice(["US", "UK", "DE", "SG", "IN"])
            }
        except Exception:
            return {
                "status": "Invalid",
                "risk_contribution": 100,
                "proxy": False,
                "abuse_reports": 0,
                "country": "??"
            }

reputation_engine = IPReputation()
