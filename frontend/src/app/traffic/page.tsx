'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import TrafficLog from '@/components/TrafficLog';
import DashboardCharts from '@/components/DashboardCharts';
import { AlertTriangle, Activity, Zap, Eye, MapPin, Clock, Play, Square } from 'lucide-react';

export default function TrafficMonitor() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ active_threats: 0, total_requests: 0, risk_score_avg: 0 });
  const [summary, setSummary] = useState<any>(null);
  const [liveActivity, setLiveActivity] = useState<any[]>([]);
  const [trafficStatus, setTrafficStatus] = useState<any>(null);
  const [requestCount, setRequestCount] = useState('5');
  const [isLoadingTraffic, setIsLoadingTraffic] = useState(false);
  const activityContainerRef = useRef<HTMLDivElement>(null);

  // Handle scroll events to prevent auto-scroll when user is reading
  const handleActivityScroll = () => {
    // Do nothing - just prevent any auto-scroll behavior
  };

  // Don't auto-scroll, just keep position where user left it

  useEffect(() => {
    // Fetch initial data
    const loadData = () => {
      Promise.all([
        fetch('http://localhost:8000/api/stats').then(r => r.json()),
        fetch('http://localhost:8000/api/traffic-summary').then(r => r.json()),
        fetch('http://localhost:8000/api/logs?limit=50').then(r => r.json()),
        fetch('http://localhost:8000/api/traffic-control/status').then(r => r.json())
      ]).then(([statsData, summaryData, logsData, controlData]) => {
        setStats(statsData);
        setSummary(summaryData);
        setLogs(logsData);
        setLiveActivity(logsData.slice(0, 10));
        setTrafficStatus(controlData);
      }).catch(err => console.error('Fetch error:', err));
    };
    
    loadData();
    
    // Poll for updates every 3 seconds
    const pollInterval = setInterval(loadData, 3000);

    // WebSocket connection for real-time updates
    const ws = new WebSocket('ws://localhost:8000/ws/traffic');
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'traffic') {
          // Update live activity with ALL traffic
          setLiveActivity(prev => [message.data, ...prev.slice(0, 9)]);
          setLogs(prev => [message.data, ...prev.slice(0, 49)]);
        }
        if (message.type === 'threat') {
          // High-risk threat detected
          setLiveActivity(prev => [message.data, ...prev.slice(0, 9)]);
          // Refresh stats immediately
          fetch('http://localhost:8000/api/stats').then(r => r.json()).then(setStats);
          fetch('http://localhost:8000/api/traffic-summary').then(r => r.json()).then(setSummary);
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    ws.onerror = () => console.error('WebSocket error');
    
    return () => {
      ws.close();
      clearInterval(pollInterval);
    };
  }, []);

  const handleStartTraffic = async () => {
    setIsLoadingTraffic(true);
    try {
      const count = Math.max(1, Math.min(parseInt(requestCount) || 5, 100));
      const response = await fetch(`http://localhost:8000/api/start-traffic?count=${count}`, {
        method: 'POST'
      });
      await response.json();
      setTrafficStatus({
        auto_generate_enabled: true,
        auto_generate_count: count,
        auto_generate_remaining: count,
        traffic_paused: false
      });
    } catch (error) {
      console.error('Failed to start traffic:', error);
    } finally {
      setIsLoadingTraffic(false);
    }
  };

  const handleStopTraffic = async () => {
    setIsLoadingTraffic(true);
    try {
      await fetch('http://localhost:8000/api/stop-traffic', {
        method: 'POST'
      });
      setTrafficStatus({
        auto_generate_enabled: false,
        auto_generate_count: 0,
        auto_generate_remaining: 0,
        traffic_paused: true
      });
    } catch (error) {
      console.error('Failed to stop traffic:', error);
    } finally {
      setIsLoadingTraffic(false);
    }
  };

  const highRiskCount = summary?.high_risk_count || 0;
  const threatTypes = summary?.threat_distribution || {};

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Real-Time Traffic Monitor</h1>
            <p className="text-gray-400">Live API request stream and security analysis</p>
          </div>

          {/* Traffic Generation Control */}
          <div className="bg-gradient-to-r from-blue-600/10 to-cyan-600/10 border border-blue-500/30 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-blue-400 mb-2">🚦 Traffic Generation Control</h3>
                <p className="text-sm text-gray-400">
                  Status: {trafficStatus?.traffic_paused ? (
                    <span className="text-red-400 font-semibold">Paused</span>
                  ) : trafficStatus?.auto_generate_enabled ? (
                    <span className="text-green-400 font-semibold">Active ({trafficStatus?.auto_generate_remaining}/{trafficStatus?.auto_generate_count} remaining)</span>
                  ) : (
                    <span className="text-gray-400 font-semibold">Stopped</span>
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-300">Count:</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={requestCount}
                    onChange={(e) => setRequestCount(e.target.value)}
                    className="w-20 px-2 py-1 bg-slate-800 border border-white/20 rounded text-white text-sm"
                  />
                </div>
                <button
                  onClick={handleStartTraffic}
                  disabled={isLoadingTraffic}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded font-semibold text-sm transition flex items-center gap-2"
                >
                  <Play size={16} /> Start
                </button>
                {trafficStatus?.auto_generate_enabled && !trafficStatus?.traffic_paused && (
                  <button
                    onClick={handleStopTraffic}
                    disabled={isLoadingTraffic}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded font-semibold text-sm transition flex items-center gap-2"
                  >
                    <Square size={16} /> Stop
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 p-6 rounded-xl border border-blue-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Requests</p>
                  <p className="text-3xl font-bold text-blue-400">{stats.total_requests}</p>
                </div>
                <Activity className="text-blue-500 opacity-30" size={40} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-600/20 to-red-900/20 p-6 rounded-xl border border-red-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Active Threats</p>
                  <p className="text-3xl font-bold text-red-400">{stats.active_threats}</p>
                </div>
                <AlertTriangle className="text-red-500 opacity-30" size={40} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-600/20 to-amber-900/20 p-6 rounded-xl border border-amber-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Avg Risk Score</p>
                  <p className="text-3xl font-bold text-amber-400">{stats.risk_score_avg.toFixed(1)}</p>
                </div>
                <Zap className="text-amber-500 opacity-30" size={40} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 p-6 rounded-xl border border-purple-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">High Risk</p>
                  <p className="text-3xl font-bold text-purple-400">{highRiskCount}</p>
                </div>
                <Eye className="text-purple-500 opacity-30" size={40} />
              </div>
            </div>
          </div>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Threat Distribution */}
            <div className="lg:col-span-1 bg-card border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <AlertTriangle className="mr-2 text-red-500" size={20} />
                Threat Types
              </h2>
              <div className="space-y-3">
                {Object.entries(threatTypes).length > 0 ? (
                  Object.entries(threatTypes).map(([type, count]: [string, any]) => (
                    <div key={type} className="p-3 bg-slate-800/50 rounded border border-white/5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-white">{type}</span>
                        <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">{count}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No threats detected</p>
                )}
              </div>
            </div>

            {/* Top IPs */}
            <div className="lg:col-span-1 bg-card border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <MapPin className="mr-2 text-cyan-500" size={20} />
                Top IPs
              </h2>
              <div className="space-y-3">
                {summary?.top_ips?.length > 0 ? (
                  summary.top_ips.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-800/50 rounded border border-white/5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-mono text-blue-400">{item.ip}</span>
                        <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">{item.count}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No IPs tracked</p>
                )}
              </div>
            </div>

            {/* Top Endpoints */}
            <div className="lg:col-span-1 bg-card border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Clock className="mr-2 text-green-500" size={20} />
                Top Endpoints
              </h2>
              <div className="space-y-3">
                {summary?.top_endpoints?.length > 0 ? (
                  summary.top_endpoints.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-800/50 rounded border border-white/5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-mono text-green-400">{item.endpoint}</span>
                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">{item.count}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No endpoints tracked</p>
                )}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="mb-8">
            <DashboardCharts data={logs} />
          </div>

          {/* Live Activity */}
          <div className="bg-card border border-white/10 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Live Activity Stream</h2>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400">Real-time</span>
              </div>
            </div>
            {liveActivity.length > 0 ? (
              <div 
                ref={activityContainerRef}
                onScroll={handleActivityScroll}
                className="space-y-2 max-h-96 overflow-y-auto"
              >
                {liveActivity.map((item: any, idx: number) => {
                  const isHighRisk = item.risk_score > 70;
                  const time = item.timestamp ? new Date(item.timestamp).toLocaleTimeString('en-US', { hour12: false }) : 'N/A';
                  return (
                    <div key={idx} className={`flex items-center justify-between p-3 bg-slate-800/50 rounded border ${
                      isHighRisk ? 'border-red-500/30 bg-red-500/5' : 'border-white/5'
                    }`}>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            isHighRisk ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>{item.method || 'GET'}</span>
                          <p className="font-semibold text-white">{item.endpoint || '/'}</p>
                        </div>
                        <div className="flex items-center space-x-3 text-xs">
                          <span className="text-gray-400">IP: <span className="text-blue-400 font-mono">{item.ip}</span></span>
                          {item.threat_type && item.threat_type !== 'None' && (
                            <span className="text-red-400 font-semibold">⚠ {item.threat_type}</span>
                          )}
                          <span className="text-gray-500">{item.country || 'Unknown'}</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`text-sm font-bold ${
                          isHighRisk ? 'text-red-400' : item.risk_score > 50 ? 'text-yellow-400' : 'text-green-400'
                        }`}>Risk: {item.risk_score}</p>
                        <p className="text-xs text-gray-400 font-mono">{time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">Waiting for traffic...</p>
            )}
          </div>

          {/* Traffic Log */}
          <div>
            <h2 className="text-2xl font-bold mb-4">All Traffic Logs</h2>
            <TrafficLog logs={logs} />
          </div>
        </main>
      </div>
    </div>
  );
}
