import time
from collections import defaultdict
from typing import Dict, List

class TimeBasedPatternDetector:
    """Detects slow/stealth attacks that happen over extended periods"""
    
    def __init__(self):
        # Long-term tracking: {ip: [(timestamp, endpoint, threat_type, risk_score)]}
        self.long_term_history: Dict[str, List[tuple]] = defaultdict(list)
        
        # Time windows for pattern detection (seconds)
        self.short_window = 300      # 5 minutes
        self.medium_window = 3600    # 1 hour
        self.long_window = 86400     # 24 hours
        
        # Pattern thresholds
        self.stealth_threshold = 10   # Suspicious requests in long window
        self.distributed_threshold = 5 # From same subnet
    
    def analyze_patterns(self, ip: str, endpoint: str, threat_type: str, risk_score: int) -> dict:
        """Analyze time-based attack patterns"""
        current_time = time.time()
        
        # Add to history
        self.long_term_history[ip].append((current_time, endpoint, threat_type, risk_score))
        
        # Keep only last 24 hours
        self.long_term_history[ip] = [
            entry for entry in self.long_term_history[ip]
            if current_time - entry[0] < self.long_window
        ]
        
        history = self.long_term_history[ip]
        
        # Analyze patterns
        threats = []
        pattern_risk = 0
        
        # 1. Slow stealth attack (low frequency over long period)
        if len(history) >= self.stealth_threshold:
            suspicious_requests = [h for h in history if h[2] != "None" or h[3] > 50]
            if len(suspicious_requests) >= self.stealth_threshold:
                time_span = current_time - suspicious_requests[0][0]
                avg_interval = time_span / len(suspicious_requests) if len(suspicious_requests) > 1 else 0
                
                # If requests are spread out (avg > 5 minutes) but consistent
                if avg_interval > 300:
                    threats.append(f"Slow stealth attack: {len(suspicious_requests)} suspicious requests over {int(time_span/3600)} hours")
                    pattern_risk += 40
        
        # 2. Escalating attack pattern (increasing risk scores over time)
        if len(history) >= 5:
            recent_scores = [h[3] for h in history[-10:]]
            if len(recent_scores) >= 5:
                # Check if risk scores are trending upward
                first_half_avg = sum(recent_scores[:len(recent_scores)//2]) / (len(recent_scores)//2)
                second_half_avg = sum(recent_scores[len(recent_scores)//2:]) / (len(recent_scores) - len(recent_scores)//2)
                
                if second_half_avg > first_half_avg + 20:
                    threats.append("Escalating attack pattern detected (increasing risk scores)")
                    pattern_risk += 30
        
        # 3. Periodic attack pattern (attacks at regular intervals)
        if len(history) >= 6:
            timestamps = [h[0] for h in history if h[2] != "None"]
            if len(timestamps) >= 6:
                intervals = [timestamps[i] - timestamps[i-1] for i in range(1, len(timestamps))]
                if len(intervals) >= 5:
                    avg_interval = sum(intervals) / len(intervals)
                    # Check if intervals are consistent (within 20% variation)
                    consistent = all(abs(interval - avg_interval) / avg_interval < 0.2 for interval in intervals)
                    
                    if consistent and avg_interval > 60:  # More than 1 minute apart
                        threats.append(f"Periodic attack pattern: requests every {int(avg_interval/60)} minutes")
                        pattern_risk += 35
        
        # 4. Multi-phase attack (different attack types over time)
        threat_types = [h[2] for h in history if h[2] != "None"]
        unique_threats = set(threat_types)
        if len(unique_threats) >= 3:
            threats.append(f"Multi-phase attack: {len(unique_threats)} different attack types detected")
            pattern_risk += 45
        
        # 5. Reconnaissance pattern (many different endpoints)
        endpoints_accessed = [h[1] for h in history]
        unique_endpoints = set(endpoints_accessed)
        if len(unique_endpoints) >= 10:
            threats.append(f"Reconnaissance: {len(unique_endpoints)} different endpoints probed")
            pattern_risk += 25
        
        return {
            "time_based_threat_detected": len(threats) > 0,
            "threats": threats,
            "pattern_risk_score": min(100, pattern_risk),
            "total_requests_24h": len(history),
            "suspicious_requests": len([h for h in history if h[2] != "None"]),
            "threat_types_seen": list(unique_threats),
            "threat_level": "critical" if pattern_risk >= 80 else "high" if pattern_risk >= 50 else "medium" if pattern_risk > 0 else "low"
        }
    
    def get_ip_timeline(self, ip: str) -> List[dict]:
        """Get full timeline for an IP"""
        if ip not in self.long_term_history:
            return []
        
        return [
            {
                "timestamp": entry[0],
                "endpoint": entry[1],
                "threat_type": entry[2],
                "risk_score": entry[3]
            }
            for entry in self.long_term_history[ip]
        ]

time_pattern_detector = TimeBasedPatternDetector()
