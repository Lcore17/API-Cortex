'use client';

import { 
  LayoutDashboard, 
  Activity, 
  ShieldAlert, 
  Terminal, 
  BarChart3, 
  Settings, 
  FileText, 
  Map, 
  Zap,
  Search,
  CheckCircle2
} from 'lucide-react';
import { usePathname } from 'next/navigation';

const menuItems = [
  { icon: LayoutDashboard, label: 'Overview', href: '/' },
  { icon: CheckCircle2, label: 'Security Features', href: '/features' },
  { icon: Activity, label: 'Traffic Monitor', href: '/traffic' },
  { icon: ShieldAlert, label: 'Threat Center', href: '/threats' },
  { icon: Zap, label: 'Attack Simulator', href: '/simulator' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics' },
  { icon: Search, label: 'AI Investigator', href: '/investigator' },
  { icon: Map, label: 'Vuln Mapping', href: '/mapping' },
  { icon: FileText, label: 'Reports', href: '/reports' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-white/10 flex flex-col h-[calc(100vh-64px)] bg-card/30 backdrop-blur-sm shrink-0">
      <div className="flex-1 py-6">
        <ul className="space-y-2 px-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.label}>
                <a
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${
                    isActive 
                      ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-foreground'
                  }`}
                >
                  <item.icon size={20} className={isActive ? 'text-accent-blue' : 'group-hover:text-accent-blue'} />
                  <span className="font-medium text-sm">{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="bg-accent-purple/10 rounded-xl p-4 border border-accent-purple/20">
          <p className="text-[10px] text-accent-purple font-bold uppercase tracking-wider mb-1">System Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success-green animate-pulse" />
            <span className="text-xs font-medium text-foreground">AI Core Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
