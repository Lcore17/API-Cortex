import time
from typing import Dict, List

class GeolocationThreatDetector:
    """Detects unusual geographic access patterns"""
    
    def __init__(self):
        # Track user/IP patterns: {user_id/ip: [(timestamp, country)]}
        self.access_history = {}
        
        # High-risk countries (example - can be customized)
        self.high_risk_countries = ["RU", "CN", "KP", "IR", "SY"]
        
        # Impossible travel detection (hours to travel between countries)
        self.country_distances = {
            ("US", "RU"): 10,  # Minimum hours to travel
            ("IN", "RU"): 6,
            ("US", "CN"): 12,
            ("IN", "CN"): 4,
            ("UK", "RU"): 4,
        }
    
    def check_geolocation_risk(self, identifier: str, country: str, timestamp: float = None) -> dict:
        """
        Check for suspicious geographic access patterns
        identifier: user_id, session_id, or IP address
        country: Two-letter country code
        """
        if timestamp is None:
            timestamp = time.time()
        
        # Initialize history
        if identifier not in self.access_history:
            self.access_history[identifier] = []
        
        history = self.access_history[identifier]
        
        # Check for impossible travel
        impossible_travel = False
        if history:
            last_time, last_country = history[-1]
            time_diff_hours = (timestamp - last_time) / 3600
            
            # Check if travel time is impossible
            for (c1, c2), min_hours in self.country_distances.items():
                if (last_country == c1 and country == c2) or (last_country == c2 and country == c1):
                    if time_diff_hours < min_hours:
                        impossible_travel = True
                        break
        
        # Check if country is high-risk
        high_risk_location = country in self.high_risk_countries
        
        # Check for unusual location (different from normal pattern)
        unusual_location = False
        if len(history) >= 5:
            recent_countries = [c for _, c in history[-5:]]
            if country not in recent_countries and len(set(recent_countries)) == 1:
                unusual_location = True
        
        # Add to history (keep last 20)
        history.append((timestamp, country))
        self.access_history[identifier] = history[-20:]
        
        # Calculate risk score
        risk_score = 0
        threats = []
        
        if impossible_travel:
            risk_score += 50
            threats.append("Impossible travel detected")
        
        if high_risk_location:
            risk_score += 30
            threats.append(f"Access from high-risk country: {country}")
        
        if unusual_location:
            risk_score += 20
            threats.append("Unusual location for this user/IP")
        
        return {
            "detected": risk_score > 0,
            "risk_score": min(100, risk_score),
            "threats": threats,
            "country": country,
            "impossible_travel": impossible_travel,
            "high_risk_location": high_risk_location,
            "unusual_location": unusual_location
        }
    
    def get_location_history(self, identifier: str) -> List[tuple]:
        """Get access history for an identifier"""
        return self.access_history.get(identifier, [])

geo_detector = GeolocationThreatDetector()
