'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import VulnMapping from '@/components/VulnMapping';
import { Network, Shield, AlertCircle } from 'lucide-react';

export default function MappingPage() {
  const [mappingData, setMappingData] = useState({
    apis: [],
    vulnerabilities: [],
    dependencies: []
  });
  const [selectedApi, setSelectedApi] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMapping = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/api-map');
        const data = await response.json();
        
        // Parse API and vulnerability data
        const apis = data.apis || [];
        const vulns = data.vulnerabilities || [];
        const deps = data.dependencies || [];

        setMappingData({ apis, vulnerabilities: vulns, dependencies: deps });
        if (apis.length > 0) setSelectedApi(apis[0]);
      } catch (error) {
        console.error('Failed to fetch mapping:', error);
        // Use mock data for demo
        setMappingData({
          apis: [
            { name: '/api/login', risk: 45, endpoint: '/api/login' },
            { name: '/api/payment', risk: 92, endpoint: '/api/payment' },
            { name: '/api/users', risk: 60, endpoint: '/api/users' },
            { name: '/api/admin', risk: 85, endpoint: '/api/admin' }
          ],
          vulnerabilities: [
            { type: 'SQL Injection', count: 3, severity: 'high' },
            { type: 'XSS', count: 2, severity: 'medium' },
            { type: 'CSRF', count: 1, severity: 'medium' }
          ],
          dependencies: [
            { from: '/api/login', to: '/api/users', type: 'auth' },
            { from: '/api/payment', to: '/api/admin', type: 'audit' }
          ]
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMapping();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto bg-gradient-to-br from-slate-950 to-slate-900">
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

                    {/* Vulnerabilities */}
                    <div className="bg-card border border-white/10 rounded-lg p-6">
                      <h3 className="text-lg font-bold flex items-center mb-4">
                        <AlertCircle className="mr-2 text-red-500" size={20} />
                        Vulnerabilities
                      </h3>
                      <div className="space-y-3">
                        {mappingData.vulnerabilities.map((vuln, idx) => (
                          <div key={idx} className="flex items-start justify-between p-3 bg-slate-800/50 rounded">
                            <div>
                              <p className="font-semibold text-sm">{vuln.type}</p>
                              <p className="text-xs text-gray-400">
                                <span
                                  className={`px-2 py-1 rounded ${
                                    vuln.severity === 'high'
                                      ? 'bg-red-500/20 text-red-400'
                                      : 'bg-yellow-500/20 text-yellow-400'
                                  }`}
                                >
                                  {vuln.severity}
                                </span>
                              </p>
                            </div>
                            <span className="text-sm font-bold text-red-400">{vuln.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dependencies */}
                    <div className="bg-card border border-white/10 rounded-lg p-6">
                      <h3 className="text-lg font-bold flex items-center mb-4">
                        <Shield className="mr-2 text-blue-500" size={20} />
                        Dependencies
                      </h3>
                      <div className="space-y-3">
                        {mappingData.dependencies
                          .filter(d => d.from === (selectedApi.endpoint || selectedApi.name))
                          .map((dep, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                              <p className="font-mono text-xs text-cyan-400">{dep.to}</p>
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">{dep.type}</span>
                            </div>
                          ))}
                        {mappingData.dependencies.filter(d => d.from === (selectedApi.endpoint || selectedApi.name))
                          .length === 0 && (
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
