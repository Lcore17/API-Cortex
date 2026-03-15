'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import ThreatPanel from '@/components/ThreatPanel';
import ThreatTimeline from '@/components/ThreatTimeline';
import { AlertTriangle, Target, Shield, TrendingUp } from 'lucide-react';

export default function ThreatCenter() {
  const [threats, setThreats] = useState<any[]>([]);
  const [threatSummary, setThreatSummary] = useState<any>(null);

  useEffect(() => {
    // Fetch initial threats and summary
    const loadData = () => {
      Promise.all([
        fetch('http://localhost:8000/api/threats').then(r => r.json()),
        fetch('http://localhost:8000/api/threat-summary').then(r => r.json())
      ]).then(([threatsData, summaryData]) => {
        setThreats(threatsData);
        setThreatSummary(summaryData);
      }).catch(err => console.error('Fetch error:', err));
    };
    
    loadData();
    
    // Poll for updates every 3 seconds
    const pollInterval = setInterval(loadData, 3000);

    // WebSocket connection for real-time threat updates
    const ws = new WebSocket('ws://localhost:8000/ws/traffic');
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'threat') {
          // New threat detected - refresh data immediately
          loadData();
        }
      } catch (e) {
        console.error('WS error:', e);
      }
    };
    
    return () => {
      ws.close();
      clearInterval(pollInterval);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Threat Center</h1>
            <p className="text-gray-400">Detected threats and response insights</p>
          </div>

          {/* Threat Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-red-600/20 to-red-900/20 p-6 rounded-xl border border-red-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Critical Threats</p>
                  <p className="text-3xl font-bold text-red-400">{threatSummary?.critical_threats || 0}</p>
                </div>
                <AlertTriangle className="text-red-500 opacity-30" size={40} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-600/20 to-orange-900/20 p-6 rounded-xl border border-orange-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">High Threats</p>
                  <p className="text-3xl font-bold text-orange-400">{threatSummary?.high_threats || 0}</p>
                </div>
                <TrendingUp className="text-orange-500 opacity-30" size={40} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-900/20 p-6 rounded-xl border border-yellow-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Medium Threats</p>
                  <p className="text-3xl font-bold text-yellow-400">{threatSummary?.medium_threats || 0}</p>
                </div>
                <Shield className="text-yellow-500 opacity-30" size={40} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-600/20 to-cyan-900/20 p-6 rounded-xl border border-cyan-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Threats</p>
                  <p className="text-3xl font-bold text-cyan-400">{(threatSummary?.critical_threats || 0) + (threatSummary?.high_threats || 0) + (threatSummary?.medium_threats || 0)}</p>
                </div>
                <Target className="text-cyan-500 opacity-30" size={40} />
              </div>
            </div>
          </div>

          {/* Threat Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Threats by Type */}
            <div className="bg-card border border-white/10 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Threats by Type</h3>
              <div className="space-y-3">
                {threatSummary?.threats_by_type && Object.entries(threatSummary.threats_by_type).length > 0 ? (
                  Object.entries(threatSummary.threats_by_type).map(([type, count]: [string, any]) => (
                    <div key={type} className="p-3 bg-slate-800/50 rounded border border-red-500/20">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-white">{type}</span>
                        <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded font-bold">{count}</span>
                      </div>
                      <div className="mt-2 h-2 bg-slate-700 rounded overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-red-500 to-red-600"
                          style={{width: `${(count / Math.max(...Object.values(threatSummary.threats_by_type) as number[])) * 100}%`}}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No threats classified yet</p>
                )}
              </div>
            </div>

            {/* Top Threat Sources */}
            <div className="bg-card border border-white/10 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Top Threat IPs</h3>
              <div className="space-y-3">
                {threatSummary?.top_ips?.length > 0 ? (
                  threatSummary.top_ips.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-800/50 rounded border border-orange-500/20">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-mono text-blue-400">{item.ip}</span>
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded font-bold">{item.count}</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-600"
                          style={{width: `${(item.count / Math.max(...(threatSummary.top_ips?.map((x: any) => x.count) || [1]))) * 100}%`}}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No source IPs tracked</p>
                )}
              </div>
            </div>

            {/* Attacked Endpoints */}
            <div className="bg-card border border-white/10 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Most Attacked Endpoints</h3>
              <div className="space-y-3">
                {threatSummary?.top_endpoints?.length > 0 ? (
                  threatSummary.top_endpoints.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-800/50 rounded border border-yellow-500/20">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-mono text-yellow-400">{item.endpoint}</span>
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded font-bold">{item.count}</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600"
                          style={{width: `${(item.count / Math.max(...(threatSummary.top_endpoints?.map((x: any) => x.count) || [1]))) * 100}%`}}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No endpoints attacked</p>
                )}
              </div>
            </div>
          </div>

          {/* Main Threat Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ThreatTimeline threats={threats} />
            </div>
            <div className="space-y-6">
              <ThreatPanel threats={threats} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
