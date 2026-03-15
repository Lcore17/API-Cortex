'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import TrafficLog from '@/components/TrafficLog';
import ThreatPanel from '@/components/ThreatPanel';
import SimulationCenter from '@/components/SimulationCenter';
import ThreatTimeline from '@/components/ThreatTimeline';
import { Activity, ShieldAlert, ShieldCheck, CheckCircle2 } from 'lucide-react';

const DashboardCharts = dynamic(() => import('@/components/DashboardCharts'), { ssr: false });
const VulnMapping = dynamic(() => import('@/components/VulnMapping'), { ssr: false });

export default function Dashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [threats, setThreats] = useState<any[]>([]);
  const [resolvedThreats, setResolvedThreats] = useState(0);
  const [stats, setStats] = useState({
    active_threats: 0,
    total_requests: 0,
    risk_score_avg: 0
  });

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const [threatsRes, logsRes, statsRes, threatStatsRes] = await Promise.all([
          fetch('http://localhost:8000/api/threats'),
          fetch('http://localhost:8000/api/logs?limit=50'),
          fetch('http://localhost:8000/api/stats'),
          fetch('http://localhost:8000/api/threat-stats')
        ]);

        const threatsData = await threatsRes.json();
        const logsData = await logsRes.json();
        const statsData = await statsRes.json();
        const threatStatsData = await threatStatsRes.json();

        const allThreats = Array.isArray(threatsData) ? threatsData : [];
        
        // Get threat stats from dedicated endpoint (real database counts)
        const resolvedCount = threatStatsData?.resolved_threats || 0;
        const activeCount = threatStatsData?.active_threats || 0;
        
        setThreats(allThreats);
        setResolvedThreats(resolvedCount);
        setLogs(Array.isArray(logsData) ? logsData : []);
        setStats({
          active_threats: activeCount, // Use real count from database
          total_requests: Number(statsData?.total_requests || 0),
          risk_score_avg: Number(statsData?.risk_score_avg || 0)
        });
      } catch (err) {
        console.error('Overview fetch error:', err);
      }
    };

    loadOverview();
    const pollInterval = setInterval(loadOverview, 5000);

    // WebSocket for real-time traffic
    const ws = new WebSocket('ws://localhost:8000/ws/traffic');
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'traffic') {
          const newLog = message.data;
          setLogs(prev => [...prev.slice(-49), newLog]);
          if (message.stats) {
            setStats({
              active_threats: Number(message.stats.active_threats || 0),
              total_requests: Number(message.stats.total_requests || 0),
              risk_score_avg: Number(message.stats.risk_score_avg || 0)
            });
          }
        }

        if (message.type === 'threat') {
          const threat = message.data;
          setThreats(prev => [threat, ...prev.slice(0, 49)]);
        }
      } catch (e) {
        console.error("WS error:", e);
      }
    };

    return () => {
      ws.close();
      clearInterval(pollInterval);
    };
  }, []);

  const statCards = [
    { label: 'Active Threats', value: stats.active_threats, icon: ShieldAlert, color: 'text-alert-red' },
    { label: 'Resolved Threats', value: resolvedThreats, icon: CheckCircle2, color: 'text-success-green' },
    { label: 'Avg Risk Score', value: stats.risk_score_avg.toFixed(1), icon: Activity, color: 'text-warning-yellow' },
    { label: 'Total Requests', value: stats.total_requests, icon: ShieldCheck, color: 'text-accent-blue' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {statCards.map((stat, idx) => (
              <div key={idx} className="bg-card p-4 rounded-xl border border-white/10 flex items-center justify-between glow-blue">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`${stat.color} bg-white/5 p-3 rounded-lg`}>
                  <stat.icon size={24} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            <div className="xl:col-span-2 space-y-6">
              <DashboardCharts data={logs} />
              <TrafficLog logs={logs} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SimulationCenter />
                <VulnMapping />
              </div>
              <ThreatTimeline threats={threats} />
            </div>
            <div className="space-y-6">
              <ThreatPanel threats={threats} />
              <div className="bg-card p-6 rounded-xl border border-white/10">
                <h3 className="text-sm font-semibold mb-2 text-gray-400 uppercase tracking-wider">Overview Health</h3>
                <p className="text-sm text-gray-300">Live metrics are connected to backend APIs and update automatically via WebSocket.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
