import React from 'react';
import { 
  LayoutDashboard, 
  Mic, 
  Users, 
  CalendarCheck, 
  BookOpen, 
  PhoneCall,
  BarChart3,
  Network,
  Settings,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'agent', label: 'AI Voice Agent', icon: Mic, badge: 'Live AI' },
    { id: 'leads', label: 'Leads & CRM', icon: Users },
    { id: 'appointments', label: 'Appointments', icon: CalendarCheck },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, badge: 'RAG' },
    { id: 'history', label: 'Call History', icon: PhoneCall },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'architecture', label: 'System Architecture', icon: Network },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0a1120] text-white flex flex-col justify-between shrink-0 shadow-2xl border-r border-slate-800/80 select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-tight flex items-center gap-1.5">
                VoxSales <span className="text-cyan-400 font-extrabold text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60">AI</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">Fortivex Tech Education</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#15233e] text-cyan-300 font-semibold shadow-inner border border-cyan-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive 
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
