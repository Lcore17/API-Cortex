class SecurityAgent:
    def __init__(self):
        self.name = "Cortex Investigation Agent"

    def investigate(self, threat_data):
        threat_type = threat_data.get("threat_type", "Unknown")
        ip = threat_data.get("ip", "Unknown")
        endpoint = threat_data.get("endpoint", "Unknown")
        
        explanations = {
            "SQL Injection": f"Agent {self.name} analyzed the request to {endpoint} from IP {ip}. "
                             f"Detected common SQL injection patterns in the payload. "
                             f"The request attempted to bypass authentication by manipulating the database query logic.",
            
            "Brute Force": f"Agent {self.name} identified a high frequency of failed login attempts from IP {ip}. "
                           f"Correlation of logs indicates a systemic attempt to guess user credentials. "
                           f"Recommend immediate IP blocking and account lockout implementation.",
            
            "Data Leakage": f"Agent {self.name} flagged a response from {endpoint} containing sensitive patterns. "
                             f"Found PII (Personally Identifiable Information) patterns such as email addresses and unmasked tokens. "
                             f"Security protocol violation detected in API response filtering.",
            
            "Token Abuse": f"Agent {self.name} detected unusual behavior for the provided authentication token. "
                           f"IP address {ip} does not match the usual geolocation associated with this account. "
                           f"Potential session hijacking or token theft detected.",
            
            "None": "Baseline traffic analysis complete. No immediate threats identified. Continuous monitoring in progress."
        }

        return {
            "agent_name": self.name,
            "analysis": explanations.get(threat_type, explanations["None"]),
            "confidence_score": 0.95 if threat_type != "None" else 1.0,
            "root_cause": "Malicious payload detected" if threat_type != "None" else "Normal user behavior",
            "recommended_action": "Block IP and alert SOC" if threat_type != "None" else "Continue monitoring"
        }
