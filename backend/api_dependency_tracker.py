import time
from typing import Dict, List, Set
from collections import defaultdict

class APIDependencyTracker:
    """Maps API dependencies and predicts attack propagation"""
    
    def __init__(self):
        # API dependency graph: {api: [dependent_apis]}
        self.dependency_graph = {
            "/api/v1/login": ["/api/v1/users", "/api/v1/settings", "/api/v1/payment"],
            "/api/v1/users": ["/api/v1/settings", "/api/v1/data/export"],
            "/api/v1/payment": ["/api/v1/users", "/api/v1/products"],
            "/api/v1/products": [],
            "/api/v1/settings": [],
            "/api/v1/data/export": ["/api/v1/users"]
        }
        
        # Reverse dependencies (which APIs depend on this one)
        self.reverse_dependencies = self._build_reverse_dependencies()
        
        # API criticality scores (1-100)
        self.criticality_scores = {
            "/api/v1/login": 95,           # Auth - most critical
            "/api/v1/payment": 92,         # Payment - highly critical
            "/api/v1/users": 85,           # User data - critical
            "/api/v1/data/export": 80,     # Data export - high risk
            "/api/v1/products": 60,        # Products - moderate
            "/api/v1/settings": 50,        # Settings - moderate
        }
        
        # Track compromised APIs: {api: (timestamp, threat_type)}
        self.compromised_apis: Dict[str, tuple] = {}
        
        # Alert history to prevent spam
        self.propagation_alerts: Dict[str, float] = {}
    
    def _build_reverse_dependencies(self) -> Dict[str, List[str]]:
        """Build reverse dependency map"""
        reverse = defaultdict(list)
        for api, deps in self.dependency_graph.items():
            for dep in deps:
                reverse[dep].append(api)
        return dict(reverse)
    
    def register_compromise(self, api: str, threat_type: str) -> dict:
        """Register API as compromised and calculate propagation risk"""
        current_time = time.time()
        self.compromised_apis[api] = (current_time, threat_type)
        
        # Calculate propagation risk
        at_risk_apis = self._calculate_propagation_risk(api)
        
        return {
            "compromised_api": api,
            "threat_type": threat_type,
            "at_risk_apis": at_risk_apis,
            "total_at_risk": len(at_risk_apis),
            "criticality_score": self.criticality_scores.get(api, 50)
        }
    
    def _calculate_propagation_risk(self, compromised_api: str) -> List[dict]:
        """Calculate which APIs are at risk due to dependency"""
        at_risk = []
        visited = set()
        
        # BFS to find all dependent APIs
        def find_dependent_apis(api: str, depth: int = 0, path: List[str] = None):
            if path is None:
                path = []
            
            if api in visited or depth > 3:  # Limit depth to prevent infinite loops
                return
            
            visited.add(api)
            current_path = path + [api]
            
            # Get direct dependencies (APIs that this API calls)
            direct_deps = self.dependency_graph.get(api, [])
            for dep in direct_deps:
                risk_score = self._calculate_risk_score(dep, depth + 1)
                at_risk.append({
                    "api": dep,
                    "risk_score": risk_score,
                    "distance": depth + 1,
                    "path": current_path + [dep],
                    "criticality": self.criticality_scores.get(dep, 50)
                })
                find_dependent_apis(dep, depth + 1, current_path)
            
            # Get reverse dependencies (APIs that depend on this API)
            reverse_deps = self.reverse_dependencies.get(api, [])
            for rdep in reverse_deps:
                if rdep not in visited:
                    risk_score = self._calculate_risk_score(rdep, depth + 1)
                    at_risk.append({
                        "api": rdep,
                        "risk_score": risk_score,
                        "distance": depth + 1,
                        "path": current_path + [rdep],
                        "criticality": self.criticality_scores.get(rdep, 50),
                        "reverse_dependency": True
                    })
        
        find_dependent_apis(compromised_api)
        
        # Sort by risk score
        at_risk.sort(key=lambda x: x["risk_score"], reverse=True)
        
        return at_risk
    
    def _calculate_risk_score(self, api: str, distance: int) -> int:
        """Calculate risk score for an API based on distance from compromise"""
        base_score = self.criticality_scores.get(api, 50)
        
        # Risk decreases with distance
        distance_penalty = distance * 15
        
        # Check if already compromised
        if api in self.compromised_apis:
            return 100
        
        risk = max(20, base_score - distance_penalty)
        return int(risk)
    
    def analyze_attack_chain(self, api: str, risk_score: int) -> dict:
        """Analyze if attack on one API poses risk to dependent APIs"""
        current_time = time.time()
        
        # Only trigger for high-risk attacks
        if risk_score < 70:
            return {
                "chain_attack_detected": False,
                "at_risk_apis": []
            }
        
        # Check if we recently alerted for this API (prevent spam)
        if api in self.propagation_alerts:
            last_alert = self.propagation_alerts[api]
            if current_time - last_alert < 300:  # 5 minutes cooldown
                return {
                    "chain_attack_detected": False,
                    "at_risk_apis": [],
                    "alert_suppressed": True
                }
        
        # Register compromise and get at-risk APIs
        result = self.register_compromise(api, "High-risk attack")
        self.propagation_alerts[api] = current_time
        
        return {
            "chain_attack_detected": True,
            "at_risk_apis": result["at_risk_apis"][:5],  # Top 5 most at risk
            "total_at_risk": result["total_at_risk"],
            "compromised_api_criticality": result["criticality_score"]
        }
    
    def get_api_dependencies(self, api: str) -> dict:
        """Get full dependency information for an API"""
        return {
            "api": api,
            "direct_dependencies": self.dependency_graph.get(api, []),
            "reverse_dependencies": self.reverse_dependencies.get(api, []),
            "criticality_score": self.criticality_scores.get(api, 50),
            "is_compromised": api in self.compromised_apis
        }
    
    def get_dependency_graph(self) -> dict:
        """Get the entire dependency graph"""
        return {
            "graph": self.dependency_graph,
            "reverse_graph": self.reverse_dependencies,
            "criticality_scores": self.criticality_scores,
            "currently_compromised": list(self.compromised_apis.keys())
        }

api_dependency_tracker = APIDependencyTracker()
