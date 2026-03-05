import time
from collections import defaultdict
from typing import Dict, List, Tuple

class DDoSDetector:
    """Enhanced DDoS and API Flooding Detection with Rate Limiting"""
    
    def __init__(self):
        # Track request patterns: {ip: [(timestamp, endpoint)]}
        self.request_history: Dict[str, List[Tuple[float, str]]] = defaultdict(list)
        
        # Blocked IPs: {ip: (block_start_time, reason)}
        self.blocked_ips: Dict[str, Tuple[float, str]] = {}
        
        # Rate limits (requests per minute)
        self.rate_limits = {
            "normal": 60,      # Normal traffic
            "burst": 100,      # Burst allowed
            "critical": 200    # Critical threshold
        }
        
        # Time windows (seconds)
        self.time_window = 60  # 1 minute
        self.block_duration = 300  # 5 minutes
    
    def check_rate_limit(self, ip: str, endpoint: str) -> dict:
        """Check if IP is flooding and should be rate limited"""
        current_time = time.time()
        
        # Check if IP is currently blocked
        if ip in self.blocked_ips:
            block_time, reason = self.blocked_ips[ip]
            if current_time - block_time < self.block_duration:
                return {
                    "blocked": True,
                    "reason": reason,
                    "remaining_block_time": self.block_duration - (current_time - block_time),
                    "should_block": True,
                    "threat_detected": True
                }
            else:
                # Unblock IP after duration
                del self.blocked_ips[ip]
        
        # Track request
        if ip not in self.request_history:
            self.request_history[ip] = []
        
        history = self.request_history[ip]
        
        # Remove old entries outside time window
        history = [(t, e) for t, e in history if current_time - t < self.time_window]
        history.append((current_time, endpoint))
        self.request_history[ip] = history
        
        # Calculate request rate
        request_count = len(history)
        requests_per_minute = request_count
        
        # Detect patterns
        threats = []
        should_block = False
        threat_level = "none"
        
        # Check rate thresholds
        if requests_per_minute > self.rate_limits["critical"]:
            threats.append(f"Critical rate limit exceeded: {requests_per_minute} req/min")
            should_block = True
            threat_level = "critical"
        elif requests_per_minute > self.rate_limits["burst"]:
            threats.append(f"Burst threshold exceeded: {requests_per_minute} req/min")
            threat_level = "high"
            if requests_per_minute > 150:
                should_block = True
        elif requests_per_minute > self.rate_limits["normal"]:
            threats.append(f"Normal rate limit exceeded: {requests_per_minute} req/min")
            threat_level = "medium"
        
        # Check for endpoint flooding (same endpoint repeatedly)
        recent_endpoints = [e for _, e in history[-20:]]
        if len(recent_endpoints) >= 20:
            unique_endpoints = len(set(recent_endpoints))
            if unique_endpoints <= 2:
                threats.append("Single endpoint flooding detected")
                threat_level = "high"
                if requests_per_minute > 100:
                    should_block = True
        
        # Block IP if needed
        if should_block:
            self.blocked_ips[ip] = (current_time, f"DDoS/Flooding: {requests_per_minute} req/min")
        
        return {
            "blocked": should_block,
            "threat_detected": len(threats) > 0,
            "threats": threats,
            "request_count": request_count,
            "requests_per_minute": requests_per_minute,
            "threat_level": threat_level,
            "should_block": should_block,
            "is_flooding": requests_per_minute > self.rate_limits["burst"]
        }
    
    def get_blocked_ips(self) -> List[dict]:
        """Get list of currently blocked IPs"""
        current_time = time.time()
        blocked = []
        
        for ip, (block_time, reason) in list(self.blocked_ips.items()):
            remaining = self.block_duration - (current_time - block_time)
            if remaining > 0:
                blocked.append({
                    "ip": ip,
                    "reason": reason,
                    "blocked_at": block_time,
                    "remaining_seconds": int(remaining)
                })
            else:
                del self.blocked_ips[ip]
        
        return blocked
    
    def unblock_ip(self, ip: str) -> bool:
        """Manually unblock an IP"""
        if ip in self.blocked_ips:
            del self.blocked_ips[ip]
            return True
        return False

ddos_detector = DDoSDetector()
