'use client';

import { motion } from 'framer-motion';

interface TimelineProps {
  threats: any[];
}

export default function ThreatTimeline({ threats }: TimelineProps) {
  const events = threats.slice(0, 5).map((t, i) => ({
    id: i,
    time: new Date(t.timestamp).toLocaleTimeString(),
    title: t.threat_type,
    description: `Detection from ${t.ip}`,
    status: 'Flagged'
  }));

  if (events.length === 0) return null;

  return (
    <div className="bg-card p-6 rounded-xl border border-white/10 mt-6">
      <h3 className="text-sm font-semibold mb-6 text-gray-400 uppercase tracking-wider">Interactive Threat Timeline</h3>
      <div className="relative border-l border-white/10 ml-3 space-y-8">
        {events.map((event, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="relative pl-8"
          >
            <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-accent-purple shadow-[0_0_8px_#7A5CFF]" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-accent-purple font-mono mb-1">{event.time}</p>
                <h4 className="text-sm font-bold text-foreground">{event.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{event.description}</p>
              </div>
              <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400 uppercase font-bold">
                {event.status}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
