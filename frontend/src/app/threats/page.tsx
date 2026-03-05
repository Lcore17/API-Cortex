'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import ThreatPanel from '@/components/ThreatPanel';
import { AlertCircle, Shield, Lock } from 'lucide-react';

export default function ThreatsPage() {
  const [threats, setThreats] = useState([]);
  const [threatStats, setThreatStats] = useState({
    active: 0,
    mitigated: 0,
    critical: 0
  });
  const [selectedThreat, setSelectedThreat] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchThreats = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/threats');
        if (!response.ok) throw new Error('API Error');
        const responseData = await response.json();
        const data = Array.isArray(responseData) ? responseData : (responseData.threats || responseData.data || []);
        setThreats(data);

        const active = data.filter((t: any) => t.status !== 'resolved').length;
        const mitigated = data.filter((t: any) => t.status === 'resolved').length;
        const critical = data.filter((t: any) => t.risk_score > 80).length;

        setThreatStats({ active, mitigated, critical });
        
        if (data.length > 0) {
          setSelectedThreat(data[0]);
        }
      } catch (error) {
        console.error('Failed to fetch threats:', error);
        setThreats([]);
        setThreatStats({ active: 0, mitigated: 0, critical: 0 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchThreats();
    const interval = setInterval(fetchThreats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto bg-gradient-to-br from-slate-950 to-slate-900">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Threat Center</h1>
            <p className="text-gray-400">Monitor and manage detected security threats in real-time</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-card border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Active Threats</p>
                  <p className="text-3xl font-bold text-orange-500">{threatStats.active}</p>
                </div>
                <AlertCircle className="text-orange-500" size={32} />
              </div>
            </div>

            <div className="bg-card border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Critical Level</p>
                  <p className="text-3xl font-bold text-red-500">{threatStats.critical}</p>
                </div>
                <Shield className="text-red-500" size={32} />
              </div>
            </div>

            <div className="bg-card border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Mitigated</p>
                  <p className="text-3xl font-bold text-green-500">{threatStats.mitigated}</p>
                </div>
                <Lock className="text-green-500" size={32} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Threats List */}
            <div className="lg:col-span-1 bg-card border border-white/10 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h3 className="text-lg font-bold">Detected Threats</h3>
              </div>
              {isLoading ? (
                <div className="p-6 text-center text-gray-400">Loading threats...</div>
              ) : threats.length === 0 ? (
                <div className="p-6 text-center text-gray-400">No threats detected</div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {threats.slice(0, 10).map((threat, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedThreat(threat)}
                      className={`p-4 border-b border-white/5 cursor-pointer hover:bg-slate-800/50 transition ${
                        selectedThreat?.id === threat.id ? 'bg-slate-800/70 border-l-2 border-l-cyan-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{threat.threat_type}</p>
                          <p className="text-xs text-gray-400 mt-1">{threat.ip}</p>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            threat.risk_score > 80
                              ? 'bg-red-500/20 text-red-400'
                              : threat.risk_score > 50
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {threat.risk_score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Threat Details */}
            <div className="lg:col-span-2">
              {selectedThreat ? (
                <ThreatPanel threat={selectedThreat} />
              ) : (
                <div className="bg-card border border-white/10 rounded-lg p-12 text-center">
                  <AlertCircle size={48} className="mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">Select a threat to view details</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
