'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { Settings, Save, Bell, Shield, Lock, Database } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    enableNotifications: true,
    threatSensitivity: 'high',
    autoResponse: true,
    dataRetention: 90,
    apiTimeout: 30,
    maxRiskScore: 100
  });

  const [saved, setSaved] = useState(false);

  const handleToggle = (key: string) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto bg-gradient-to-br from-slate-950 to-slate-900">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-gray-400">Configure API Cortex security settings and preferences</p>
          </div>

          <div className="max-w-4xl">
            {/* Success Message */}
            {saved && (
              <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 flex items-center">
                <Save size={20} className="mr-2" />
                Settings saved successfully!
              </div>
            )}

            {/* General Settings */}
            <div className="bg-card border border-white/10 rounded-lg overflow-hidden mb-6">
              <div className="p-6 border-b border-white/10 flex items-center">
                <Settings className="text-cyan-500 mr-2" size={24} />
                <h2 className="text-xl font-bold">General Settings</h2>
              </div>

              <div className="p-6 space-y-6">
                {/* Notifications */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Bell className="text-yellow-500 mr-3" size={20} />
                    <div>
                      <p className="font-semibold">Enable Notifications</p>
                      <p className="text-sm text-gray-400">Receive alerts for new threats</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle('enableNotifications')}
                    className={`relative inline-flex h-8 w-14 rounded-full transition ${
                      settings.enableNotifications ? 'bg-cyan-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                        settings.enableNotifications ? 'translate-x-7' : 'translate-x-1'
                      } mt-1`}
                    />
                  </button>
                </div>

                {/* Threat Sensitivity */}
                <div>
                  <div className="flex items-center mb-3">
                    <Shield className="text-red-500 mr-2" size={20} />
                    <p className="font-semibold">Threat Sensitivity Level</p>
                  </div>
                  <select
                    value={settings.threatSensitivity}
                    onChange={(e) => handleChange('threatSensitivity', e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="low">Low (Only Critical Threats)</option>
                    <option value="medium">Medium (High & Critical)</option>
                    <option value="high">High (All Threats)</option>
                  </select>
                </div>

                {/* Auto Response */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Lock className="text-blue-500 mr-3" size={20} />
                    <div>
                      <p className="font-semibold">Autonomous Threat Response</p>
                      <p className="text-sm text-gray-400">Automatically block detected threats</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle('autoResponse')}
                    className={`relative inline-flex h-8 w-14 rounded-full transition ${
                      settings.autoResponse ? 'bg-cyan-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                        settings.autoResponse ? 'translate-x-7' : 'translate-x-1'
                      } mt-1`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Data Settings */}
            <div className="bg-card border border-white/10 rounded-lg overflow-hidden mb-6">
              <div className="p-6 border-b border-white/10 flex items-center">
                <Database className="text-green-500 mr-2" size={24} />
                <h2 className="text-xl font-bold">Data Management</h2>
              </div>

              <div className="p-6 space-y-6">
                {/* Data Retention */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">Data Retention Period (Days)</p>
                    <span className="text-cyan-400 font-bold">{settings.dataRetention}</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="365"
                    value={settings.dataRetention}
                    onChange={(e) => handleChange('dataRetention', parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-xs text-gray-400 mt-1">Keep logs for {settings.dataRetention} days</p>
                </div>

                {/* API Timeout */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">API Timeout (Seconds)</p>
                    <span className="text-cyan-400 font-bold">{settings.apiTimeout}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="180"
                    value={settings.apiTimeout}
                    onChange={(e) => handleChange('apiTimeout', parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-xs text-gray-400 mt-1">Timeout after {settings.apiTimeout} seconds</p>
                </div>

                {/* Max Risk Score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">Maximum Risk Score Threshold</p>
                    <span className="text-red-400 font-bold">{settings.maxRiskScore}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.maxRiskScore}
                    onChange={(e) => handleChange('maxRiskScore', parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-xs text-gray-400 mt-1">Flag requests with scores above {settings.maxRiskScore}</p>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-card border border-white/10 rounded-lg overflow-hidden mb-6">
              <div className="p-6 border-b border-white/10 flex items-center">
                <Shield className="text-purple-500 mr-2" size={24} />
                <h2 className="text-xl font-bold">Security Policies</h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-slate-800/50 rounded p-4">
                  <p className="font-semibold mb-2">Active Policies</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      <span>SQL Injection Detection - ENABLED</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      <span>DDoS Protection - ENABLED</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      <span>Geolocation Blocking - ENABLED</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      <span>Rate Limiting - ENABLED</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded transition flex items-center"
              >
                <Save size={20} className="mr-2" />
                Save Settings
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
