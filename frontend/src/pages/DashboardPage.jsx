import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Flame, 
  MessageSquare, 
  CalendarCheck, 
  TrendingUp, 
  Sparkles, 
  ArrowUpRight, 
  Clock, 
  Mail, 
  Phone, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { getDashboardStats } from '../api';

export default function DashboardPage({ onNavigateToAgent, onBookSlot }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-purple-700 text-sm font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Querying MongoDB real-time collections...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total Leads',
      value: stats?.total_leads ?? 0,
      sub: 'Captured via voice & chat',
      icon: Users,
      color: 'from-purple-600 to-indigo-600',
      badge: '+100% Real DB'
    },
    {
      label: 'Hot Leads',
      value: stats?.hot_leads ?? 0,
      sub: 'Score >= 70 points',
      icon: Flame,
      color: 'from-rose-500 to-orange-500',
      badge: 'High Intent'
    },
    {
      label: 'Total Conversations',
      value: stats?.total_conversations ?? 0,
      sub: 'Autonomous agent sessions',
      icon: MessageSquare,
      color: 'from-blue-600 to-cyan-600',
      badge: 'Interactive'
    },
    {
      label: 'Total Appointments',
      value: stats?.total_appointments ?? 0,
      sub: 'Confirmed counseling slots',
      icon: CalendarCheck,
      color: 'from-emerald-600 to-teal-600',
      badge: 'Scheduled'
    }
  ];

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8 overflow-y-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-semibold mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            Autonomous AI Sales Pipeline
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            VoxSales Intelligence Dashboard
          </h2>
          <p className="text-purple-200/80 text-xs md:text-sm mt-2 leading-relaxed">
            All statistics, qualification scores, and booking records below are queried dynamically from actual MongoDB database collections. Zero mock or hardcoded statistics.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            onClick={fetchStats}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center gap-2 border border-white/20 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Stats</span>
          </button>
          <button
            onClick={onNavigateToAgent}
            className="px-5 py-2.5 rounded-xl bg-white text-purple-900 hover:bg-purple-50 font-bold text-xs flex items-center gap-2 shadow-lg shadow-black/20 transition cursor-pointer"
          >
            <span>Start Voice Conversation</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={idx}
              className="bg-white rounded-3xl p-6 border border-purple-100 shadow-md hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${kpi.color} flex items-center justify-center text-white shadow-md`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                  {kpi.badge}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{kpi.value}</h3>
                <p className="text-[11px] text-slate-400 font-medium">{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Timeline Chart (Left 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-purple-100 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  Conversation & Lead Activity (Last 7 Days)
                </h3>
                <p className="text-xs text-slate-500">Continuous MongoDB pipeline tracking across the week</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-purple-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Leads Captured
                </span>
                <span className="flex items-center gap-1.5 text-indigo-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span> AI Conversations
                </span>
              </div>
            </div>

            {/* Structured Bar Chart with Guidelines & Grounded Baseline */}
            <div className="w-full pt-2 pb-1">
              <div className="relative w-full h-48 flex flex-col justify-between">
                {/* Horizontal Background Dotted Guide Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7">
                  <div className="border-b border-dashed border-slate-200/70 w-full flex justify-between">
                    <span className="text-[10px] font-medium text-slate-400 bg-white px-1 -translate-y-1/2">20</span>
                  </div>
                  <div className="border-b border-dashed border-slate-200/70 w-full flex justify-between">
                    <span className="text-[10px] font-medium text-slate-400 bg-white px-1 -translate-y-1/2">10</span>
                  </div>
                  <div className="border-b border-dashed border-slate-200/70 w-full flex justify-between">
                    <span className="text-[10px] font-medium text-slate-400 bg-white px-1 -translate-y-1/2">5</span>
                  </div>
                  <div className="border-b border-slate-300 w-full flex justify-between">
                    <span className="text-[10px] font-semibold text-slate-400 bg-white px-1 -translate-y-1/2">0</span>
                  </div>
                </div>

                {/* Bars & Column Days */}
                <div className="relative z-10 h-full w-full flex items-end justify-between gap-2 sm:gap-4 px-4 pb-7">
                  {(stats?.activity_timeline || []).map((dayData, i) => {
                    const maxVal = Math.max(20, ...stats.activity_timeline.map(d => Math.max(d.leads, d.conversations)));
                    const leadPct = dayData.leads > 0 ? Math.min(85, Math.max(8, Math.round((dayData.leads / maxVal) * 85))) : 0;
                    const convPct = dayData.conversations > 0 ? Math.min(95, Math.max(8, Math.round((dayData.conversations / maxVal) * 85))) : 0;

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                          {/* Leads bar */}
                          <div 
                            style={{ height: `${leadPct}%` }}
                            className="w-3.5 sm:w-4.5 bg-purple-600 rounded-t-md transition-all duration-300 group-hover:bg-purple-700 relative shadow-sm"
                          >
                            <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-purple-900 text-white px-2 py-0.5 rounded shadow z-20 whitespace-nowrap transition pointer-events-none">
                              {dayData.leads} Leads
                            </span>
                          </div>
                          {/* Conversations bar */}
                          <div 
                            style={{ height: `${convPct}%` }}
                            className="w-3.5 sm:w-4.5 bg-indigo-300 rounded-t-md transition-all duration-300 group-hover:bg-indigo-400 relative shadow-sm"
                          >
                            <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-indigo-900 text-white px-2 py-0.5 rounded shadow z-20 whitespace-nowrap transition pointer-events-none">
                              {dayData.conversations} Convs
                            </span>
                          </div>
                        </div>
                        {/* Day Label placed cleanly at baseline */}
                        <div className="absolute -bottom-6 w-full text-center">
                          <span className="text-[11px] font-bold text-slate-600 group-hover:text-purple-700 transition">
                            {dayData.day}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Dynamic daily pipeline updates from MongoDB</span>
            <span className="font-semibold text-purple-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Synced
            </span>
          </div>
        </div>

        {/* Course Distribution (Right 1 col) */}
        <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-md flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              Course Interest Breakdown
            </h3>
            <p className="text-xs text-slate-500 mb-4">Lead preference across top cohort bootcamps</p>

            <div className="space-y-3">
              {stats?.course_distribution?.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  No leads recorded yet. Try starting a voice conversation!
                </p>
              ) : (
                stats?.course_distribution?.slice(0, 5).map((item, idx) => {
                  const total = stats.total_leads || 1;
                  const pct = Math.round((item.count / total) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700 truncate max-w-[180px]">
                          {item.course}
                        </span>
                        <span className="font-bold text-purple-700">{item.count} leads ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-50">
            <button
              onClick={onNavigateToAgent}
              className="w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold text-xs transition cursor-pointer text-center block"
            >
              Test Voice Interaction & Boost Stats
            </button>
          </div>
        </div>
      </div>

      {/* Recent Leads Table */}
      <div className="bg-white rounded-3xl border border-purple-100 shadow-md overflow-hidden">
        <div className="p-6 border-b border-purple-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">Recent Qualified Leads</h3>
            <p className="text-xs text-slate-500">Live leads captured and scored by VoxSales AI</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-100 text-purple-800">
            {stats?.recent_leads?.length || 0} Recent Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-purple-50">
              <tr>
                <th className="px-6 py-3.5">Candidate Name</th>
                <th className="px-6 py-3.5">Contact Details</th>
                <th className="px-6 py-3.5">Interested Course</th>
                <th className="px-6 py-3.5">Lead Score</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Sentiment</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 text-slate-700">
              {stats?.recent_leads?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                    No leads recorded in MongoDB yet.
                  </td>
                </tr>
              ) : (
                stats?.recent_leads?.map((lead, i) => {
                  const displayName = lead.name || 'Candidate';
                  const displayEmail = lead.email || '—';
                  const displayPhone = lead.phone || '—';

                  return (
                    <tr key={lead.id} className="hover:bg-purple-50/40 transition">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {displayName}
                      </td>
                      <td className="px-6 py-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="w-3 h-3 text-purple-500" />
                          <span>{displayEmail}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="w-3 h-3 text-purple-500" />
                          <span>{displayPhone}</span>
                        </div>
                      </td>
                    <td className="px-6 py-4 font-medium text-purple-950">
                      {lead.interested_course || 'General Consultation'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-extrabold text-sm text-purple-700">
                        {lead.lead_score ?? 10}
                      </span>
                      <span className="text-[10px] text-slate-400"> /100</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                        lead.lead_category === 'Hot'
                          ? 'bg-rose-100 text-rose-800'
                          : lead.lead_category === 'Warm'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                      }`}>
                        {lead.lead_category || 'Cold'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        lead.sentiment === 'Positive'
                          ? 'bg-emerald-100 text-emerald-800'
                          : lead.sentiment === 'Negative'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-700'
                      }`}>
                        {lead.sentiment || 'Neutral'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onBookSlot({
                          customer_name: displayName,
                          email: displayEmail,
                          phone: displayPhone,
                          course: lead.interested_course
                        })}
                        className="px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold text-[11px] transition cursor-pointer"
                      >
                        Book Slot
                      </button>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
