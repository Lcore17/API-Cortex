'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { Save, RotateCcw, Server, AlertTriangle, Clock } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    apiServer: 'http://localhost:8000',
    wsServer: 'ws://localhost:8000',
    threatCriticalThreshold: 90,
    threatHighThreshold: 70,
    threatMediumThreshold: 30,
    autoRefreshInterval: 5,
    logsDisplayLimit: 50,
  });

  const [saved, setSaved] = useState(false);

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    localStorage.setItem('cortex_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    const defaults = {
      apiServer: 'http://localhost:8000',
      wsServer: 'ws://localhost:8000',
      threatCriticalThreshold: 90,
      threatHighThreshold: 70,
      threatMediumThreshold: 30,
      autoRefreshInterval: 5,
      logsDisplayLimit: 50,
    };
    setSettings(defaults);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Settings</h1>
              <p className="text-gray-400">Configure Cortex API Monitoring and threat detection parameters</p>
            </div>

            {/* Success Message */}
            {saved && (
              <div className="mb-6 p-4 bg-success-green/20 border border-success-green rounded-lg text-success-green text-sm font-medium">
                ✓ Settings saved successfully
              </div>
            )}

            {/* Server Configuration */}
            <div className="bg-card p-6 rounded-xl border border-white/10 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Server size={20} className="text-accent-blue" />
                <h2 className="text-lg font-bold">Server Configuration</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-2">API Server URL</label>
                  <input
                    type="text"
                    value={settings.apiServer}
                    onChange={(e) => handleChange('apiServer', e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-blue"
                    placeholder="http://localhost:8000"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-2">WebSocket Server URL</label>
                  <input
                    type="text"
                    value={settings.wsServer}
                    onChange={(e) => handleChange('wsServer', e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-blue"
                    placeholder="ws://localhost:8000"
                  />
                </div>
              </div>
            </div>

            {/* Threat Detection Thresholds */}
            <div className="bg-card p-6 rounded-xl border border-white/10 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-alert-red" />
                <h2 className="text-lg font-bold">Threat Detection Thresholds</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-2">Critical Risk threshold</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.threatCriticalThreshold}
                      onChange={(e) => handleChange('threatCriticalThreshold', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-alert-red"
                    />
                    <span className="text-xs text-gray-500">≥ {settings.threatCriticalThreshold}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-2">High Risk threshold</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.threatHighThreshold}
                      onChange={(e) => handleChange('threatHighThreshold', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-warning-yellow"
                    />
                    <span className="text-xs text-gray-500">≥ {settings.threatHighThreshold}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-2">Medium Risk threshold</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.threatMediumThreshold}
                      onChange={(e) => handleChange('threatMediumThreshold', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-warning-yellow"
                    />
                    <span className="text-xs text-gray-500">≥ {settings.threatMediumThreshold}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Monitoring Settings */}
            <div className="bg-card p-6 rounded-xl border border-white/10 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={20} className="text-success-green" />
                <h2 className="text-lg font-bold">Monitoring Settings</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-2">Auto-Refresh Interval (seconds)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={settings.autoRefreshInterval}
                      onChange={(e) => handleChange('autoRefreshInterval', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-blue"
                    />
                    <span className="text-xs text-gray-500">every {settings.autoRefreshInterval}s</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-2">Traffic Logs Display Limit</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="10"
                      max="500"
                      step="10"
                      value={settings.logsDisplayLimit}
                      onChange={(e) => handleChange('logsDisplayLimit', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-blue"
                    />
                    <span className="text-xs text-gray-500">last {settings.logsDisplayLimit}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 font-medium transition-colors"
              >
                <RotateCcw size={16} />
                Reset to Defaults
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-accent-blue hover:bg-accent-blue/80 rounded-lg text-white font-medium transition-colors"
              >
                <Save size={16} />
                Save Settings
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
