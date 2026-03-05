'use client';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface ChartsProps {
  data: any[];
}

export default function DashboardCharts({ data = [] }: ChartsProps) {
  // Ensure data is an array and has the right structure
  const safeData = Array.isArray(data) ? data : [];
  
  // Process data for charts
  const chartData = safeData.slice(-20).map((log, idx) => ({
    name: idx,
    latency: log.response_time || log.requests || 0,
    risk: log.risk_score || 50,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-card p-6 rounded-xl border border-white/10 glow-blue">
        <h3 className="text-sm font-semibold mb-4 text-gray-400 uppercase tracking-wider">Request Latency (ms)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E0FF" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00E0FF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" hide />
              <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#121826', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#00E0FF' }}
              />
              <Area type="monotone" dataKey="latency" stroke="#00E0FF" fillOpacity={1} fill="url(#colorLatency)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card p-6 rounded-xl border border-white/10 glow-purple">
        <h3 className="text-sm font-semibold mb-4 text-gray-400 uppercase tracking-wider">Anomaly Risk Profile</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" hide />
              <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#121826', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar 
                dataKey="risk" 
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.risk > 70 ? '#FF4D4D' : entry.risk > 30 ? '#FFC857' : '#7A5CFF'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
