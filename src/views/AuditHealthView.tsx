/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Activity,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Clock,
  Database,
  Cpu
} from 'lucide-react';
import { AuditLogEntry, SystemHealthIssue } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface AuditHealthViewProps {
  onNavigate: (view: string) => void;
}

export const AuditHealthView: React.FC<AuditHealthViewProps> = ({ onNavigate }) => {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(new Date().toLocaleTimeString());
  const [refreshError, setRefreshError] = useState<string>('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setRefreshError('');
      const [resAudit, resHealth] = await Promise.all([
        fetch('/api/audit'),
        fetch('/api/health'),
      ]);

      if (!resAudit.ok || !resHealth.ok) {
        throw new Error('Failed to retrieve security events and system health metrics.');
      }

      const dataAudit = await resAudit.json();
      const dataHealth = await resHealth.json();

      setLogs(dataAudit.auditLogs || []);
      setHealth(dataHealth);
      setLastRefreshTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to load audit data', err);
      setRefreshError(err.message || 'Error occurred while loading security and health indicators.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = logs.filter(l => {
    if (moduleFilter !== 'all' && l.module.toLowerCase() !== moduleFilter.toLowerCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        l.actor.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            Security Audit Center & System Health Watchdog
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Section 4G & 17.M & N: Immutable append-only operational audit trail and automation background monitor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Last audited: {lastRefreshTime}
          </span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh security records and watchdog health"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            <span>{loading ? 'Auditing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {refreshError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
          <span>{refreshError}</span>
          <button onClick={() => setRefreshError('')} className="text-rose-600 font-bold ml-2">✕</button>
        </div>
      )}

      {/* System Health Indicators */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>System Core Status</span>
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <CheckCircle className="w-3.5 h-3.5" /> Healthy
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
              {health.status.toUpperCase()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Uptime: {Math.floor(health.uptimeSeconds / 60)} minutes</div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Database Volume</span>
              <Database className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
              {health.databaseRecordCounts?.invoices + health.databaseRecordCounts?.subscriptions} Records
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Active transactional entities</div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Recurring Engine</span>
              <Cpu className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              Idempotent Active
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Zero billing collision lock</div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Audit Entries</span>
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
              {logs.length} Immutable Logs
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Append-only security trail</div>
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit trail by actor, action, or details..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs">
            {['all', 'Billing Engine', 'Invoices', 'Payments', 'Subscriptions', 'Authentication'].map(m => (
              <button
                key={m}
                onClick={() => setModuleFilter(m)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  moduleFilter.toLowerCase() === m.toLowerCase()
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                <th className="py-2.5 px-3 font-semibold">Actor & Role</th>
                <th className="py-2.5 px-3 font-semibold">Module</th>
                <th className="py-2.5 px-3 font-semibold">Action</th>
                <th className="py-2.5 px-4 font-semibold">Operational Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-sans">
                  <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{l.actor}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-mono uppercase">({l.actorRole})</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-xs">{l.module}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400 text-[11px]">
                    {l.action}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 text-xs max-w-md">{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
