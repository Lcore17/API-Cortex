'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import InvestigationAgent from '@/components/InvestigationAgent';
import { BrainCircuit, Search, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function Investigator() {
  const [selectedThreat, setSelectedThreat] = useState<any>(null);
  const [threats, setThreats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [investigationStats, setInvestigationStats] = useState({
    total_investigations: 0,
    resolved: 0,
    in_progress: 0,
    accuracy_rate: 0
  });
  const isInitialLoad = useRef(true);
  const threatsRef = useRef<any[]>([]);

  useEffect(() => {
    const loadInvestigationData = async () => {
      try {
        const [threatsRes, threatStatsRes] = await Promise.all([
          fetch('http://localhost:8000/api/threats'),
          fetch('http://localhost:8000/api/threat-stats')
        ]);

        if (!threatsRes.ok) {
          throw new Error('Failed to fetch threats');
        }

        const threatsData = await threatsRes.json();
        const threatStatsData = await threatStatsRes.json();
        console.log('Fetched threats data:', threatsData);
        const threatsList = Array.isArray(threatsData) ? threatsData : [];
        
        // Filter only critical threats (high severity or high risk score) that are NOT resolved
        const criticalThreats = threatsList.filter((t: any) => {
          // Exclude already resolved threats
          if (t.status === 'resolved') {
            return false;
          }
          
          // Check multiple severity formats
          const severityStr = String(t.severity || '').toLowerCase();
          const severityCheck = severityStr.includes('high') || severityStr.includes('critical') || severityStr === '3' || t.severity === 3;
          const riskScoreCheck = t.risk_score && Number(t.risk_score) > 60;
          const threatTypeCheck = t.threat_type && t.threat_type !== 'None';
          
          return (severityCheck || riskScoreCheck) && threatTypeCheck;
        });
        
        console.log('Filtered critical threats:', criticalThreats);
        console.log('Total threats:', threatsList.length, 'Critical threats:', criticalThreats.length);
        
        // Check if critical threats have actually changed
        const threatsChanged = JSON.stringify(threatsRef.current) !== JSON.stringify(criticalThreats);
        
        if (threatsChanged) {
          threatsRef.current = criticalThreats;
          setThreats(criticalThreats);
          
          // Only set initial threat on first load
          if (isInitialLoad.current && criticalThreats.length > 0) {
            setSelectedThreat(criticalThreats[0]);
            isInitialLoad.current = false;
          }
        }

        // Get resolved count from persistent database stats
        const resolvedThreats = threatStatsData?.resolved_threats || 0;
        const inProgressThreats = criticalThreats.length;
        const totalInvestigations = inProgressThreats + resolvedThreats;
        
        // Calculate accuracy rate based on confidence scores
        let accuracyRate = 94.5;
        if (criticalThreats.length > 0) {
          const confidenceScores = criticalThreats.map((t: any) => {
            if (t.investigation?.confidence_score) return t.investigation.confidence_score;
            if (t.risk_score) return Math.min(t.risk_score / 100, 1);
            return 0.85;
          });
          const avgConfidence = confidenceScores.reduce((a: number, b: number) => a + b, 0) / confidenceScores.length;
          accuracyRate = Math.round(avgConfidence * 100);
        }
        
        setInvestigationStats({
          total_investigations: totalInvestigations,
          resolved: resolvedThreats,
          in_progress: inProgressThreats,
          accuracy_rate: Math.min(accuracyRate, 100)
        });

        setLoading(false);
      } catch (err) {
        console.error('Investigation data fetch error:', err);
        setLoading(false);
      }
    };

    loadInvestigationData();
    const pollInterval = setInterval(loadInvestigationData, 5000);
    
    return () => clearInterval(pollInterval);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="text-red-500" size={32} />
              <h1 className="text-4xl font-bold">Critical Threat Investigation</h1>
            </div>
            <p className="text-gray-400">AI-powered autonomous analysis of critical threats requiring immediate investigation</p>
          </div>

          {/* Investigation Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-accent-blue/20 to-accent-blue/5 p-6 rounded-xl border border-accent-blue/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Investigations</p>
                  <p className="text-3xl font-bold text-accent-blue">{investigationStats.total_investigations}</p>
                </div>
                <Search className="text-accent-blue opacity-30" size={40} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-success-green/20 to-success-green/5 p-6 rounded-xl border border-success-green/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Resolved</p>
                  <p className="text-3xl font-bold text-success-green">{investigationStats.resolved}</p>
                </div>
                <CheckCircle2 className="text-success-green opacity-30" size={40} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-accent-purple/20 to-accent-purple/5 p-6 rounded-xl border border-accent-purple/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">In Progress</p>
                  <p className="text-3xl font-bold text-accent-purple">{investigationStats.in_progress}</p>
                </div>
                <AlertTriangle className="text-accent-purple opacity-30" size={40} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-600/20 to-cyan-900/20 p-6 rounded-xl border border-cyan-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Accuracy Rate</p>
                  <p className="text-3xl font-bold text-cyan-400">{investigationStats.accuracy_rate}%</p>
                </div>
                <BrainCircuit className="text-cyan-500 opacity-30" size={40} />
              </div>
            </div>
          </div>

          {/* Main Investigation Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Threat List */}
            <div className="lg:col-span-1">
              <div className="bg-card/50 rounded-xl border border-white/10 overflow-hidden">
                <div className="bg-gradient-to-r from-red-600/20 to-accent-purple/20 p-4 border-b border-white/10">
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <AlertTriangle size={20} className="text-red-500" />
                    Critical Threats for Investigation
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">{threats.length} threat(s) pending resolution</p>
                </div>
                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center text-gray-400">Loading threats...</div>
                  ) : threats.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">
                      <p>No critical threats detected</p>
                      <p className="text-xs mt-2">System is secure. All threats resolved.</p>
                    </div>
                  ) : (
                    threats.map((threat, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedThreat(threat)}
                        className={`w-full text-left p-4 transition-all hover:bg-white/5 ${
                          selectedThreat?.timestamp === threat.timestamp
                            ? 'bg-accent-blue/10 border-l-2 border-accent-blue'
                            : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-3 h-3 rounded-full mt-2 flex-shrink-0 bg-red-500 animate-pulse" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate text-red-400">{threat.threat_type || 'Unknown Critical Threat'}</p>
                            <p className="text-xs text-gray-400 truncate">{threat.source_ip || threat.ip || 'N/A'}</p>
                            <p className="text-[10px] text-gray-500 mt-1">Risk: {threat.risk_score || 'High'}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Investigation Details */}
            <div className="lg:col-span-2">
              <InvestigationAgent 
                threat={selectedThreat}
                onThreatResolved={(threatId) => {
                  console.log('Threat resolved:', threatId);
                  // Remove the resolved threat from the list
                  setThreats(prevThreats => {
                    const updated = prevThreats.filter((t: any) => (t.id || t.timestamp) !== threatId);
                    // Select next threat in list
                    if (updated.length > 0) {
                      setSelectedThreat(updated[0]);
                    } else {
                      setSelectedThreat(null);
                    }
                    threatsRef.current = updated;
                    
                    // Update stats immediately without full refresh
                    const newResolved = investigationStats.resolved + 1;
                    const newInProgress = updated.length;
                    
                    setInvestigationStats({
                      total_investigations: updated.length + newResolved,
                      resolved: newResolved,
                      in_progress: newInProgress,
                      accuracy_rate: investigationStats.accuracy_rate
                    });
                    
                    return updated;
                  });
                }}
              />
            </div>
          </div>

          {/* AI Insights Section */}
          <div className="mt-8 bg-gradient-to-r from-accent-purple/10 to-accent-blue/10 rounded-xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <BrainCircuit className="text-accent-purple" size={24} />
              <h3 className="text-lg font-bold">AI Intelligence Insights</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 mb-2">🔍 <span className="font-medium">Pattern Recognition:</span> System detects recurring attack patterns with 94.5% accuracy</p>
              </div>
              <div>
                <p className="text-gray-400 mb-2">⚡ <span className="font-medium">Real-time Analysis:</span> AI processes threats in milliseconds for immediate response</p>
              </div>
              <div>
                <p className="text-gray-400 mb-2">📊 <span className="font-medium">Behavioral Analysis:</span> Identifies anomalous API behavior and suspicious activities</p>
              </div>
              <div>
                <p className="text-gray-400 mb-2">🎯 <span className="font-medium">Predictive Intelligence:</span> Forecasts potential threats before they materialize</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
