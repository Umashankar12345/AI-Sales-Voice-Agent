import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Flame, 
  CalendarCheck, 
  MessageSquare, 
  Sparkles,
  PieChart,
  Award
} from 'lucide-react';
import { getDashboardStats } from '../api';

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const totalLeads = stats?.total_leads || 0;
  const hotLeads = stats?.hot_leads || 0;
  const warmLeads = stats?.warm_leads || 0;
  const coldLeads = stats?.cold_leads || 0;
  const totalAppointments = stats?.total_appointments || 0;
  const totalConvs = stats?.total_conversations || 0;

  const conversionRate = totalLeads > 0 
    ? ((totalAppointments / totalLeads) * 100).toFixed(1) 
    : '0.0';

  const palette = ['bg-indigo-500', 'bg-cyan-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500'];
  const rawDist = stats?.course_distribution || [];
  const distTotal = rawDist.reduce((acc, item) => acc + (item.count || 0), 0);
  const courses = rawDist.map((item, idx) => ({
    name: item.course || 'General',
    count: item.count || 0,
    pct: distTotal > 0 ? Math.round(((item.count || 0) / distTotal) * 100) : 0,
    color: palette[idx % palette.length],
  }));

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          <span>Sales & Conversation Analytics</span>
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Real-time MongoDB conversion metrics, lead qualification distribution, and performance KPIs.
        </p>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Total Pipeline Leads</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalLeads}</h3>
            <span className="text-[10px] text-emerald-600 font-bold">100% captured from voice/chat</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Hot Lead Ratio</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{hotLeads}</h3>
            <span className="text-[10px] text-rose-500 font-bold">Score &ge; 70 (High Intent)</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Counseling Bookings</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{totalAppointments}</h3>
            <span className="text-[10px] text-emerald-600 font-bold">{conversionRate}% conversion rate</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">AI Consultations</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalConvs}</h3>
            <span className="text-[10px] text-cyan-600 font-bold">Avg. 3.2 turns/session</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2-Column Section: Lead Funnel & Course Popularity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Lead Funnel */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span>Lead Qualification Funnel</span>
          </h3>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>1. Total Captured Prospects</span>
                <span>{totalLeads} (100%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-800 rounded-full w-full"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-amber-700 mb-1">
                <span>2. Warm Prospects (Score &ge; 40)</span>
                <span>{warmLeads + hotLeads} ({totalLeads ? Math.round(((warmLeads + hotLeads) / totalLeads) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full" 
                  style={{ width: `${totalLeads ? ((warmLeads + hotLeads) / totalLeads) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-rose-700 mb-1">
                <span>3. Hot Qualified Leads (Score &ge; 70)</span>
                <span>{hotLeads} ({totalLeads ? Math.round((hotLeads / totalLeads) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-500 rounded-full" 
                  style={{ width: `${totalLeads ? (hotLeads / totalLeads) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-emerald-700 mb-1">
                <span>4. Booked 1-on-1 Counseling Appointments</span>
                <span>{totalAppointments} ({conversionRate}%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full" 
                  style={{ width: `${Math.min(100, totalLeads ? (totalAppointments / totalLeads) * 100 : 0)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Program Popularity Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-cyan-600" />
            <span>Candidate Interest by Technical Program</span>
          </h3>

          <div className="space-y-3 pt-2">
            {courses.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No course interest data recorded in MongoDB yet.</p>
            ) : courses.map((c, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>{c.name}</span>
                  <span className="text-slate-500">{c.pct}% ({c.count} leads)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${c.color} rounded-full`}
                    style={{ width: `${c.pct}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
