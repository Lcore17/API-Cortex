'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import DashboardCharts from '@/components/DashboardCharts';
import { BarChart3, PieChart, LineChart } from 'lucide-react';

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState({
    hourlyRequests: [],
    riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
    topEndpoints: [],
    threatTypes: {}
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/logs');
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        const logs = Array.isArray(data) ? data : (data.logs || data.data || []);

        // Process hourly data
        const hourlyMap = new Map();
        logs.forEach((log: any) => {
          const hour = new Date(log.timestamp).getHours();
          hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
        });

        // Risk distribution
        let riskDist = { low: 0, medium: 0, high: 0, critical: 0 };
        logs.forEach((log: any) => {
          const score = log.risk_score || 0;
          if (score < 30) riskDist.low++;
          else if (score < 60) riskDist.medium++;
          else if (score < 80) riskDist.high++;
          else riskDist.critical++;
        });

        // Top endpoints
        const endpointMap = new Map();
        logs.forEach((log: any) => {
          endpointMap.set(log.endpoint, (endpointMap.get(log.endpoint) || 0) + 1);
        });
        const topEndpoints = Array.from(endpointMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([endpoint, count]) => ({ endpoint, count }));

        // Threat types
        const threatMap = new Map();
        logs.forEach((log: any) => {
          if (log.threat_type) {
            threatMap.set(log.threat_type, (threatMap.get(log.threat_type) || 0) + 1);
          }
        });

        setAnalyticsData({
          hourlyRequests: Array.from(hourlyMap.entries()).map(([hour, count]) => ({
            hour: `${hour}:00`,
            requests: count
          })),
          riskDistribution: riskDist,
          topEndpoints,
          threatTypes: Object.fromEntries(threatMap)
        });
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        setAnalyticsData({
          hourlyRequests: [],
          riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
          topEndpoints: [],
          threatTypes: {}
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto bg-gradient-to-br from-slate-950 to-slate-900">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
            <p className="text-gray-400">Comprehensive analysis of API security metrics and trends</p>
          </div>

          {isLoading ? (
            <div className="text-center text-gray-400 py-12">Loading analytics...</div>
          ) : (
            <>
              {/* Charts Section */}
              <DashboardCharts data={analyticsData.hourlyRequests || []} />

              {/* Risk Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="bg-card border border-white/10 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <PieChart className="text-purple-500 mr-2" size={24} />
                    <h3 className="text-lg font-bold">Risk Distribution</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-green-500">Low Risk</span>
                      <span className="font-bold">{analyticsData.riskDistribution.low}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-yellow-500">Medium Risk</span>
                      <span className="font-bold">{analyticsData.riskDistribution.medium}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-orange-500">High Risk</span>
                      <span className="font-bold">{analyticsData.riskDistribution.high}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-500">Critical</span>
                      <span className="font-bold">{analyticsData.riskDistribution.critical}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-white/10 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="text-blue-500 mr-2" size={24} />
                    <h3 className="text-lg font-bold">Top Endpoints</h3>
                  </div>
                  <div className="space-y-2">
                    {analyticsData.topEndpoints.map((ep, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm">{ep.endpoint}</span>
                        <span className="font-bold text-cyan-400">{ep.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Threat Types */}
              <div className="bg-card border border-white/10 rounded-lg p-6 mt-6">
                <div className="flex items-center mb-4">
                  <LineChart className="text-red-500 mr-2" size={24} />
                  <h3 className="text-lg font-bold">Threat Types Detected</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(analyticsData.threatTypes).map(([type, count]) => (
                    <div key={type} className="bg-slate-800 rounded p-4 text-center">
                      <p className="text-gray-400 text-sm mb-1">{type}</p>
                      <p className="text-2xl font-bold text-red-400">{count as number}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
