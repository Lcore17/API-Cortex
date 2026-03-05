'use client';

import { Zap, ShieldAlert, Database, Lock, UserX } from 'lucide-react';
import { useState } from 'react';

export default function SimulationCenter() {
  const [loading, setLoading] = useState<string | null>(null);

  const simulate = async (type: string) => {
    setLoading(type);
    try {
      const res = await fetch(`http://localhost:8000/api/simulate?attack_type=${type}`, {
        method: 'POST'
      });
      if (res.ok) {
        // Success
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setLoading(null), 1000);
    }
  };

  const attackButtons = [
    { id: 'sqli', label: 'SQL Injection', icon: Database, color: 'text-alert-red', bg: 'hover:bg-alert-red/10 border-alert-red/20' },
    { id: 'brute_force', label: 'Brute Force', icon: Lock, color: 'text-warning-yellow', bg: 'hover:bg-warning-yellow/10 border-warning-yellow/20' },
    { id: 'data_leak', label: 'Data Leakage', icon: UserX, color: 'text-accent-purple', bg: 'hover:bg-accent-purple/10 border-accent-purple/20' },
  ];

  return (
    <div className="bg-card p-6 rounded-xl border border-white/10 glow-purple overflow-hidden relative">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="text-warning-yellow animate-pulse" />
        <h3 className="text-lg font-bold">Attack Simulation Center</h3>
      </div>

      <p className="text-sm text-gray-400 mb-6">
        Trigger simulated attack vectors to test the AI detection engine and view automated investigative workflows.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {attackButtons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => simulate(btn.id)}
            disabled={loading !== null}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${btn.bg} ${loading === btn.id ? 'opacity-50 scale-95' : 'hover:scale-105'}`}
          >
            <btn.icon className={btn.color} size={32} />
            <span className="text-xs font-bold uppercase tracking-widest">{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
