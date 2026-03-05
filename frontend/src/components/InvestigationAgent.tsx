'use client';

import { Bot, Search, FileText, ArrowRight, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';

interface InvestigationAgentProps {
  threat: any;
}

export default function InvestigationAgent({ threat }: InvestigationAgentProps) {
  if (!threat || !threat.investigation) return (
    <div className="bg-card p-6 rounded-xl border border-white/10 h-full flex flex-col items-center justify-center text-center opacity-50">
      <Bot size={48} className="text-accent-blue mb-4" />
      <h3 className="text-lg font-bold mb-2">AI Investigation Agent</h3>
      <p className="text-sm text-gray-400 max-w-[250px]">Select a threat or trigger a simulation to see the AI agent in action.</p>
    </div>
  );

  const { investigation } = threat;

  return (
    <div className="bg-card p-6 rounded-xl border border-white/10 h-full overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4">
        <div className="w-12 h-12 bg-accent-blue/10 rounded-full flex items-center justify-center animate-pulse border border-accent-blue/20">
          <BrainCircuit className="text-accent-blue" />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Bot className="text-accent-blue" />
        <h3 className="text-lg font-bold">Autonomous AI Analysis</h3>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-xs font-bold text-accent-blue uppercase mb-2 flex items-center gap-2">
            <Search size={14} /> Investigation Log
          </h4>
          <div className="bg-black/40 p-4 rounded-lg border border-white/5 font-mono text-sm leading-relaxed text-gray-300">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            >
              {investigation.analysis}
            </motion.p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 p-3 rounded-lg border border-white/5">
            <h5 className="text-[10px] text-gray-500 font-bold uppercase mb-1">Root Cause</h5>
            <p className="text-sm font-medium text-foreground">{investigation.root_cause}</p>
          </div>
          <div className="bg-white/5 p-3 rounded-lg border border-white/5">
            <h5 className="text-[10px] text-gray-500 font-bold uppercase mb-1">Confidence</h5>
            <p className="text-sm font-medium text-success-green">{(investigation.confidence_score * 100).toFixed(0)}%</p>
          </div>
        </div>

        <div className="bg-accent-purple/10 border border-accent-purple/30 p-4 rounded-lg">
          <h5 className="text-xs font-bold text-accent-purple uppercase mb-2">Recommended Mitigation</h5>
          <p className="text-sm font-medium text-foreground mb-4">{investigation.recommended_action}</p>
          <button className="w-full bg-accent-purple hover:bg-accent-purple/80 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
            Deploy Patch <ArrowRight size={16} />
          </button>
        </div>

        <button className="flex items-center gap-2 text-xs text-gray-500 hover:text-accent-blue transition-colors">
          <FileText size={14} /> Export Detailed Security Report (PDF)
        </button>
      </div>
    </div>
  );
}
