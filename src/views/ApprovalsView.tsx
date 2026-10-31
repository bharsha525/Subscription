/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { ApprovalRequest } from '../types/index.ts';
import { formatINR } from '../utils/finance.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface ApprovalsViewProps {
  onNavigate: (view: string) => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({ onNavigate }) => {
  const { isAdmin } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [selectedAppr, setSelectedAppr] = useState<ApprovalRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(new Date().toLocaleTimeString());
  const [refreshError, setRefreshError] = useState<string>('');

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      setRefreshError('');
      const res = await fetch('/api/approvals');
      if (!res.ok) throw new Error('Failed to fetch approval requests.');
      const data = await res.json();
      setApprovals(data.approvals || []);
      setLastRefreshTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to load approvals', err);
      setRefreshError(err.message || 'Error occurred while loading approval requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleDecide = async (decision: 'Approved' | 'Rejected') => {
    if (!selectedAppr) return;
    try {
      const res = await fetch(`/api/approvals/${selectedAppr.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes: decisionNotes }),
      });
      if (res.ok) {
        setSelectedAppr(null);
        setDecisionNotes('');
        await fetchApprovals();
      }
    } catch (err) {
      console.error('Error deciding approval', err);
    }
  };

  const pendingCount = approvals.filter(a => a.status === 'Pending').length;
  const approvedCount = approvals.filter(a => a.status === 'Approved').length;
  const rejectedCount = approvals.filter(a => a.status === 'Rejected').length;

  const filteredApprovals = approvals.filter(a => {
    if (statusFilter === 'all') return true;
    return a.status.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            Executive Approval Inboxes & Financial Governance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Section 4F & 17.G: Real-time governance for high-value discounts, cancellations, large refunds, and pricing exceptions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Last updated: {lastRefreshTime}
          </span>
          <button
            onClick={fetchApprovals}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh approval items"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {refreshError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
          <span>{refreshError}</span>
          <button onClick={() => setRefreshError('')} className="text-rose-600 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Live Approval Status KPI Strip (Section 4F) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'all' : 'Pending')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'Pending'
              ? 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/40 ring-1 ring-amber-400'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-amber-700 dark:text-amber-400">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-800 dark:text-amber-300 mt-1">
            {pendingCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Awaiting executive decision</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'Approved' ? 'all' : 'Approved')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'Approved'
              ? 'border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 ring-1 ring-emerald-400'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Approved Requests</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-300 mt-1">
            {approvedCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Authorized commercial exceptions</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'Rejected' ? 'all' : 'Rejected')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'Rejected'
              ? 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/40 ring-1 ring-rose-400'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-rose-700 dark:text-rose-400">Rejected Requests</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-800 dark:text-rose-300 mt-1">
            {rejectedCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Declined or unauthorized</p>
        </button>
      </div>

      {/* Approvals Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Entity Reference</th>
                <th className="py-3 px-4 font-semibold">Requested By</th>
                <th className="py-3 px-4 font-semibold text-right">Financial Exposure</th>
                <th className="py-3 px-4 font-semibold">Justification</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {approvals.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 capitalize">
                    {a.requestType.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                    {a.entityReference}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{a.requestedByName}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    {a.amountPaise ? formatINR(a.amountPaise) : '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 max-w-xs">{a.justification}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                        a.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : a.status === 'Rejected'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isAdmin && a.status === 'Pending' && (
                      <button
                        onClick={() => setSelectedAppr(a)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Modal */}
      {selectedAppr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Authorize Request: {selectedAppr.entityReference}
            </h3>
            <p className="text-xs text-slate-500">
              Requested by {selectedAppr.requestedByName}: "{selectedAppr.justification}"
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Decision Notes / Mandatory Rejection Reason
              </label>
              <textarea
                value={decisionNotes}
                onChange={e => setDecisionNotes(e.target.value)}
                placeholder="Required for administrative audit log..."
                className="w-full h-20 text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedAppr(null)}
                className="px-4 py-2 text-xs text-slate-500 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDecide('Rejected')}
                disabled={!decisionNotes.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Reject Request
              </button>
              <button
                onClick={() => handleDecide('Approved')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Approve Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
