'use client';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface VulnMappingPoint {
  subject: string;
  score: number;
  fullMark: number;
}

interface VulnMappingProps {
  data?: VulnMappingPoint[];
  title?: string;
}

const defaultData: VulnMappingPoint[] = [
  { subject: 'SQL Injection', score: 0, fullMark: 100 },
  { subject: 'DDoS', score: 0, fullMark: 100 },
  { subject: 'Brute Force', score: 0, fullMark: 100 },
  { subject: 'Geo Threat', score: 0, fullMark: 100 },
  { subject: 'Shadow API', score: 0, fullMark: 100 },
];

export default function VulnMapping({ data = defaultData, title = 'Vulnerability Mapping' }: VulnMappingProps) {
  return (
    <div className="bg-card p-6 rounded-xl border border-white/10 h-full">
      <h3 className="text-sm font-semibold mb-6 text-gray-400 uppercase tracking-wider">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#ffffff10" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <PolarRadiusAxis hide />
            <Radar
              name="Threats"
              dataKey="score"
              stroke="#06b6d4"
              fill="#06b6d4"
              fillOpacity={0.6}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
