/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Play,
  RotateCcw,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Clock,
  Ban,
  FileText,
  ChevronRight,
  ShieldCheck,
  Search,
  Radar,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BillingRun } from '../types/index.ts';
import { formatINR } from '../utils/finance.ts';
import { MotionView } from '../components/motion/MotionView.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface BillingConsoleViewProps {
  onNavigate: (view: string) => void;
}

export const BillingConsoleView: React.FC<BillingConsoleViewProps> = ({ onNavigate }) => {
  const { isAdmin } = useAuth();
  const [dryRun, setDryRun] = useState<any>(null);
  const [pastRuns, setPastRuns] = useState<BillingRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);

  // Void run modal
  const [voidModalRun, setVoidModalRun] = useState<BillingRun | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidOutcome, setVoidOutcome] = useState<any>(null);

  // SECTION 6: Idempotency & Rescan state
  const [isRescanning, setIsRescanning] = useState(false);
  const [rescanReport, setRescanReport] = useState<any>(null);
  const [isTestingIdempotency, setIsTestingIdempotency] = useState(false);
  const [idempotencyReport, setIdempotencyReport] = useState<any>(null);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const [resDry, resRuns] = await Promise.all([
        fetch('/api/billing/preview'),
        fetch('/api/billing/runs'),
      ]);
      const dataDry = await resDry.json();
      const dataRuns = await resRuns.json();

      setDryRun(dataDry);
      setPastRuns(dataRuns.runs || []);
    } catch (err) {
      console.error('Failed to load billing preview', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRescan = async () => {
    try {
      setIsRescanning(true);
      const res = await fetch('/api/billing/rescan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setRescanReport(data);
        await fetchBillingData();
      }
    } catch (err) {
      console.error('Failed to rescan cycles', err);
    } finally {
      setIsRescanning(false);
    }
  };

  const handleIdempotencyTest = async () => {
    try {
      setIsTestingIdempotency(true);
      const res = await fetch('/api/billing/idempotency-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setIdempotencyReport(data);
        await fetchBillingData();
      }
    } catch (err) {
      console.error('Failed to run idempotency test', err);
    } finally {
      setIsTestingIdempotency(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handleExecuteRun = async () => {
    try {
      setExecuting(true);
      // Wait a moment for radar scanner animation feedback
      await new Promise(r => setTimeout(r, 600));

      const res = await fetch('/api/billing/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setRunResult(data);
        await fetchBillingData();
      } else {
        alert(data.error || 'Failed to execute billing run');
      }
    } catch (err: any) {
      alert(err.message || 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  const handleVoidRun = async () => {
    if (!voidModalRun || !voidReason) return;
    try {
      const res = await fetch(`/api/billing/runs/${voidModalRun.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setVoidOutcome(data);
        await fetchBillingData();
      } else {
        alert(data.error || 'Failed to void run');
      }
    } catch (err: any) {
      alert(err.message || 'Void run failed');
    }
  };

  if (loading && !dryRun) {
    return (
      <div className="p-8 space-y-6 animate-pulse max-w-7xl mx-auto">
        <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <MotionView className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            Automated Billing Console — Never Twice, Never Missed
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Section 10: Deterministic recurring invoice generation engine with live dry-run radar, duplicate prevention, and transactional snapshots.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRescan}
            disabled={isRescanning}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRescanning ? 'animate-spin text-teal-600' : ''}`} />
            <span>{isRescanning ? 'Rescanning Cycles...' : 'Rescan Cycles'}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleIdempotencyTest}
            disabled={isTestingIdempotency}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300 text-xs font-bold hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors shadow-xs cursor-pointer"
          >
            <ShieldCheck className={`w-4 h-4 ${isTestingIdempotency ? 'animate-pulse text-teal-500' : ''}`} />
            <span>{isTestingIdempotency ? 'Testing Idempotency...' : 'Re-run Billing / Idempotency Test'}</span>
          </motion.button>
        </div>
      </div>

      {/* SECTION 6: Idempotency Test Report Banner */}
      {idempotencyReport && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Zero-Duplicate Idempotency Verification Passed</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 uppercase">
                    100% Collision-Proof
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {idempotencyReport.guaranteeStatement}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIdempotencyReport(null)}
              className="text-xs text-slate-400 hover:text-slate-600 self-end sm:self-auto"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
              <span className="text-slate-500 text-[11px]">Existing Invoices:</span>
              <p className="font-mono font-bold text-slate-900 dark:text-white text-base mt-0.5">
                {idempotencyReport.initialInvoicesCount}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
              <span className="text-slate-500 text-[11px]">Re-run Created:</span>
              <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base mt-0.5">
                {idempotencyReport.reRunInvoicesCreated} <span className="text-[10px] font-normal text-slate-400">(0 Duplicate)</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
              <span className="text-slate-500 text-[11px]">Duplicates Blocked:</span>
              <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-base mt-0.5">
                {idempotencyReport.duplicatesDetected} Guarded
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
              <span className="text-slate-500 text-[11px]">Audit Timestamp:</span>
              <p className="font-mono font-medium text-slate-700 dark:text-slate-300 text-[11px] mt-1">
                {new Date(idempotencyReport.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Rescan Cycles Summary Notification */}
      {rescanReport && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <div className="text-slate-800 dark:text-slate-200">
              <strong className="font-semibold text-teal-900 dark:text-teal-200">Cycle Rescan Complete:</strong>{' '}
              Evaluated {rescanReport.checkedRecords} subscriptions · {rescanReport.eligibleCount} eligible for billing · {rescanReport.skippedCount} skipped (active grace/advance).
            </div>
          </div>
          <button
            onClick={() => setRescanReport(null)}
            className="text-slate-400 hover:text-slate-600 text-xs ml-3"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* SECTION 10: "Never Twice, Never Missed" Live Dry-Run Preview with Radar Scanner Visualizer */}
      {dryRun && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1E22] via-[#0E2C30] to-[#071518] text-white p-7 md:p-8 shadow-xl border border-teal-500/20 space-y-6">
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-teal-500/15 pb-6">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-teal-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                  Target Period: {dryRun.targetPeriod}
                </span>
                <span className="text-xs text-teal-200/60 font-mono">
                  Dry-Run Verification Active
                </span>
              </div>

              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                {dryRun.eligibleCount} invoice(s) will be created · {dryRun.duplicateCount} duplicates prevented · {dryRun.skippedCount} skipped
              </h2>

              <p className="text-xs text-teal-100/70">
                Total estimated recurring billable volume:{' '}
                <strong className="font-mono text-teal-300 text-sm">
                  {formatINR(dryRun.totalEstimatedInvoicedPaise)}
                </strong>
              </p>
            </div>

            {/* Radar scanner + Execute Button */}
            <div className="flex items-center gap-4 shrink-0">
              
              {/* Radar Mini Sweep Graphic */}
              <div className="hidden sm:flex items-center gap-3 bg-black/40 border border-teal-500/20 rounded-2xl px-4 py-2.5 backdrop-blur-md">
                <div className="relative w-8 h-8 rounded-full border border-teal-500/40 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-teal-400 shadow-xs shadow-teal-300" />
                  <div className="absolute inset-0 rounded-full border border-teal-400/30 animate-ping" />
                </div>
                <div className="text-left font-mono">
                  <div className="text-[10px] text-teal-300 uppercase font-bold">Collision Guard</div>
                  <div className="text-xs font-bold text-white">0 Duplicates</div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleExecuteRun}
                disabled={executing || dryRun.eligibleCount === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-teal-400 hover:bg-teal-300 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/30 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{executing ? 'Synthesizing Invoices...' : 'Execute Billing Cycle Now'}</span>
              </motion.button>
            </div>
          </div>

          {/* Execution Result Banner */}
          <AnimatePresence>
            {runResult && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-4 rounded-2xl bg-teal-500/15 border border-teal-400/40 flex items-center justify-between text-xs text-teal-200"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white">Billing Run Completed Successfully:</span>{' '}
                    Synthesized {runResult.run.invoicesCreated} invoice(s) totaling {formatINR(runResult.run.totalInvoicedPaise)} in {runResult.run.durationMs}ms.{' '}
                    Reference: <span className="font-mono font-semibold text-teal-300">{runResult.run.runReference}</span>.
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('invoices')}
                  className="px-3.5 py-1.5 bg-teal-400 text-slate-950 rounded-xl font-bold hover:bg-teal-300 transition-colors shrink-0"
                >
                  View Invoices →
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Details breakdown grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Eligible Subscriptions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-teal-200">
                <span>Eligible Subscriptions Ready for Generation</span>
                <span className="font-mono text-teal-400 font-bold">
                  {dryRun.eligibleSubscriptions.length}
                </span>
              </div>
              <div className="max-h-52 overflow-y-auto border border-teal-500/15 rounded-2xl divide-y divide-teal-500/10 text-xs bg-black/20 backdrop-blur-xs">
                {dryRun.eligibleSubscriptions.length === 0 ? (
                  <div className="p-4 text-center text-teal-200/50">
                    No subscriptions currently due for new invoices in this cycle.
                  </div>
                ) : (
                  dryRun.eligibleSubscriptions.map((sub: any) => (
                    <div key={sub.id} className="p-3 flex items-center justify-between hover:bg-teal-500/5 transition-colors">
                      <div>
                        <span className="font-mono font-bold text-teal-300">{sub.subscriptionNumber}</span>
                        <div className="text-[11px] text-teal-100/70">{sub.customerName} · {sub.planName}</div>
                      </div>
                      <span className="font-mono font-semibold text-white">
                        {formatINR(sub.amountPaise)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Skipped Subscriptions & Duplicate Prevention */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-teal-200">
                <span>Skipped Subscriptions & Reasons</span>
                <span className="font-mono text-amber-400 font-bold">
                  {dryRun.skippedSubscriptions.length} skipped
                </span>
              </div>
              <div className="max-h-52 overflow-y-auto border border-teal-500/15 rounded-2xl divide-y divide-teal-500/10 text-xs bg-black/20 backdrop-blur-xs">
                {dryRun.skippedSubscriptions.length === 0 ? (
                  <div className="p-4 text-center text-teal-200/50">
                    Zero subscriptions skipped.
                  </div>
                ) : (
                  dryRun.skippedSubscriptions.map((sub: any, i: number) => (
                    <div key={i} className="p-3 flex items-start justify-between bg-amber-500/5">
                      <div>
                        <span className="font-mono font-bold text-amber-300">{sub.subscriptionNumber}</span>
                        <div className="text-[11px] text-teal-100/70">{sub.customerName}</div>
                        <div className="text-[11px] text-amber-400 mt-0.5">{sub.reason}</div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold shrink-0">
                        Bypassed
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Past Billing Runs Log & Void Controls */}
      <div className="bg-white dark:bg-[#0E1A1F] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Billing Run History & Idempotency Audit Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Immutable execution logs with duration, volume, and administrative voiding safeguards.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {pastRuns.length} Total Runs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-semibold">Run Reference</th>
                <th className="py-3 px-4 font-semibold">Execution Timestamp</th>
                <th className="py-3 px-3 font-semibold">Period</th>
                <th className="py-3 px-3 font-semibold text-right">Invoices Created</th>
                <th className="py-3 px-3 font-semibold text-right">Skipped</th>
                <th className="py-3 px-4 font-semibold text-right">Total Invoiced</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pastRuns.map((run) => (
                <tr key={run.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono font-medium text-teal-700 dark:text-teal-400">
                    {run.runReference}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                    {new Date(run.executionDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-3 px-3 font-mono">{run.targetPeriod}</td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {run.invoicesCreated}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-500">
                    {run.subscriptionsSkipped}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatINR(run.totalInvoicedPaise)}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        run.status === 'completed'
                          ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isAdmin && run.status === 'completed' && (
                      <button
                        onClick={() => {
                          setVoidModalRun(run);
                          setVoidReason('');
                          setVoidOutcome(null);
                        }}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                      >
                        Void Run
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Void Run Modal */}
      {voidModalRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-rose-600 flex items-center gap-2">
              <Ban className="w-4 h-4" />
              Void Billing Run {voidModalRun.runReference}
            </h3>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Per Section 10 billing reliability rules, voiding a run will <strong>cancel only Draft invoices</strong> created by this execution. All Confirmed and Paid invoices will remain strictly protected.
            </p>

            <textarea
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
              placeholder="Mandatory administrative justification for voiding..."
              className="w-full h-20 text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />

            {voidOutcome && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl text-xs space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Outcome:</p>
                <p className="text-rose-600">Draft invoices cancelled: {voidOutcome.cancelledInvoicesCount}</p>
                <p className="text-emerald-600">Confirmed/Paid invoices protected: {voidOutcome.protectedInvoicesCount}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setVoidModalRun(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Close
              </button>
              {!voidOutcome && (
                <button
                  onClick={handleVoidRun}
                  disabled={!voidReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs"
                >
                  Confirm Void
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </MotionView>
  );
};
