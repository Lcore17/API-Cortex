'use client';

import { ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ThreatPanelProps {
  threats: any[];
}

export default function ThreatPanel({ threats }: ThreatPanelProps) {
  // Filter out resolved threats to show only active threats
  const activeThreats = threats.filter((t: any) => t.status !== 'resolved');
  const latestThreats = activeThreats.slice(-5).reverse();

  return (
    <div className="bg-card p-6 rounded-xl border border-white/10 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <ShieldAlert className="text-alert-red" />
          Active Threats
        </h3>
        <span className="bg-alert-red/20 text-alert-red text-xs px-2 py-1 rounded font-bold">
          {activeThreats.length} LIVE
        </span>
      </div>

      <div className="space-y-4">
        {latestThreats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 border-2 border-dashed border-white/5 rounded-xl">
            <CheckCircle2 size={48} className="text-success-green mb-2 opacity-20" />
            <p className="text-sm font-medium">No active threats detected</p>
          </div>
        )}
        {latestThreats.map((threat, idx) => (
          <div key={idx} className="p-4 rounded-lg bg-white/5 border-l-4 border-alert-red animate-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-alert-red uppercase text-xs tracking-widest">{threat.threat_type}</span>
              <span className="text-[10px] text-gray-500">{new Date(threat.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-sm text-gray-300 font-mono mb-2">{threat.ip} → {threat.endpoint}</p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-alert-red shadow-[0_0_8px_#FF4D4D]" 
                  style={{ width: `${threat.risk_score}%` }} 
                />
              </div>
              <span className="text-xs font-bold text-alert-red">{threat.risk_score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
