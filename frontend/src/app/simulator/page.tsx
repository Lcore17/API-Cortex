'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import SimulationCenter from '@/components/SimulationCenter';
import { Zap, Target, AlertTriangle } from 'lucide-react';

const ATTACK_TYPES = [
  { id: 'sql_injection', label: 'SQL Injection', icon: '💉' },
  { id: 'ddos', label: 'DDoS Attack', icon: '🌊' },
  { id: 'brute_force', label: 'Brute Force', icon: '🔨' },
  { id: 'xss', label: 'XSS Attack', icon: '⚙️' },
  { id: 'api_abuse', label: 'API Abuse', icon: '⚡' },
  { id: 'data_exfil', label: 'Data Exfiltration', icon: '📤' }
];

export default function SimulatorPage() {
  const [selectedAttacks, setSelectedAttacks] = useState<string[]>([]);
  const [attackCount, setAttackCount] = useState<number>(10);
  const [isRunning, setIsRunning] = useState(false);
  const [simulationResults, setSimulationResults] = useState<any[]>([]);

  type DetectedThreat = {
    threat_type?: string;
    risk_score?: number;
    ip?: string;
    endpoint?: string;
    method?: string;
  };

  useEffect(() => {
    if (window.location.hash === '#select-attacks') {
      const section = document.getElementById('select-attacks');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, []);

  const toggleAttack = (attackId: string) => {
    setSelectedAttacks(prev =>
      prev.includes(attackId)
        ? prev.filter(id => id !== attackId)
        : [...prev, attackId]
    );
  };

  const detectedThreats: DetectedThreat[] =
    (simulationResults.find((result) => result.type === 'threats')?.data ?? []) as DetectedThreat[];

  const startSimulation = async () => {
    if (selectedAttacks.length === 0) return;

    setIsRunning(true);
    setSimulationResults([]);
    const count = Math.max(1, Math.min(attackCount || 10, 100));
    
    try {
      // Fire all attack requests
      const results = [];
      for (const attack of selectedAttacks) {
        try {
          const response = await fetch('http://127.0.0.1:8000/api/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attack_type: attack, count })
          });
          const data = await response.json();
          results.push({ attack, ...data });
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Failed to queue ${attack}:`, error);
          results.push({ attack, error: String(error), status: "failed" });
        }
      }
      
      setSimulationResults(results);
      
      // Wait for attacks to be processed by traffic simulator
      // Then fetch actual threat data
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Fetch threats that were detected during simulation
      try {
        const threatsResponse = await fetch('http://127.0.0.1:8000/api/threats');
        const threats = await threatsResponse.json();
        
        // Update results with actual detected threats
        if (threats.length > 0) {
          setSimulationResults(prev => [...prev, { type: 'threats', data: threats.slice(0, 20) }]);
        }
      } catch (error) {
        console.error('Failed to fetch threats:', error);
      }
      
    } catch (error) {
      console.error('Simulation failed:', error);
      setSimulationResults([{ error: String(error), status: "failed" }]);
    } finally {
      setIsRunning(false);
    }
  };

  const stopSimulation = () => {
    setIsRunning(false);
    setSimulationResults([]);
    setSelectedAttacks([]);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto bg-gradient-to-br from-slate-950 to-slate-900">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Attack Simulator</h1>
            <p className="text-gray-400">Simulate various attack scenarios to test security measures</p>
          </div>

          {/* Warning Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-8 flex items-start">
            <AlertTriangle className="text-amber-500 mr-3 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="font-semibold text-amber-400 mb-1">Warning</p>
              <p className="text-sm text-amber-300">This simulator generates test traffic. Only use in controlled environments.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Attack Selection */}
            <div id="select-attacks" className="lg:col-span-1 bg-card border border-white/10 rounded-lg p-6">
              <div className="flex items-center mb-6">
                <Target className="text-cyan-500 mr-2" size={24} />
                <h3 className="text-lg font-bold">Select Attacks</h3>
              </div>

              <div className="space-y-3 mb-6">
                {ATTACK_TYPES.map(attack => (
                  <label
                    key={attack.id}
                    className="flex items-center p-3 bg-slate-800/50 rounded cursor-pointer hover:bg-slate-800 transition border border-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAttacks.includes(attack.id)}
                      onChange={() => toggleAttack(attack.id)}
                      className="w-4 h-4 mr-3 accent-cyan-500"
                    />
                    <span className="mr-2">{attack.icon}</span>
                    <span className="text-sm">{attack.label}</span>
                  </label>
                ))}
              </div>

              <div className="mb-6 p-4 bg-slate-800/50 rounded border border-white/10">
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Requests Per Selected Attack (Max 100)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={attackCount}
                  onChange={(e) => setAttackCount(Math.max(1, Math.min(Number(e.target.value) || 1, 100)))}
                  className="w-full bg-slate-900 border border-white/20 rounded px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-3">
                <button
                  onClick={startSimulation}
                  disabled={selectedAttacks.length === 0 || isRunning}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition flex items-center justify-center"
                >
                  <Zap size={18} className="mr-2" />
                  Start Simulation
                </button>

                {isRunning && (
                  <button
                    onClick={stopSimulation}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition"
                  >
                    Stop Simulation
                  </button>
                )}
              </div>

              {selectedAttacks.length > 0 && (
                <div className="mt-6 p-4 bg-slate-800/50 rounded">
                  <p className="text-xs text-gray-400 mb-2">Selected: {selectedAttacks.length}</p>
                  <p className="text-xs text-gray-400 mb-2">Requests per attack: {Math.max(1, Math.min(attackCount || 10, 100))}</p>
                  <div className="text-sm font-semibold text-cyan-400">{selectedAttacks.join(', ')}</div>
                </div>
              )}
            </div>

            {/* Results */}
            <div className="lg:col-span-2">
              {isRunning && (
                <div className="bg-card border border-white/10 rounded-lg p-12 text-center">
                  <div className="animate-spin inline-block">
                    <Zap className="text-cyan-500" size={48} />
                  </div>
                  <p className="text-gray-300 mt-4 font-semibold">Running simulation...</p>
                  <p className="text-gray-400 text-sm mt-2">Processing {selectedAttacks.length} attack type(s)</p>
                </div>
              )}

              {!isRunning && simulationResults.length > 0 && (
                <div className="space-y-4">
                  {/* Show queued attacks */}
                  {simulationResults.some(r => r.status === 'queued') && (
                    <div className="bg-card border border-green-500/30 rounded-lg p-6">
                      <h3 className="text-lg font-bold text-green-400 mb-4">✓ Attacks Queued</h3>
                      <div className="space-y-2">
                        {simulationResults.filter(r => r.status === 'queued').map((result, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                            <span className="text-white font-semibold">{result.attack_type || result.attack}</span>
                            <span className="text-green-400 text-sm">✓ {result.count} requests queued</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show detected threats */}
                  {simulationResults.some(r => r.type === 'threats') && (
                    <div className="bg-card border border-red-500/30 rounded-lg p-6">
                      <h3 className="text-lg font-bold text-red-400 mb-4">⚠ Threats Detected</h3>
                      <div className="grid gap-3 max-h-96 overflow-y-auto">
                        {detectedThreats.slice(0, 10).map((threat, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-800/50 rounded border border-red-500/20">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-semibold text-red-400">{threat.threat_type}</span>
                              <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">Risk: {threat.risk_score}</span>
                            </div>
                            <div className="text-xs text-gray-400 space-y-1">
                              <div>IP: {threat.ip}</div>
                              <div>Endpoint: {threat.endpoint}</div>
                              <div>Method: {threat.method}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show failures if any */}
                  {simulationResults.some(r => r.status === 'failed') && (
                    <div className="bg-card border border-amber-500/30 rounded-lg p-6">
                      <h3 className="text-lg font-bold text-amber-400 mb-4">✗ Failed Requests</h3>
                      <div className="space-y-2">
                        {simulationResults.filter(r => r.status === 'failed').map((result, idx) => (
                          <div key={idx} className="p-3 bg-slate-800/50 rounded text-red-300 text-sm">
                            {result.attack}: {result.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* If we have SimulationCenter data, show it too */}
                  {simulationResults.some(r => !r.status && !r.type) && (
                    <SimulationCenter />
                  )}
                </div>
              )}

              {!isRunning && selectedAttacks.length === 0 && simulationResults.length === 0 && (
                <div className="bg-card border border-white/10 rounded-lg p-12 text-center">
                  <Target className="mx-auto mb-4 text-gray-600" size={48} />
                  <p className="text-gray-400">Select attack types to begin simulation</p>
                </div>
              )}

              {!isRunning && selectedAttacks.length > 0 && simulationResults.length === 0 && (
                <div className="bg-card border border-white/10 rounded-lg p-12 text-center">
                  <Zap className="mx-auto mb-4 text-gray-600" size={48} />
                  <p className="text-gray-400">Click &quot;Start Simulation&quot; to begin</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
