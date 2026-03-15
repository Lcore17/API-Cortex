'use client';

import { useRef } from 'react';
import { Terminal as TerminalIcon, ShieldCheck, ShieldAlert, HelpCircle, Globe, Database, MapPin, Eye, Clock } from 'lucide-react';

interface TrafficLogProps {
  logs: any[];
}

export default function TrafficLog({ logs = [] }: TrafficLogProps) {
  return (
    <div className="bg-black/80 rounded-xl border border-white/10 overflow-hidden flex flex-col h-[400px]">
      <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TerminalIcon size={16} className="text-accent-blue" />
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Live API Traffic Stream</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono">
           <span className="flex items-center gap-1 text-success-green"><ShieldCheck size={10} /> TRUSTED</span>
           <span className="flex items-center gap-1 text-alert-red"><ShieldAlert size={10} /> MALICIOUS</span>
           <span className="flex items-center gap-1 text-gray-400"><HelpCircle size={10} /> UNKNOWN</span>
           <span className="flex items-center gap-1 text-accent-purple"><Globe size={10} /> PROXY/VPN</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 terminal-log text-sm">
        {logs.length === 0 && (
          <div className="text-gray-500 font-mono animate-pulse">Waiting for traffic data...</div>
        )}
        {logs.map((log, index) => (
          <div key={index} className="font-mono mb-2 animate-in fade-in slide-in-from-left-2 duration-300 border-l-2 border-transparent hover:border-accent-blue pl-2 py-1 hover:bg-white/5 rounded">
            <div className="flex gap-4 items-center">
              <span className="text-gray-500 text-xs shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className={`font-bold shrink-0 w-12 ${
                log.method === 'POST' ? 'text-accent-purple' : 'text-accent-blue'
              }`}>{log.method}</span>
              <span className="text-gray-300 truncate max-w-[150px]">{log.endpoint}</span>
              <span className={`shrink-0 w-8 ${
                log.status_code >= 400 ? 'text-alert-red' : 'text-success-green'
              }`}>{log.status_code}</span>
              
              <div className="flex items-center gap-2 min-w-[200px]">
                <span className="text-gray-500">{log.ip}</span>
                {log.reputation === 'Trusted' && <ShieldCheck size={12} className="text-success-green" />}
                {log.reputation === 'Malicious' && <ShieldAlert size={12} className="text-alert-red" />}
                {log.is_proxy && <Globe size={12} className="text-accent-purple" />}
              </div>

              <span className="text-gray-400 ml-auto shrink-0">{log.response_time.toFixed(0)}ms</span>
              <span className={`px-2 rounded text-[10px] uppercase font-bold shrink-0 ${
                log.risk_score > 70 ? 'bg-alert-red/20 text-alert-red' : 
                log.risk_score > 30 ? 'bg-warning-yellow/20 text-warning-yellow' : 
                'bg-success-green/20 text-success-green'
              }`}>Risk: {log.risk_score}</span>
            </div>
            
            {/* Additional detection badges */}
            {(log.sql_injection || log.geo_threat || log.is_shadow_api || log.ddos_detected || log.blocked) && (
              <div className="flex gap-2 mt-1 ml-[180px]">
                {log.sql_injection && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-alert-red/20 text-alert-red text-[9px] rounded font-bold">
                    <Database size={10} /> SQL INJECTION
                  </span>
                )}
                {log.geo_threat && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-warning-yellow/20 text-warning-yellow text-[9px] rounded font-bold">
                    <MapPin size={10} /> GEO THREAT
                  </span>
                )}
                {log.is_shadow_api && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-accent-purple/20 text-accent-purple text-[9px] rounded font-bold">
                    <Eye size={10} /> SHADOW API
                  </span>
                )}
                {log.ddos_detected && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-alert-red/20 text-alert-red text-[9px] rounded font-bold">
                    <ShieldAlert size={10} /> DDoS
                  </span>
                )}
                {log.blocked && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-alert-red/30 text-alert-red text-[9px] rounded font-bold">
                    🚫 BLOCKED
                  </span>
                )}
                {log.time_patterns && log.time_patterns.length > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-warning-yellow/20 text-warning-yellow text-[9px] rounded font-bold">
                    <Clock size={10} /> TIME PATTERN
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
