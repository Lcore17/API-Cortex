import time
from typing import Dict, Set, List
from collections import defaultdict

class ShadowAPIDiscovery:
    """Discovers undocumented/shadow APIs"""
    
    def __init__(self):
        # Documented APIs (officially known endpoints)
        self.documented_apis: Set[str] = {
            "/api/v1/users",
            "/api/v1/login",
            "/api/v1/products",
            "/api/v1/payment",
            "/api/v1/settings",
            "/api/v1/data/export"
        }
        
        # Discovered endpoints: {endpoint: {first_seen, hit_count, ips: set(), risk_score}}
        self.discovered_endpoints: Dict[str, dict] = {}
        
        # Suspicious patterns
        self.suspicious_patterns = [
            "/debug", "/test", "/admin", "/internal", "/backup",
            "/api/v0/", "/dev/", "/.git", "/.env", "/config"
        ]
    
    def analyze_endpoint(self, endpoint: str, ip: str, method: str, status_code: int) -> dict:
        """Check if endpoint is a shadow API"""
        timestamp = time.time()
        
        # Check if documented
        is_documented = endpoint in self.documented_apis
        
        # Check for suspicious patterns
        is_suspicious = any(pattern in endpoint.lower() for pattern in self.suspicious_patterns)
        
        # Track discovered endpoint
        if not is_documented:
            if endpoint not in self.discovered_endpoints:
                self.discovered_endpoints[endpoint] = {
                    "first_seen": timestamp,
                    "hit_count": 0,
                    "ips": set(),
                    "methods": set(),
                    "status_codes": [],
                }
            
            entry = self.discovered_endpoints[endpoint]
            entry["hit_count"] += 1
            entry["ips"].add(ip)
            entry["methods"].add(method)
            entry["status_codes"].append(status_code)
            entry["last_seen"] = timestamp
            
            # Calculate risk score for shadow API
            risk_score = 0
            
            # Pattern-based risk
            if is_suspicious:
                risk_score += 60
            
            # Low hit count might indicate probing
            if entry["hit_count"] < 5:
                risk_score += 20
            
            # Multiple IPs accessing unknown endpoint
            if len(entry["ips"]) > 3:
                risk_score += 15
            
            # Error codes might indicate exploitation attempts
            error_codes = [c for c in entry["status_codes"][-10:] if c >= 400]
            if len(error_codes) > 5:
                risk_score += 5
            
            entry["risk_score"] = min(100, risk_score)
            
            return {
                "is_shadow_api": True,
                "is_documented": False,
                "is_suspicious": is_suspicious,
                "risk_score": entry["risk_score"],
                "hit_count": entry["hit_count"],
                "unique_ips": len(entry["ips"]),
                "threat_level": "critical" if risk_score >= 80 else "high" if risk_score >= 60 else "medium"
            }
        
        return {
            "is_shadow_api": False,
            "is_documented": True,
            "is_suspicious": False,
            "risk_score": 0,
            "threat_level": "none"
        }
    
    def get_shadow_apis(self) -> List[dict]:
        """Get all discovered shadow APIs"""
        return [
            {
                "endpoint": endpoint,
                "ips_list": list(data["ips"])[:10],  # Convert set to list for serialization
                "methods_list": list(data["methods"]),
                **{k: v for k, v in data.items() if k != "ips" and k != "methods"}
            }
            for endpoint, data in self.discovered_endpoints.items()
            if data.get("risk_score", 0) > 50
        ]
    
    def register_documented_api(self, endpoint: str):
        """Add an endpoint to documented APIs"""
        self.documented_apis.add(endpoint)

shadow_api_discovery = ShadowAPIDiscovery()
