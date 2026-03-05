import re

class SQLInjectionDetector:
    """Enhanced SQL Injection Pattern Detection"""
    
    def __init__(self):
        # Common SQL injection patterns
        self.patterns = [
            r"(\bOR\b\s+[\w\d]+\s*=\s*[\w\d]+)",  # OR 1=1
            r"(\bAND\b\s+[\w\d]+\s*=\s*[\w\d]+)", # AND 1=1
            r"(;|\-\-|\/\*|\*\/)",                 # SQL comment/terminator
            r"(\bUNION\b.*\bSELECT\b)",            # UNION SELECT
            r"(\bDROP\b\s+\bTABLE\b)",             # DROP TABLE
            r"(\bINSERT\b\s+\bINTO\b)",            # INSERT INTO
            r"(\bDELETE\b\s+\bFROM\b)",            # DELETE FROM
            r"(\bEXEC\b|\bEXECUTE\b)",             # EXEC/EXECUTE
            r"(xp_cmdshell|sp_executesql)",        # Dangerous stored procedures
            r"('.*(?:--|#|\/\*))",                 # Quote with comment
            r"(\bSELECT\b.*\bFROM\b)",             # SELECT FROM
            r"(0x[0-9a-fA-F]+)",                   # Hex encoding
            r"(CHAR\(|ASCII\(|CONCAT\()",          # SQL functions
            r"(\bOR\b\s+['\"][\w\s]+['\"]\s*=\s*['\"][\w\s]+['\"])", # OR 'a'='a'
        ]
        self.compiled_patterns = [re.compile(p, re.IGNORECASE) for p in self.patterns]
    
    def detect(self, payload: str) -> dict:
        """
        Detect SQL injection patterns in payload
        Returns: {detected: bool, patterns_found: list, risk_level: str}
        """
        if not payload:
            return {"detected": False, "patterns_found": [], "risk_level": "low"}
        
        patterns_found = []
        for i, pattern in enumerate(self.compiled_patterns):
            matches = pattern.findall(str(payload))
            if matches:
                patterns_found.append({
                    "pattern_id": i,
                    "matched": matches[0] if isinstance(matches[0], str) else matches[0][0]
                })
        
        detected = len(patterns_found) > 0
        risk_level = "critical" if len(patterns_found) >= 3 else "high" if len(patterns_found) >= 2 else "medium" if detected else "low"
        
        return {
            "detected": detected,
            "patterns_found": patterns_found,
            "risk_level": risk_level,
            "pattern_count": len(patterns_found)
        }
    
    def analyze_endpoint(self, endpoint: str, params: dict = None) -> dict:
        """Analyze entire endpoint and parameters for SQL injection"""
        results = {"endpoint_safe": True, "threats": []}
        
        # Check endpoint itself
        endpoint_check = self.detect(endpoint)
        if endpoint_check["detected"]:
            results["endpoint_safe"] = False
            results["threats"].append({
                "location": "endpoint",
                "value": endpoint,
                **endpoint_check
            })
        
        # Check parameters
        if params:
            for key, value in params.items():
                param_check = self.detect(f"{key}={value}")
                if param_check["detected"]:
                    results["endpoint_safe"] = False
                    results["threats"].append({
                        "location": f"param:{key}",
                        "value": value,
                        **param_check
                    })
        
        return results

sql_detector = SQLInjectionDetector()
