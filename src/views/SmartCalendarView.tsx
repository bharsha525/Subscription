/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Layers,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { formatINR } from '../utils/finance.ts';

interface SmartCalendarViewProps {
  onNavigate: (view: string) => void;
}

export const SmartCalendarView: React.FC<SmartCalendarViewProps> = ({ onNavigate }) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState('October 2026');

  useEffect(() => {
    async function loadData() {
      try {
        const [resI, resS] = await Promise.all([
          fetch('/api/invoices'),
          fetch('/api/subscriptions'),
        ]);
        const dataI = await resI.json();
        const dataS = await resS.json();
        setInvoices(dataI.invoices || []);
        setSubscriptions(dataS.subscriptions || []);
      } catch (e) {
        console.error(e);
      }
    }
    loadData();
  }, []);

  // Events grouped by day for October 2026
  const daysInMonth = 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getEventsForDay = (day: number) => {
    const dayStr = day.toString().padStart(2, '0');
    const fullDate = `2026-10-${dayStr}`;

    const dueInvs = invoices.filter(i => i.dueDate === fullDate);
    const subRenewals = subscriptions.filter(s => s.nextBillingDate === fullDate);

    return { dueInvs, subRenewals };
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Smart Billing & Renewal Calendar
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Section 18: Monthly and agenda view of invoice generation dates, contract renewals, due dates, and reminders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-bold text-sm text-slate-900 dark:text-white">
            {currentMonth}
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const { dueInvs, subRenewals } = getEventsForDay(day);
            const isToday = day === 31;
            const hasEvents = dueInvs.length > 0 || subRenewals.length > 0;

            return (
              <div
                key={day}
                className={`min-h-[90px] p-2 rounded-xl border flex flex-col justify-between transition-all ${
                  isToday
                    ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                    : hasEvents
                    ? 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-950/30'
                    : 'border-slate-100 dark:border-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded ${
                      isToday
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-700 dark:text-slate-300 font-medium'
                    }`}
                  >
                    {day}
                  </span>
                  {isToday && (
                    <span className="text-[9px] uppercase tracking-wider text-indigo-600 font-bold">
                      Today
                    </span>
                  )}
                </div>

                {/* Events in cell */}
                <div className="space-y-1 my-1">
                  {dueInvs.map((inv: any) => (
                    <div
                      key={inv.id}
                      onClick={() => onNavigate('invoices')}
                      className="text-[10px] p-1 rounded bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 truncate cursor-pointer hover:opacity-80"
                      title={`Invoice Due: ${inv.invoiceNumber} (${formatINR(inv.totalPaise)})`}
                    >
                      Due: {inv.invoiceNumber}
                    </div>
                  ))}
                  {subRenewals.map((sub: any) => (
                    <div
                      key={sub.id}
                      onClick={() => onNavigate('subscriptions')}
                      className="text-[10px] p-1 rounded bg-indigo-100/70 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 truncate cursor-pointer hover:opacity-80"
                      title={`Cycle Renewal: ${sub.subscriptionNumber}`}
                    >
                      Renew: {sub.subscriptionNumber}
                    </div>
                  ))}
                </div>

                <div className="text-[10px] text-slate-400 text-right">
                  {hasEvents && `${dueInvs.length + subRenewals.length} events`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
