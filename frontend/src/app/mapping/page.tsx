'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { Network, Shield, AlertCircle } from 'lucide-react';

const VulnMapping = dynamic(() => import('@/components/VulnMapping'), { ssr: false });

interface ApiNode {
  name: string;
  endpoint: string;
  risk: number;
  criticality: number;
  request_count: number;
}

interface VulnerabilityItem {
  type: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
}

interface DependencyEdge {
  from: string;
  to: string;
  type: string;
}

interface MappingData {
  apis: ApiNode[];
  vulnerabilities: VulnerabilityItem[];
  dependencies: DependencyEdge[];
}

export default function MappingPage() {
  const [mappingData, setMappingData] = useState<MappingData>({
    apis: [],
    vulnerabilities: [],
    dependencies: []
  });
  const [selectedApi, setSelectedApi] = useState<ApiNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMapping = async () => {
      try {
        const [graphRes, logsRes] = await Promise.all([
          fetch('http://localhost:8000/api/dependency-graph'),
          fetch('http://localhost:8000/api/logs?limit=200')
        ]);

        const graphData = await graphRes.json();
        const logsData = await logsRes.json();

        const graph = graphData?.graph || {};
        const criticality = graphData?.criticality_scores || {};
        const logs = Array.isArray(logsData) ? logsData : [];

        const apiSet = new Set<string>(Object.keys(graph));
        Object.values(graph).forEach((targets: any) => {
          if (Array.isArray(targets)) {
            targets.forEach((target: string) => apiSet.add(target));
          }
        });

        const apis: ApiNode[] = Array.from(apiSet).map((endpoint) => {
          const endpointLogs = logs.filter((l: any) => l.endpoint === endpoint);
          const avgRisk = endpointLogs.length > 0
            ? Math.round(endpointLogs.reduce((sum: number, l: any) => sum + (l.risk_score || 0), 0) / endpointLogs.length)
            : 0;
          const baseRisk = Number(criticality[endpoint] || 40);
          return {
            name: endpoint,
            endpoint,
            risk: Math.round((baseRisk + avgRisk) / 2),
            criticality: baseRisk,
            request_count: endpointLogs.length
          };
        }).sort((a, b) => b.risk - a.risk);

        const dependencies: DependencyEdge[] = Object.entries(graph).flatMap(([from, targets]: [string, any]) =>
          (Array.isArray(targets) ? targets : []).map((to: string) => ({ from, to, type: 'call-chain' }))
        );

        const vulnMap = new Map<string, VulnerabilityItem>();
        logs
          .filter((l: any) => l.threat_type && l.threat_type !== 'None')
          .forEach((log: any) => {
            const type = log.threat_type || 'Unknown';
            const risk = log.risk_score || 0;
            const prev: VulnerabilityItem = vulnMap.get(type) || {
              type,
              count: 0,
              severity: risk >= 80 ? 'high' : risk >= 60 ? 'medium' : 'low'
            };
            prev.count += 1;
            if (risk >= 80) prev.severity = 'high';
            else if (risk >= 60 && prev.severity !== 'high') prev.severity = 'medium';
            vulnMap.set(type, prev);
          });

        const vulnerabilities = Array.from(vulnMap.values()).sort((a, b) => b.count - a.count);

        setMappingData({ apis, vulnerabilities, dependencies });
        setSelectedApi((prev) => {
          if (prev && apis.some((a) => a.endpoint === prev.endpoint)) {
            return apis.find((a) => a.endpoint === prev.endpoint) || apis[0] || null;
          }
          return apis[0] || null;
        });
      } catch (error) {
        console.error('Failed to fetch mapping:', error);
        setMappingData({ apis: [], vulnerabilities: [], dependencies: [] });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMapping();

    const pollInterval = setInterval(fetchMapping, 4000);
    const ws = new WebSocket('ws://localhost:8000/ws/traffic');
    ws.onmessage = () => fetchMapping();

    return () => {
      ws.close();
      clearInterval(pollInterval);
    };
  }, []);

  const selectedEndpoint = selectedApi?.endpoint || selectedApi?.name;
  const selectedDependencies = mappingData.dependencies.filter((d) => d.from === selectedEndpoint);
  const radarData = mappingData.vulnerabilities.slice(0, 6).map((v) => ({
    subject: v.type,
    score: Math.min(100, (v.count || 0) * (v.severity === 'high' ? 25 : v.severity === 'medium' ? 18 : 12)),
    fullMark: 100
  }));

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Vulnerability Mapping</h1>
            <p className="text-gray-400">Visualize API dependencies and vulnerability propagation paths</p>
          </div>

          {isLoading ? (
            <div className="text-center text-gray-400 py-12">Loading API map...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* APIs List */}
              <div className="lg:col-span-1">
                <div className="bg-card border border-white/10 rounded-lg overflow-hidden">
                  <div className="p-6 border-b border-white/10">
                    <h3 className="text-lg font-bold flex items-center">
                      <Network className="mr-2 text-cyan-500" size={20} />
                      APIs
                    </h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {mappingData.apis.map((api, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedApi(api)}
                        className={`p-4 border-b border-white/5 cursor-pointer hover:bg-slate-800/50 transition ${
                          selectedApi?.name === api.name ? 'bg-slate-800/70 border-l-2 border-l-cyan-500' : ''
                        }`}
                      >
                        <p className="font-semibold text-sm truncate">{api.endpoint || api.name}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-gray-400">Risk Score</span>
                          <span
                            className={`text-xs font-bold ${
                              api.risk > 80
                                ? 'text-red-400'
                                : api.risk > 50
                                ? 'text-orange-400'
                                : 'text-yellow-400'
                            }`}
                          >
                            {api.risk}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3">
                {selectedApi ? (
                  <div className="space-y-6">
                    {/* API Details */}
                    <div className="bg-card border border-white/10 rounded-lg p-6">
                      <h3 className="text-xl font-bold mb-4">API Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-400 text-sm mb-1">Endpoint</p>
                          <p className="font-mono text-sm text-cyan-400">{selectedApi.endpoint || selectedApi.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm mb-1">Risk Score</p>
                          <p
                            className={`text-2xl font-bold ${
                              selectedApi.risk > 80
                                ? 'text-red-400'
                                : selectedApi.risk > 50
                                ? 'text-orange-400'
                                : 'text-yellow-400'
                            }`}
                          >
                            {selectedApi.risk}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Vulnerability Radar */}
                    <VulnMapping
                      title={`Threat Pattern Map ${selectedEndpoint ? `- ${selectedEndpoint}` : ''}`}
                      data={radarData.length > 0 ? radarData : undefined}
                    />

                    {/* Vulnerabilities */}
                    <div className="bg-card border border-white/10 rounded-lg p-6">
                      <h3 className="text-lg font-bold flex items-center mb-4">
                        <AlertCircle className="mr-2 text-red-500" size={20} />
                        Vulnerabilities
                      </h3>
                      <div className="space-y-3">
                        {mappingData.vulnerabilities.length > 0 ? mappingData.vulnerabilities.map((vuln, idx) => (
                          <div key={idx} className="flex items-start justify-between p-3 bg-slate-800/50 rounded">
                            <div>
                              <p className="font-semibold text-sm">{vuln.type}</p>
                              <p className="text-xs text-gray-400">
                                <span
                                  className={`px-2 py-1 rounded ${
                                    vuln.severity === 'high'
                                      ? 'bg-red-500/20 text-red-400'
                                      : vuln.severity === 'medium'
                                      ? 'bg-yellow-500/20 text-yellow-400'
                                      : 'bg-green-500/20 text-green-400'
                                  }`}
                                >
                                  {vuln.severity}
                                </span>
                              </p>
                            </div>
                            <span className="text-sm font-bold text-red-400">{vuln.count}</span>
                          </div>
                        )) : (
                          <p className="text-gray-400 text-sm text-center py-4">No vulnerabilities detected yet</p>
                        )}
                      </div>
                    </div>

                    {/* Dependencies */}
                    <div className="bg-card border border-white/10 rounded-lg p-6">
                      <h3 className="text-lg font-bold flex items-center mb-4">
                        <Shield className="mr-2 text-blue-500" size={20} />
                        Dependencies
                      </h3>
                      <div className="space-y-3">
                        {selectedDependencies.map((dep, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                              <p className="font-mono text-xs text-cyan-400">{dep.to}</p>
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">{dep.type}</span>
                            </div>
                          ))}
                        {selectedDependencies.length === 0 && (
                          <p className="text-gray-400 text-sm text-center py-4">No dependencies found</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-card border border-white/10 rounded-lg p-12 text-center">
                    <Network className="mx-auto mb-4 text-gray-600" size={48} />
                    <p className="text-gray-400">Select an API to view details</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
