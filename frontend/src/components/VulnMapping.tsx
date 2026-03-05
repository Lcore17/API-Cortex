'use client';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const data = [
  { subject: 'Injection', A: 120, fullMark: 150 },
  { subject: 'Auth', A: 98, fullMark: 150 },
  { subject: 'Data Exposure', A: 86, fullMark: 150 },
  { subject: 'Rate Limiting', A: 99, fullMark: 150 },
  { subject: 'Mass Assignment', A: 85, fullMark: 150 },
  { subject: 'Security Config', A: 65, fullMark: 150 },
];

export default function VulnMapping() {
  return (
    <div className="bg-card p-6 rounded-xl border border-white/10 h-full">
      <h3 className="text-sm font-semibold mb-6 text-gray-400 uppercase tracking-wider">Vulnerability Mapping</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#ffffff10" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <PolarRadiusAxis hide />
            <Radar
              name="Threats"
              dataKey="A"
              stroke="#7A5CFF"
              fill="#7A5CFF"
              fillOpacity={0.6}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
