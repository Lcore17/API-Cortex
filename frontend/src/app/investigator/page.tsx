'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import InvestigationAgent from '@/components/InvestigationAgent';
import { Search, Microscope, Zap } from 'lucide-react';

export default function InvestigatorPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchInvestigations = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/threats');
        if (!response.ok) throw new Error('API Error');
        const responseData = await response.json();
        const data = Array.isArray(responseData) ? responseData : (responseData.threats || responseData.data || []);
        setInvestigations(data.slice(0, 10));
      } catch (error) {
        console.error('Failed to fetch investigations:', error);
        setInvestigations([]);
      }
    };

    fetchInvestigations();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/investigate?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Investigation failed');
      const responseData = await response.json();
      const data = Array.isArray(responseData) ? responseData[0] : responseData;
      setSelectedInvestigation(data);
    } catch (error) {
      console.error('Investigation failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const startAutoInvestigation = async (threatId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/auto-investigate/${threatId}`, {
        method: 'POST'
      });
      const data = await response.json();
      setSelectedInvestigation(data);
    } catch (error) {
      console.error('Auto investigation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto bg-gradient-to-br from-slate-950 to-slate-900">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">AI Investigator</h1>
            <p className="text-gray-400">Autonomous AI-powered threat investigation and analysis</p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by IP, endpoint, or threat type..."
                className="w-full bg-card border border-white/10 rounded-lg px-4 py-3 pl-12 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
              />
              <Search className="absolute left-4 top-3.5 text-gray-500" size={20} />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="absolute right-2 top-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white px-4 py-1.5 rounded transition"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Threats List */}
            <div className="lg:col-span-1 bg-card border border-white/10 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h3 className="text-lg font-bold flex items-center">
                  <Microscope className="mr-2" size={20} />
                  Recent Threats
                </h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {investigations.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">No threats to investigate</div>
                ) : (
                  investigations.map((threat, idx) => (
                    <div
                      key={idx}
                      className={`p-4 border-b border-white/5 cursor-pointer hover:bg-slate-800/50 transition ${
                        selectedInvestigation?.id === threat.id ? 'bg-slate-800/70' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{threat.threat_type}</p>
                          <p className="text-xs text-gray-400">{threat.ip}</p>
                        </div>
                        <button
                          onClick={() => startAutoInvestigation(threat.id)}
                          disabled={isLoading}
                          className="ml-2 bg-cyan-600/50 hover:bg-cyan-600 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs transition"
                        >
                          {isLoading ? 'Investigating...' : 'Analyze'}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">Score: {threat.risk_score}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Investigation Details */}
            <div className="lg:col-span-2">
              {selectedInvestigation ? (
                <InvestigationAgent data={selectedInvestigation} />
              ) : isLoading ? (
                <div className="bg-card border border-white/10 rounded-lg p-12 text-center">
                  <div className="animate-pulse flex flex-col items-center">
                    <Zap className="text-cyan-500 mb-4" size={48} />
                    <p className="text-gray-300 font-semibold">Investigating threat...</p>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-white/10 rounded-lg p-12 text-center">
                  <Microscope className="mx-auto mb-4 text-gray-600" size={48} />
                  <p className="text-gray-400">Select a threat or search to begin investigation</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
