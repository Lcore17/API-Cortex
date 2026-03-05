'use client';

import { useState } from 'react';
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
  const [isRunning, setIsRunning] = useState(false);
  const [simulationResults, setSimulationResults] = useState<any[]>([]);

  const toggleAttack = (attackId: string) => {
    setSelectedAttacks(prev =>
      prev.includes(attackId)
        ? prev.filter(id => id !== attackId)
        : [...prev, attackId]
    );
  };

  const startSimulation = async () => {
    if (selectedAttacks.length === 0) return;

    setIsRunning(true);
    try {
      for (const attack of selectedAttacks) {
        const response = await fetch('http://127.0.0.1:8000/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attack_type: attack })
        });
        const data = await response.json();
        setSimulationResults(prev => [...prev, { attack, ...data }]);
      }
    } catch (error) {
      console.error('Simulation failed:', error);
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
            <div className="lg:col-span-1 bg-card border border-white/10 rounded-lg p-6">
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
                </div>
              )}

              {!isRunning && simulationResults.length > 0 && (
                <SimulationCenter data={simulationResults} />
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
                  <p className="text-gray-400">Click "Start Simulation" to begin</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
