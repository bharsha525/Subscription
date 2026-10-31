/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';

interface StaffMonthRibbonProps {
  onSelectDay?: (day: number) => void;
  selectedDay?: number;
}

export const StaffMonthRibbon: React.FC<StaffMonthRibbonProps> = ({ onSelectDay, selectedDay }) => {
  const today = 31; // 31 Oct 2026 based on metadata
  const totalDays = 31;

  // Realistic billing workload distribution for October 2026
  // Days 1, 10, 15, 20, 25, 31 have high recurring batch volumes
  const getWorkload = (day: number) => {
    if (day === 1) return { count: 14, label: 'High' };
    if (day === 10) return { count: 8, label: 'Medium' };
    if (day === 15) return { count: 12, label: 'High' };
    if (day === 20) return { count: 9, label: 'Medium' };
    if (day === 25) return { count: 18, label: 'Peak' };
    if (day === 31) return { count: 11, label: 'High' };
    if (day % 7 === 0) return { count: 4, label: 'Low' };
    return { count: (day * 3) % 5, label: 'Normal' };
  };

  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            October 2026 — Recurring Billing & Invoicing Workload
          </h4>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500"></span>
            Today (Day {today})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-200 dark:bg-slate-700"></span>
            Scheduled Workload
          </span>
        </div>
      </div>

      {/* Horizontal ribbon scrollable */}
      <div className="flex items-end gap-1.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
        {days.map((day) => {
          const { count } = getWorkload(day);
          const isToday = day === today;
          const isSelected = selectedDay === day;
          const maxCount = 18;
          const heightPercent = Math.max(15, Math.round((count / maxCount) * 100));

          return (
            <button
              key={day}
              onClick={() => onSelectDay?.(day)}
              title={`Day ${day} Oct: ${count} invoice(s) due`}
              className={`flex flex-col items-center flex-1 min-w-[28px] max-w-[38px] group transition-all cursor-pointer ${
                isSelected ? 'scale-105' : ''
              }`}
            >
              {/* Vertical workload bar */}
              <div className="w-full h-12 flex items-end justify-center rounded-xs bg-slate-100 dark:bg-slate-800/80 p-0.5 mb-1.5 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-xs transition-all duration-300 ${
                    isToday
                      ? 'bg-indigo-600 shadow-xs'
                      : isSelected
                      ? 'bg-indigo-400'
                      : count > 10
                      ? 'bg-slate-400 dark:bg-slate-500'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              </div>

              {/* Day number */}
              <span
                className={`text-[11px] font-mono tabular-nums leading-none py-0.5 px-1 rounded ${
                  isToday
                    ? 'bg-indigo-600 text-white font-bold'
                    : isSelected
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
                }`}
              >
                {day}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
