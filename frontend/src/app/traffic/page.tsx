'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import TrafficLog from '@/components/TrafficLog';
import { Activity, AlertTriangle, TrendingUp } from 'lucide-react';

export default function TrafficMonitorPage() {
  const [stats, setStats] = useState({
    totalRequests: 0,
    suspiciousRequests: 0,
    blockedRequests: 0,
    avgResponseTime: 0
  });
  const [trafficData, setTrafficData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrafficData = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/logs');
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Ensure data is an array
        const logsArray = Array.isArray(data) ? data : (data.logs || data.data || []);
        
        setTrafficData(logsArray);
        
        // Calculate stats
        const total = logsArray.length;
        const suspicious = logsArray.filter((d: any) => d.risk_score > 50).length;
        const blocked = logsArray.filter((d: any) => d.status_code === 403).length;
        const avgTime = logsArray.reduce((sum: number, d: any) => sum + (d.response_time || 0), 0) / (total || 1);
        
        setStats({
          totalRequests: total,
          suspiciousRequests: suspicious,
          blockedRequests: blocked,
          avgResponseTime: parseFloat(avgTime.toFixed(2))
        });
      } catch (error) {
        console.error('Failed to fetch traffic data:', error);
        setTrafficData([]);
        setStats({
          totalRequests: 0,
          suspiciousRequests: 0,
          blockedRequests: 0,
          avgResponseTime: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrafficData();
    const interval = setInterval(fetchTrafficData, 5000);
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
            <h1 className="text-3xl font-bold mb-2">API Traffic Monitor</h1>
            <p className="text-gray-400">Real-time monitoring of all API requests and traffic patterns</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Requests</p>
                  <p className="text-3xl font-bold">{stats.totalRequests}</p>
                </div>
                <Activity className="text-blue-500" size={32} />
              </div>
            </div>

            <div className="bg-card border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Suspicious</p>
                  <p className="text-3xl font-bold text-yellow-500">{stats.suspiciousRequests}</p>
                </div>
                <AlertTriangle className="text-yellow-500" size={32} />
              </div>
            </div>

            <div className="bg-card border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Blocked</p>
                  <p className="text-3xl font-bold text-red-500">{stats.blockedRequests}</p>
                </div>
                <AlertTriangle className="text-red-500" size={32} />
              </div>
            </div>

            <div className="bg-card border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Avg Response Time</p>
                  <p className="text-2xl font-bold">{stats.avgResponseTime}ms</p>
                </div>
                <TrendingUp className="text-green-500" size={32} />
              </div>
            </div>
          </div>

          {/* Traffic Log */}
          <div className="bg-card border border-white/10 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold">Recent Traffic</h2>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">Loading traffic data...</div>
            ) : (
              <TrafficLog logs={Array.isArray(trafficData) ? trafficData.slice(0, 20) : []} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
