/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Filter,
  Plus,
  Play,
  Pause,
  RefreshCw,
  XCircle,
  Clock,
  Calendar,
  CheckCircle,
  ChevronRight,
  Calculator,
  ArrowRight,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Check
} from 'lucide-react';
import { Subscription, SubscriptionPlan, Customer } from '../types/index.ts';
import { formatINR, calculateProration } from '../utils/finance.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { MotionView } from '../components/motion/MotionView.tsx';

interface SubscriptionsViewProps {
  onNavigate: (view: string) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({ onNavigate }) => {
  const { isStaff, isAdmin } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  // SECTION 3: Plan Upgrade / Downgrade Modal state
  const [planChangeSub, setPlanChangeSub] = useState<Subscription | null>(null);
  const [targetPlanId, setTargetPlanId] = useState('');
  const [planChangeCalc, setPlanChangeCalc] = useState<any>(null);
  const [isCalculatingChange, setIsCalculatingChange] = useState(false);
  const [isApplyingChange, setIsApplyingChange] = useState(false);
  const [planChangeMsg, setPlanChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Proration Modal state
  const [prorationModalSub, setProrationModalSub] = useState<Subscription | null>(null);
  const [prorationTargetPlanId, setProrationTargetPlanId] = useState('');
  const [prorationResult, setProrationResult] = useState<any>(null);

  // Close Subscription Modal
  const [closeModalSub, setCloseModalSub] = useState<Subscription | null>(null);
  const [closeReason, setCloseReason] = useState('');

  // Create Subscription Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubCustomerId, setNewSubCustomerId] = useState('');
  const [newSubPlanId, setNewSubPlanId] = useState('');
  const [newSubQty, setNewSubQty] = useState('1');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resSubs, resPlans, resCusts] = await Promise.all([
        fetch('/api/subscriptions'),
        fetch('/api/plans'),
        fetch('/api/customers'),
      ]);
      const dataSubs = await resSubs.json();
      const dataPlans = await resPlans.json();
      const dataCusts = await resCusts.json();

      setSubscriptions(dataSubs.subscriptions || []);
      setPlans(dataPlans.plans || []);
      setCustomers(dataCusts.customers || []);
    } catch (err) {
      console.error('Failed to load subscriptions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePause = async (sub: Subscription) => {
    try {
      const res = await fetch(`/api/subscriptions/${sub.id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Paused via dashboard console' }),
      });
      if (res.ok) {
        await fetchData();
        if (selectedSub?.id === sub.id) {
          const updated = await res.json();
          setSelectedSub(updated.subscription);
        }
      }
    } catch (err) {
      console.error('Error pausing subscription', err);
    }
  };

  const handleResume = async (sub: Subscription) => {
    try {
      const res = await fetch(`/api/subscriptions/${sub.id}/resume`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchData();
        if (selectedSub?.id === sub.id) {
          const updated = await res.json();
          setSelectedSub(updated.subscription);
        }
      }
    } catch (err) {
      console.error('Error resuming subscription', err);
    }
  };

  const handleClose = async () => {
    if (!closeModalSub || !closeReason) return;
    try {
      const res = await fetch(`/api/subscriptions/${closeModalSub.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: closeReason }),
      });
      if (res.ok) {
        setCloseModalSub(null);
        setCloseReason('');
        await fetchData();
      }
    } catch (err) {
      console.error('Error closing subscription', err);
    }
  };

  const handleOpenPlanChange = (sub: Subscription) => {
    setPlanChangeSub(sub);
    const otherPlan = plans.find(p => p.id !== sub.planId);
    setTargetPlanId(otherPlan?.id || '');
    setPlanChangeCalc(null);
    setPlanChangeMsg(null);
  };

  const handleCalculatePlanChange = async () => {
    if (!planChangeSub || !targetPlanId) return;
    try {
      setIsCalculatingChange(true);
      setPlanChangeMsg(null);
      const res = await fetch(`/api/subscriptions/${planChangeSub.id}/calculate-plan-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPlanId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlanChangeMsg({ type: 'error', text: data.error || 'Failed to calculate plan change' });
        return;
      }
      setPlanChangeCalc(data);
    } catch (err: any) {
      setPlanChangeMsg({ type: 'error', text: err.message || 'Error calculating plan change' });
    } finally {
      setIsCalculatingChange(false);
    }
  };

  const handleApplyPlanChange = async () => {
    if (!planChangeSub || !targetPlanId || !planChangeCalc) return;
    try {
      setIsApplyingChange(true);
      const res = await fetch(`/api/subscriptions/${planChangeSub.id}/apply-plan-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPlanId,
          confirmed: true,
          changeType: planChangeCalc.changeType,
          effectiveDate: planChangeCalc.effectiveDate,
          finalAmountPayablePaise: planChangeCalc.finalAmountPayablePaise,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlanChangeMsg({ type: 'error', text: data.error || 'Failed to apply plan change' });
        return;
      }
      setPlanChangeMsg({ type: 'success', text: `Plan successfully updated to ${data.subscription.planName}!` });
      await fetchData();
      if (selectedSub?.id === planChangeSub.id) {
        setSelectedSub(data.subscription);
      }
      setTimeout(() => {
        setPlanChangeSub(null);
        setPlanChangeCalc(null);
        setPlanChangeMsg(null);
      }, 1500);
    } catch (err: any) {
      setPlanChangeMsg({ type: 'error', text: err.message || 'Error executing plan change' });
    } finally {
      setIsApplyingChange(false);
    }
  };

  const handleCalculateProration = async () => {
    if (!prorationModalSub || !prorationTargetPlanId) return;
    try {
      const res = await fetch(`/api/subscriptions/${prorationModalSub.id}/prorate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPlanId: prorationTargetPlanId,
          daysUsed: 12,
          totalDaysInPeriod: 30,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProrationResult(data);
      }
    } catch (err) {
      console.error('Error calculating proration', err);
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: newSubCustomerId,
          planId: newSubPlanId,
          quantity: Number(newSubQty),
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewSubCustomerId('');
        setNewSubPlanId('');
        await fetchData();
      }
    } catch (err) {
      console.error('Error creating subscription', err);
    }
  };

  const filteredSubs = subscriptions.filter(sub => {
    if (filterStatus !== 'all' && sub.status.toLowerCase() !== filterStatus.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        sub.subscriptionNumber.toLowerCase().includes(q) ||
        sub.customerName.toLowerCase().includes(q) ||
        sub.planName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <MotionView className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center">
              <Layers className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            </div>
            Subscription Lifecycle & Journey
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end recurring subscription states, automated billing dates, and proration adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAdmin && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              Read-Only Staff View
            </span>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Subscription</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SUB-..., customer, or plan..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['all', 'Active', 'Paused', 'Closed', 'Draft'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer capitalize ${
                filterStatus.toLowerCase() === status.toLowerCase()
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-semibold">Subscription No.</th>
                <th className="py-3 px-4 font-semibold">Customer / Account</th>
                <th className="py-3 px-4 font-semibold">Plan & Cadence</th>
                <th className="py-3 px-4 font-semibold">Next Billing</th>
                <th className="py-3 px-4 font-semibold text-right">Value (INR)</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No subscriptions matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSubs.map(sub => (
                  <tr
                    key={sub.id}
                    onClick={() => setSelectedSub(sub)}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                      {sub.subscriptionNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {sub.customerName}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">{sub.planName}</div>
                      <div className="text-[11px] text-slate-400 font-mono capitalize">{sub.billingFrequency} billing</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {sub.nextBillingDate}
                    </td>
                    <td className="py-3 px-4 font-mono text-right font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatINR(sub.totalPaise)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          sub.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : sub.status === 'Paused'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : sub.status === 'Closed'
                            ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {isAdmin && sub.status === 'Active' && (
                          <button
                            onClick={() => handlePause(sub)}
                            title="Pause Subscription"
                            className="p-1 rounded text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isAdmin && sub.status === 'Paused' && (
                          <button
                            onClick={() => handleResume(sub)}
                            title="Resume Subscription"
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isAdmin && sub.status === 'Active' && (
                          <button
                            type="button"
                            onClick={() => handleOpenPlanChange(sub)}
                            title="Upgrade / Downgrade Plan"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 dark:text-teal-300 transition-colors cursor-pointer"
                          >
                            <TrendingUp className="w-3 h-3" />
                            <span>Change Plan</span>
                          </button>
                        )}
                        {sub.status === 'Active' && (
                          <button
                            onClick={() => {
                              setProrationModalSub(sub);
                              setProrationResult(null);
                            }}
                            title="Proration Calculator"
                            className="p-1 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isAdmin && sub.status !== 'Closed' && (
                          <button
                            onClick={() => {
                              setCloseModalSub(sub);
                              setCloseReason('');
                            }}
                            title="Close Subscription"
                            className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscription Lifecycle Journey Track Modal / Drawer */}
      <AnimatePresence>
        {selectedSub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedSub.subscriptionNumber}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-mono">
                      {selectedSub.billingFrequency}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedSub.customerName} · {selectedSub.planName}</p>
                </div>
                <button
                  onClick={() => setSelectedSub(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* SECTION 8: Visual Journey Track with Animated Flow */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300 font-mono">
                    Visual Subscription Journey Track
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    State: {selectedSub.status}
                  </span>
                </div>
                
                <div className="flex items-center justify-between relative pt-2 px-2">
                  {/* Connecting track line */}
                  <div className="absolute left-8 right-8 top-6 h-1 bg-slate-100 dark:bg-slate-800 rounded-full -z-0" />
                  
                  {/* Animated flowing gradient active beam */}
                  <div className="absolute left-8 right-8 top-6 h-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-600 rounded-full opacity-60 -z-0 animate-pulse" />

                  {['Draft', 'Quotation', 'Confirmed', 'Active', 'Closed'].map((stage, idx) => {
                    const isCurrent = selectedSub.status === stage;
                    const isPassed =
                      (selectedSub.status === 'Active' && idx <= 3) ||
                      (selectedSub.status === 'Closed' && idx <= 4) ||
                      (selectedSub.status === 'Confirmed' && idx <= 2);

                    return (
                      <div key={stage} className="flex flex-col items-center relative z-10">
                        <div
                          className={`relative w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                            isCurrent
                              ? 'bg-[#0F766E] text-white ring-4 ring-teal-200 dark:ring-teal-900/60 scale-110'
                              : isPassed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isCurrent && (
                            <span className="absolute -inset-1 rounded-full border border-teal-400 animate-ping opacity-35" />
                          )}
                          {isPassed && !isCurrent ? '✓' : idx + 1}
                        </div>
                        <span className={`text-[11px] font-medium mt-2 ${isCurrent ? 'text-teal-700 dark:text-teal-300 font-bold' : 'text-slate-500'}`}>
                          {stage}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Subscription Line Snapshot */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                  Active Line Items
                </span>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                  {selectedSub.lines.map((l, i) => (
                    <div key={i} className="p-3 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40 border-b last:border-b-0 border-slate-100 dark:border-slate-800/60">
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{l.productName}</div>
                        {l.variantLabel && <div className="text-[11px] text-slate-400">Variant: {l.variantLabel}</div>}
                      </div>
                      <div className="text-right font-mono">
                        <div className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatINR(l.lineTotalPaise)}</div>
                        <div className="text-[11px] text-slate-400">Qty: {l.quantity} · Tax: {l.taxRatePercent}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status History Audit Log */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                  Lifecycle Transition History
                </span>
                <div className="space-y-2 text-xs max-h-48 overflow-y-auto">
                  {selectedSub.statusHistory.map((ev, i) => (
                    <div key={i} className="flex items-start justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <div className="space-y-0.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          Transition: {ev.fromStatus} → <span className="text-teal-700 dark:text-teal-300 font-bold">{ev.toStatus}</span>
                        </div>
                        {ev.reason && <div className="text-slate-500 text-[11px]">{ev.reason}</div>}
                      </div>
                      <div className="text-right text-[11px] text-slate-400 font-mono">
                        <div>{ev.actor}</div>
                        <div>{new Date(ev.timestamp).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: Plan Change History */}
              {(selectedSub as any).planChangeHistory && (selectedSub as any).planChangeHistory.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300 font-mono flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Plan Change History
                  </span>
                  <div className="space-y-2 text-xs">
                    {(selectedSub as any).planChangeHistory.map((pch: any) => (
                      <div key={pch.id} className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/40 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                              pch.changeType === 'Upgrade'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {pch.changeType}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {pch.fromPlanName} → {pch.toPlanName}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Effective Date: <strong className="font-mono text-slate-700 dark:text-slate-300">{pch.effectiveDate}</strong> · Prorated Adjustment: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatINR(pch.adjustmentPaise)}</strong>
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-slate-400 font-mono">
                          <div>{pch.actor}</div>
                          <div>{new Date(pch.executedAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 3: Dedicated Plan Upgrade & Downgrade Modal */}
      {planChangeSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Subscription Plan Upgrade / Downgrade
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calculate and confirm mid-cycle plan changes for <strong className="text-slate-800 dark:text-slate-200 font-mono">{planChangeSub.subscriptionNumber}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPlanChangeSub(null);
                  setPlanChangeCalc(null);
                  setPlanChangeMsg(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Current vs Proposed Plan Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-mono">Current Plan</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {planChangeSub.planName}
                </div>
                <div className="text-xs font-mono font-semibold text-teal-700 dark:text-teal-400 mt-1">
                  {formatINR(planChangeSub.totalPaise)} / {planChangeSub.billingFrequency}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Customer: {planChangeSub.customerName}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Upgrade / Downgrade Plan
                </label>
                <select
                  value={targetPlanId}
                  onChange={e => {
                    setTargetPlanId(e.target.value);
                    setPlanChangeCalc(null);
                  }}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="">-- Choose Target Plan --</option>
                  {plans.map(p => {
                    const isHigher = p.pricePaise > planChangeSub.totalPaise;
                    const isSame = p.id === planChangeSub.planId;
                    return (
                      <option key={p.id} value={p.id} disabled={isSame}>
                        {p.name} ({formatINR(p.pricePaise)}/{p.billingFrequency}) {isSame ? '(Current)' : isHigher ? '▲ Upgrade' : '▼ Downgrade'}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Select a tier to evaluate price delta, GST, and proration.
                </p>
              </div>
            </div>

            {/* Action to Calculate */}
            {!planChangeCalc && (
              <button
                type="button"
                onClick={handleCalculatePlanChange}
                disabled={!targetPlanId || isCalculatingChange}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isCalculatingChange ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                <span>Calculate Plan Change & Proration</span>
              </button>
            )}

            {/* Plan Change Calculation Breakdown */}
            {planChangeCalc && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Change Classification</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                      planChangeCalc.changeType === 'Upgrade'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                    }`}>
                      {planChangeCalc.changeType === 'Upgrade' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {planChangeCalc.changeType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Current Value (incl. GST):</span>
                      <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {formatINR(planChangeCalc.currentPlanValuePaise)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Proposed Value (incl. GST):</span>
                      <div className="font-mono font-semibold text-teal-700 dark:text-teal-400">
                        {formatINR(planChangeCalc.proposedPlanValuePaise)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div>
                      <span className="text-slate-500">Gross Price Delta:</span>
                      <div className={`font-mono font-semibold ${planChangeCalc.priceDifferencePaise >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-amber-600'}`}>
                        {planChangeCalc.priceDifferencePaise >= 0 ? '+' : ''}{formatINR(planChangeCalc.priceDifferencePaise)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Effective Date:</span>
                      <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {planChangeCalc.effectiveDate}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">Prorated Net Adjustment (15 Days):</span>
                      <span className="font-mono font-bold text-teal-800 dark:text-teal-300 text-sm">
                        {formatINR(planChangeCalc.proratedAdjustmentPaise)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>{planChangeCalc.changeType === 'Upgrade' ? 'Immediate Amount Payable:' : 'Credit Adjustment to Ledger:'}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {planChangeCalc.changeType === 'Upgrade'
                          ? formatINR(planChangeCalc.finalAmountPayablePaise)
                          : formatINR(planChangeCalc.creditAdjustmentPaise)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Explicit Confirmation Section */}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{planChangeCalc.confirmationPrompt}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Executing this transition will update the subscription plan, record the proration difference, and log an immutable audit event in the compliance trail.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPlanChangeCalc(null)}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      No, Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyPlanChange}
                      disabled={isApplyingChange}
                      className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {isApplyingChange ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Yes, Confirm Plan Change</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {planChangeMsg && (
              <div className={`p-3 rounded-lg text-xs font-semibold ${
                planChangeMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300'
              }`}>
                {planChangeMsg.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Proration Calculator Modal */}
      {prorationModalSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-600" />
                Proration & Mid-Cycle Plan Change
              </h3>
              <button onClick={() => setProrationModalSub(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <p className="text-xs text-slate-500">
              Calculate fair credit/charge for mid-cycle plan changes for <strong className="text-slate-700 dark:text-slate-300">{prorationModalSub.subscriptionNumber}</strong>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Upgrade / Downgrade Plan
              </label>
              <select
                value={prorationTargetPlanId}
                onChange={e => setProrationTargetPlanId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="">-- Choose New Plan --</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatINR(p.pricePaise)}/{p.billingFrequency})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCalculateProration}
              disabled={!prorationTargetPlanId}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Calculate Prorated Adjustment Line
            </button>

            {prorationResult && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Unused Credit (Old Plan):</span>
                  <span className="font-mono text-emerald-600 font-semibold">
                    +{formatINR(prorationResult.proration.refundCreditPaise)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Remaining Charge (New Plan):</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                    -{formatINR(prorationResult.proration.chargePaise)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold text-sm">
                  <span>Net Proration Adjustment:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {formatINR(prorationResult.proration.netAdjustmentPaise)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Close Subscription Modal with Mandatory Reason */}
      {closeModalSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-rose-600 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Close Subscription {closeModalSub.subscriptionNumber}
            </h3>
            <p className="text-xs text-slate-500">
              Closing a subscription halts all future automated billing cycles. Please record an authorized closure reason for compliance.
            </p>
            <textarea
              value={closeReason}
              onChange={e => setCloseReason(e.target.value)}
              placeholder="e.g., Client completed trial, requested early termination per contract Section 4..."
              className="w-full h-24 text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              required
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCloseModalSub(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleClose}
                disabled={!closeReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Confirm Closure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Subscription Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Create New Direct Subscription
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400">✕</button>
            </div>
            <form onSubmit={handleCreateSubscription} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Customer</label>
                <select
                  value={newSubCustomerId}
                  onChange={e => setNewSubCustomerId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName} ({c.customerNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Subscription Plan</label>
                <select
                  value={newSubPlanId}
                  onChange={e => setNewSubPlanId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="">-- Choose Plan --</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - {formatINR(p.pricePaise)}/{p.billingFrequency}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={newSubQty}
                  onChange={e => setNewSubQty(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-500 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Create & Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MotionView>
  );
};
