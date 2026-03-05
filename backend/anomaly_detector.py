import numpy as np
from sklearn.ensemble import IsolationForest
import pandas as pd

class AnomalyDetector:
    def __init__(self):
        self.model = IsolationForest(contamination=0.1, random_state=42)
        # Initialize with some synthetic data to "train" the model
        # Features: [request_frequency, response_time, payload_size, is_suspicious_payload]
        self.baseline_data = self._generate_baseline_data()
        self.model.fit(self.baseline_data)

    def _generate_baseline_data(self):
        # Generate 100 "normal" requests
        np.random.seed(42)
        freq = np.random.normal(50, 5, 100)
        resp_time = np.random.normal(100, 20, 100)
        payload_size = np.random.normal(500, 100, 100)
        suspicious = np.zeros(100)
        
        return np.column_stack([freq, resp_time, payload_size, suspicious])

    def predict_risk_score(self, freq, resp_time, payload_size, suspicious_payload):
        features = np.array([[freq, resp_time, payload_size, 1.0 if suspicious_payload else 0.0]])
        # decision_function returns values where lower is more anomalous
        score = self.model.decision_function(features)[0]
        # Normalize score to 0-100 range (approximate)
        # decision_function typically returns values in range [-0.5, 0.5]
        normalized_score = int(max(0, min(100, (0.5 - score) * 100)))
        return normalized_score

    def is_anomaly(self, freq, resp_time, payload_size, suspicious_payload):
        features = np.array([[freq, resp_time, payload_size, 1.0 if suspicious_payload else 0.0]])
        prediction = self.model.predict(features)[0]
        return prediction == -1
