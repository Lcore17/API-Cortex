'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { 
  Activity, 
  Shield, 
  AlertTriangle, 
  Globe, 
  Target, 
  Eye, 
  Clock, 
  GitBranch, 
  BarChart3, 
  Zap,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface Feature {
  id: number;
  name: string;
  status: string;
  description: string;
}

const featureIcons: any = {
  1: Activity,
  2: Shield,
  3: AlertTriangle,
  4: Globe,
  5: Target,
  6: Eye,
  7: Clock,
  8: GitBranch,
  9: BarChart3,
  10: Zap
};

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [shadowApis, setShadowApis] = useState<any[]>([]);
  const [blockedIps, setBlockedIps] = useState<any[]>([]);

  useEffect(() => {
    // Fetch features status
    fetch('http://localhost:8000/api/features')
      .then(res => res.json())
      .then(data => {
        setFeatures(data.features);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching features:", err);
        setLoading(false);
      });

    // Fetch shadow APIs
    fetch('http://localhost:8000/api/shadow-apis')
      .then(res => res.json())
      .then(data => setShadowApis(data.shadow_apis || []))
      .catch(err => console.error("Error fetching shadow APIs:", err));

    // Fetch blocked IPs
    fetch('http://localhost:8000/api/blocked-ips')
      .then(res => res.json())
      .then(data => setBlockedIps(data.blocked_ips || []))
      .catch(err => console.error("Error fetching blocked IPs:", err));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="text-xl text-gray-400">Loading features...</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
              Security Features
            </h1>
            <p className="text-gray-400">All 10 advanced security features are active and protecting your APIs</p>
          </div>

          {/* Feature Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {features.map((feature) => {
              const Icon = featureIcons[feature.id];
              const isActive = feature.status === 'active';
              
              return (
                <div
                  key={feature.id}
                  className={`bg-card p-6 rounded-xl border ${
                    isActive ? 'border-success-green/30 glow-green' : 'border-alert-red/30'
                  } transition-all hover:scale-[1.02]`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      isActive ? 'bg-success-green/10 text-success-green' : 'bg-alert-red/10 text-alert-red'
                    }`}>
                      <Icon size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-white">{feature.name}</h3>
                        {isActive ? (
                          <CheckCircle2 size={20} className="text-success-green" />
                        ) : (
                          <XCircle size={20} className="text-alert-red" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{feature.description}</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          isActive ? 'bg-success-green/10 text-success-green' : 'bg-alert-red/10 text-alert-red'
                        }`}>
                          {isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                        <span className="text-xs text-gray-500">Feature #{feature.id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real-time Data Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shadow APIs Discovered */}
            <div className="bg-card p-6 rounded-xl border border-warning-yellow/30 glow-yellow">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="text-warning-yellow" size={24} />
                <h2 className="text-xl font-bold">Shadow APIs Discovered</h2>
              </div>
              {shadowApis.length === 0 ? (
                <p className="text-gray-400 text-sm">No shadow APIs detected yet</p>
              ) : (
                <div className="space-y-3">
                  {shadowApis.slice(0, 5).map((api, idx) => (
                    <div key={idx} className="p-3 bg-white/5 rounded-lg border border-warning-yellow/20">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm text-warning-yellow">{api.endpoint}</code>
                        <span className="text-xs px-2 py-1 rounded bg-alert-red/20 text-alert-red">
                          Risk: {api.risk_score}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Hits: {api.hit_count} | Unique IPs: {api.unique_ips}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Blocked IPs */}
            <div className="bg-card p-6 rounded-xl border border-alert-red/30 glow-red">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-alert-red" size={24} />
                <h2 className="text-xl font-bold">Blocked IPs (DDoS Protection)</h2>
              </div>
              {blockedIps.length === 0 ? (
                <p className="text-gray-400 text-sm">No IPs currently blocked</p>
              ) : (
                <div className="space-y-3">
                  {blockedIps.slice(0, 5).map((blocked, idx) => (
                    <div key={idx} className="p-3 bg-white/5 rounded-lg border border-alert-red/20">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm text-alert-red font-mono">{blocked.ip}</code>
                        <span className="text-xs px-2 py-1 rounded bg-warning-yellow/20 text-warning-yellow">
                          {blocked.remaining_seconds}s left
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">{blocked.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Feature Examples */}
          <div className="mt-8 bg-card p-6 rounded-xl border border-accent-blue/30 glow-blue">
            <h2 className="text-xl font-bold mb-4 text-accent-blue">Real-World Examples</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-bold text-sm mb-2 text-white">🔍 SQL Injection Detection</h3>
                <code className="text-xs text-gray-400 block">
                  /api/user?id=<span className="text-alert-red">5 OR 1=1</span> → BLOCKED
                </code>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-bold text-sm mb-2 text-white">🌍 Geolocation Threat</h3>
                <code className="text-xs text-gray-400 block">
                  User logged in from India → suddenly <span className="text-alert-red">Russia</span> → ALERT
                </code>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-bold text-sm mb-2 text-white">💥 DDoS Detection</h3>
                <code className="text-xs text-gray-400 block">
                  Traffic: 100 req/min → <span className="text-alert-red">5000 req/min</span> → RATE LIMITED
                </code>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-bold text-sm mb-2 text-white">🔗 API Dependency</h3>
                <code className="text-xs text-gray-400 block">
                  Auth API compromised → Alert <span className="text-warning-yellow">Payment API</span>
                </code>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
