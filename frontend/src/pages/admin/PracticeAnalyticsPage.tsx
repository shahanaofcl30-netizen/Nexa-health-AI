import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bot,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
} from 'lucide-react';
import api from '../../services/api';

export const PracticeAnalyticsPage: React.FC = () => {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [revRes, deptRes, metricsRes] = await Promise.all([
          api.get('/admin/revenue-chart'),
          api.get('/admin/department-volume'),
          api.get('/admin/metrics'),
        ]);
        setRevenueData(revRes.data);
        setDeptData(deptRes.data);
        setMetrics(metricsRes.data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const COLORS = ['#06B6D4', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Practice Management & Analytics</h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
            Live Hospital Intelligence
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Executive performance dashboards, revenue forecasting, clinical department volume, and AI efficiency metrics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">YTD Hospital Revenue</span>
          <p className="text-2xl font-black text-white font-mono">$485,000.00</p>
          <span className="text-[11px] text-emerald-400 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" /> +18.4% YoY growth
          </span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">Monthly Patient Volume</span>
          <p className="text-2xl font-black text-brand-400 font-mono">590 Visits</p>
          <span className="text-[11px] text-brand-300 flex items-center">
            <Users className="w-3 h-3 mr-1" /> 94% Capacity utilization
          </span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">Autonomous Agent Workflows</span>
          <p className="text-2xl font-black text-purple-400 font-mono">1,420 Run</p>
          <span className="text-[11px] text-purple-300 flex items-center">
            <Bot className="w-3 h-3 mr-1" /> ~180 hrs clinician time saved
          </span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">Average Patient Wait Time</span>
          <p className="text-2xl font-black text-emerald-400 font-mono">11.2 mins</p>
          <span className="text-[11px] text-emerald-300 flex items-center">
            <Activity className="w-3 h-3 mr-1" /> Down from 24 mins
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Revenue & Consultation Volume Area Chart (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-3xl glass-card border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">Revenue & Clinical Consultations Trend</h3>
              <p className="text-xs text-slate-400">Monthly breakdown across clinic encounters and diagnostic labs</p>
            </div>
            <span className="text-xs font-mono text-brand-400 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
              FY 2026
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="consultsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="month" stroke="#64748B" textAnchor="end" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B1120', borderColor: '#1E293B', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#revenueGrad)" name="Revenue ($)" />
                <Area type="monotone" dataKey="consultations" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#consultsGrad)" name="Consultations" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Clinical Department Volume Distribution (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-3xl glass-card border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-white">Department Patient Share</h3>
            <p className="text-xs text-slate-400">Distribution by medical specialty</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={deptData} innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {deptData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0B1120', borderColor: '#1E293B', borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {deptData.map((d, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-slate-300 font-medium truncate">{d.name} ({d.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
