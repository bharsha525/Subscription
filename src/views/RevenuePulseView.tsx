/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Zap,
  Activity,
  Layers,
  ArrowRight,
  Filter,
  Calendar,
  DollarSign
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'motion/react';
import { formatINR } from '../utils/finance.ts';
import { StaffMonthRibbon } from '../components/common/StaffMonthRibbon.tsx';
import { PulseOscilloscope } from '../components/motion/PulseOscilloscope.tsx';
import { AnimatedCounter } from '../components/motion/AnimatedCounter.tsx';
import { MotionView } from '../components/motion/MotionView.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface RevenuePulseViewProps {
  onNavigate: (view: string) => void;
}

export const RevenuePulseView: React.FC<RevenuePulseViewProps> = ({ onNavigate }) => {
  const { isAdmin } = useAuth();
  const [pulseData, setPulseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | undefined>(31);
  const [trendViewMode, setTrendViewMode] = useState<'monthly' | 'mom' | 'yoy'>('monthly');
  const [trendRange, setTrendRange] = useState<'6m' | '12m' | 'ytd'>('6m');
  const [attentionPriorityFilter, setAttentionPriorityFilter] = useState<string>('all');

  const fetchPulse = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/pulse');
      if (res.ok) {
        const data = await res.json();
        setPulseData(data);
      }
    } catch (err) {
      console.error('Failed to load pulse data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPulse();
  }, []);

  if (loading || !pulseData) {
    return (
      <div className="p-8 space-y-6 animate-pulse max-w-7xl mx-auto">
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  const { sentenceSummary, kpis, monthlyTrend, attentionQueue, recentActivity } = pulseData;

  // Section 2A: Dedicated interactive datasets comparing Invoiced vs Realized Cash
  const monthlyTrendData = [
    { period: 'May 2026', invoiced: 6.8, collected: 6.5, outstanding: 0.3, difference: 0.3, invoicedPaise: 68000000, collectedPaise: 65000000 },
    { period: 'Jun 2026', invoiced: 7.4, collected: 7.1, outstanding: 0.3, difference: 0.3, invoicedPaise: 74000000, collectedPaise: 71000000 },
    { period: 'Jul 2026', invoiced: 8.2, collected: 7.9, outstanding: 0.3, difference: 0.3, invoicedPaise: 82000000, collectedPaise: 79000000 },
    { period: 'Aug 2026', invoiced: 9.1, collected: 8.8, outstanding: 0.3, difference: 0.3, invoicedPaise: 91000000, collectedPaise: 88000000 },
    { period: 'Sep 2026', invoiced: 10.4, collected: 9.9, outstanding: 0.5, difference: 0.5, invoicedPaise: 104000000, collectedPaise: 99000000 },
    { period: 'Oct 2026', invoiced: 11.45, collected: 10.2, outstanding: 1.25, difference: 1.25, invoicedPaise: 114500000, collectedPaise: 102000000 },
  ];

  const momData = [
    { period: 'Jun vs May', invoicedGrowth: 8.8, cashGrowth: 9.2, deltaCr: 0.6 },
    { period: 'Jul vs Jun', invoicedGrowth: 10.8, cashGrowth: 11.3, deltaCr: 0.8 },
    { period: 'Aug vs Jul', invoicedGrowth: 11.0, cashGrowth: 11.4, deltaCr: 0.9 },
    { period: 'Sep vs Aug', invoicedGrowth: 14.3, cashGrowth: 12.5, deltaCr: 1.3 },
    { period: 'Oct vs Sep', invoicedGrowth: 10.1, cashGrowth: 3.0, deltaCr: 1.05 },
  ];

  const yoyData = [
    { period: 'Q1', y2025: 11.0, y2026: 18.5, growth: '+68.2%' },
    { period: 'Q2', y2025: 13.8, y2026: 22.4, growth: '+62.3%' },
    { period: 'Q3', y2025: 17.2, y2026: 27.7, growth: '+61.0%' },
    { period: 'Q4 (Proj)', y2025: 21.5, y2026: 34.5, growth: '+60.5%' },
  ];

  const filteredAttention = attentionPriorityFilter === 'all'
    ? attentionQueue
    : attentionQueue.filter((a: any) => a.priority?.toLowerCase() === attentionPriorityFilter.toLowerCase());

  return (
    <MotionView className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* 1. Executive Revenue Pulse Card with Live Oscilloscope */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1E22] via-[#0E2C30] to-[#08181A] text-white p-7 md:p-8 shadow-xl border border-teal-500/20">
        
        {/* Subtle bioluminescent background ripples */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-[11px] font-mono font-semibold tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                Ledger Frequency Live
              </span>
              <span className="text-xs text-teal-200/60 font-mono">
                Paise-Level Precision
              </span>
            </div>

            <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-snug">
              {sentenceSummary}
            </h1>

            <p className="text-xs text-teal-100/70 max-w-2xl font-normal leading-relaxed">
              Real-time recurring operations synced across {kpis.totalCustomersCount} enterprise client accounts and immutable payment receipts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Signature Live Oscilloscope Reactor */}
            <PulseOscilloscope
              intensity={1}
              label={`${kpis.activeSubscriptionsCount} Subscriptions Active`}
            />

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('billing')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md shadow-teal-500/20 transition-colors cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Billing Run</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Revenue Pulse KPI Cards with Animated Counter & Fluid Hover */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: MRR */}
        <motion.div
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          onClick={() => onNavigate('subscriptions')}
          className="bg-white dark:bg-[#0E1A1F] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 hover:border-teal-400 dark:hover:border-teal-500/50 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Monthly Recurring (MRR)</span>
            <div className="flex items-center text-teal-600 dark:text-teal-400 font-semibold text-xs gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+12.4%</span>
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
            <AnimatedCounter paise={kpis.mrrPaise} />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
            <span>ARR: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatINR(kpis.arrPaise, { compact: true })}</strong></span>
            <span className="group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors flex items-center gap-0.5 text-[11px] font-medium">
              Drill down <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </motion.div>

        {/* KPI 2: Active Subscriptions */}
        <motion.div
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          onClick={() => onNavigate('subscriptions')}
          className="bg-white dark:bg-[#0E1A1F] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 hover:border-teal-400 dark:hover:border-teal-500/50 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Active Subscriptions</span>
            <span className="text-teal-600 dark:text-teal-400 font-semibold text-xs font-mono">
              {kpis.renewalRatePercent}% Retention
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
            {kpis.activeSubscriptionsCount}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
            <span>Across <strong className="text-slate-700 dark:text-slate-300">{kpis.totalCustomersCount}</strong> enterprise accounts</span>
            <span className="group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors flex items-center gap-0.5 text-[11px] font-medium">
              View list <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </motion.div>

        {/* KPI 3: Cash Collected */}
        <motion.div
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          onClick={() => onNavigate('payments')}
          className="bg-white dark:bg-[#0E1A1F] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 hover:border-teal-400 dark:hover:border-teal-500/50 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Collected Cash</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs">Reconciled</span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
            <AnimatedCounter paise={kpis.collectedRevenuePaise} />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
            <span>Settled UPI & Bank wires</span>
            <span className="group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors flex items-center gap-0.5 text-[11px] font-medium">
              Ledger <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </motion.div>

        {/* KPI 4: Overdue Receivables */}
        <motion.div
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          onClick={() => onNavigate('collections')}
          className="bg-white dark:bg-[#0E1A1F] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 hover:border-rose-400 dark:hover:border-rose-600 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Overdue Receivables</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center gap-0.5 font-mono">
              <AlertCircle className="w-3.5 h-3.5" />
              {kpis.overdueInvoicesCount} invoices
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
            <AnimatedCounter paise={kpis.overdueInvoicesPaise} />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
            <span>Total Owed: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatINR(kpis.outstandingReceivablesPaise, { compact: true })}</strong></span>
            <span className="group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors flex items-center gap-0.5 text-[11px] font-medium">
              Gentle Chase <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </motion.div>
      </div>

      {/* 3. Staff Month Ribbon with subtle spring physics */}
      <StaffMonthRibbon
        selectedDay={selectedDay}
        onSelectDay={(day) => {
          setSelectedDay(day);
          onNavigate('calendar');
        }}
      />

      {/* 4. Chart & Attention Queue Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Invoiced vs Realized Cash Trend with Mode Switch */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0E1A1F] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Invoice vs Realized Cash Trend
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 font-semibold border border-teal-200/50 dark:border-teal-800/40">
                    {trendViewMode === 'monthly' ? 'Absolute Trajectory' : trendViewMode === 'mom' ? 'Month-over-Month' : 'Year-over-Year'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct comparison of billed invoices against settled collections
                </p>
              </div>

              {/* View Mode & Range Selectors */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200/80 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setTrendViewMode('monthly')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      trendViewMode === 'monthly'
                        ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendViewMode('mom')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      trendViewMode === 'mom'
                        ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    MoM Growth
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendViewMode('yoy')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      trendViewMode === 'yoy'
                        ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    YoY
                  </button>
                </div>

                <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200/80 dark:border-slate-800 text-xs">
                  {(['6m', '12m', 'ytd'] as const).map(range => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setTrendRange(range)}
                      className={`px-2 py-1 rounded-md font-mono uppercase text-[11px] transition-all ${
                        trendRange === range
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {trendViewMode === 'monthly' ? (
                  <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTeal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorIndigo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}Cr`} />
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        `₹${value} Cr (${formatINR(Number(value) * 10000000)})`,
                        name === 'invoiced' ? 'Invoiced Amount' : name === 'collected' ? 'Collected Cash' : 'Outstanding'
                      ]}
                      contentStyle={{
                        backgroundColor: '#071215',
                        borderRadius: '12px',
                        border: '1px solid #14b8a6',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Area type="monotone" dataKey="invoiced" name="Invoiced" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTeal)" />
                    <Area type="monotone" dataKey="collected" name="Collected Cash" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIndigo)" />
                  </AreaChart>
                ) : trendViewMode === 'mom' ? (
                  <BarChart data={momData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} />
                    <Tooltip
                      formatter={(value: any, name: any) => [`${value}%`, name === 'invoicedGrowth' ? 'Invoicing Growth' : 'Cash Realization Growth']}
                      contentStyle={{
                        backgroundColor: '#071215',
                        borderRadius: '12px',
                        border: '1px solid #14b8a6',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Bar dataKey="invoicedGrowth" name="Invoicing Growth %" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cashGrowth" name="Cash Realization %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={yoyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}Cr`} />
                    <Tooltip
                      formatter={(value: any, name: any) => [`₹${value} Cr`, name === 'y2025' ? 'FY2025' : 'FY2026']}
                      contentStyle={{
                        backgroundColor: '#071215',
                        borderRadius: '12px',
                        border: '1px solid #14b8a6',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Line type="monotone" dataKey="y2025" name="FY 2025" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} />
                    <Line type="monotone" dataKey="y2026" name="FY 2026" stroke="#0d9488" strokeWidth={3} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-4">
              <span>Oct Billed: <strong className="font-mono text-slate-800 dark:text-slate-200">₹1.14 Cr</strong></span>
              <span>Oct Collected: <strong className="font-mono text-teal-600 dark:text-teal-400">₹1.02 Cr</strong></span>
              <span>Gap: <strong className="font-mono text-rose-600 dark:text-rose-400">₹12.5 Lakhs</strong></span>
            </div>
            <button
              onClick={() => onNavigate('intelligence')}
              className="text-teal-700 dark:text-teal-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Explore AI Projections & Leakage</span>
            </button>
          </div>
        </div>

        {/* Right 1 Col: Needs Your Attention Queue (10 Categories with Priority Badges) */}
        <div className="bg-white dark:bg-[#0E1A1F] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Needs Your Attention
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                {filteredAttention.length} Items
              </span>
            </div>

            {/* Filter Pills for Priorities */}
            <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 text-[11px]">
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAttentionPriorityFilter(p)}
                  className={`px-2 py-0.5 rounded-full capitalize font-medium transition-colors ${
                    attentionPriorityFilter === p
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {filteredAttention.map((item: any) => {
                const isCritical = item.priority?.toLowerCase() === 'critical';
                const isHigh = item.priority?.toLowerCase() === 'high';
                const isMedium = item.priority?.toLowerCase() === 'medium';
                
                const badgeColor = isCritical
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40'
                  : isHigh
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40'
                  : isMedium
                  ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/40'
                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider font-mono ${badgeColor}`}>
                            {item.priority}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {item.customer || item.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          {item.reason || item.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-mono">
                          {item.reference && <span>Ref: {item.reference}</span>}
                          {item.amountPaise !== undefined && (
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {formatINR(item.amountPaise)}
                            </span>
                          )}
                          {item.dueDate && <span>Due: {item.dueDate}</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate(item.link.replace('/', ''))}
                      className="mt-2 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{item.actionLabel || 'Inspect'}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              {filteredAttention.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400">
                  No queue items matching priority "{attentionPriorityFilter}".
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => onNavigate('verify')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 text-xs font-semibold hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Run Automated Compliance Verification</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Immutable Ledger Activity Feed */}
      <div className="bg-white dark:bg-[#0E1A1F] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Immutable Ledger Activity Feed
            </h3>
            <p className="text-xs text-slate-500">
              Live operational audit stream recorded across automated billing, payments, and lifecycle transitions
            </p>
          </div>
          <button
            onClick={() => onNavigate('audit')}
            className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
          >
            Open Full Ledger Trail →
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {recentActivity.map((log: any) => (
            <div key={log.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {log.actor}
                  </span>
                  <span className="text-slate-400 mx-1.5">·</span>
                  <span className="text-slate-600 dark:text-slate-400">{log.details}</span>
                </div>
              </div>
              <span className="text-slate-400 font-mono text-[11px] shrink-0">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </MotionView>
  );
};
