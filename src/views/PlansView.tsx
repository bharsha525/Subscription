/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  History,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  Search,
  Calendar,
  Sparkles
} from 'lucide-react';
import { SubscriptionPlan, Product } from '../types/index.ts';
import { formatINR, paiseToRupees, rupeesToPaise } from '../utils/finance.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface PlansViewProps {
  onNavigate: (view: string) => void;
}

export const PlansView: React.FC<PlansViewProps> = ({ onNavigate }) => {
  const { isAdmin } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [frequencyFilter, setFrequencyFilter] = useState('all');

  // Versioning Edit Modal
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [newPriceRupees, setNewPriceRupees] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [applyToNewOnly, setApplyToNewOnly] = useState(true);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [productId, setProductId] = useState('');
  const [cadence, setCadence] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [priceRupees, setPriceRupees] = useState('45000');
  const [description, setDescription] = useState('');
  const [allowPause, setAllowPause] = useState(true);
  const [allowEarlyClosure, setAllowEarlyClosure] = useState(true);
  const [autoCloseAtEndDate, setAutoCloseAtEndDate] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resPlans, resProds] = await Promise.all([
        fetch('/api/plans'),
        fetch('/api/products'),
      ]);
      const dataPlans = await resPlans.json();
      const dataProds = await resProds.json();

      setPlans(dataPlans.plans || []);
      setProducts(dataProds.products || []);
    } catch (err) {
      console.error('Failed to load plans', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      const res = await fetch(`/api/plans/${editingPlan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricePaise: rupeesToPaise(newPriceRupees),
          changeSummary,
          applyToNewOnly,
        }),
      });
      if (res.ok) {
        setEditingPlan(null);
        await fetchData();
      }
    } catch (err) {
      console.error('Error versioning plan', err);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          productId,
          billingFrequency: cadence,
          pricePaise: rupeesToPaise(priceRupees),
          description,
          behavior: {
            autoCloseAtEndDate,
            allowEarlyClosure,
            allowPause,
            allowRenewal: true,
          },
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setName('');
        setDescription('');
        await fetchData();
      }
    } catch (err) {
      console.error('Error creating plan', err);
    }
  };

  const filtered = plans.filter(p => {
    if (frequencyFilter !== 'all' && p.billingFrequency !== frequencyFilter) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Subscription Plans & Versioning
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure Daily, Weekly, Monthly, and Yearly recurring packages with immutable version history and grandfathering safeguards.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Plan</span>
          </button>
        )}
      </div>

      {/* Cadence Filters */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs w-fit">
        {['all', 'daily', 'weekly', 'monthly', 'yearly'].map(f => (
          <button
            key={f}
            onClick={() => setFrequencyFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer capitalize ${
              frequencyFilter === f
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Plans Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(plan => {
          const product = products.find(p => p.id === plan.productId);
          return (
            <div
              key={plan.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-indigo-400 dark:hover:border-indigo-600 transition-all space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                    {plan.billingFrequency}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                    v{plan.versions.length}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                    Product: {product?.name || 'ERP Suite'}
                  </div>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                    {plan.description}
                  </p>
                </div>

                {/* Price Display */}
                <div className="py-2 border-y border-slate-100 dark:border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                      {formatINR(plan.pricePaise)}
                    </span>
                    <span className="text-xs text-slate-400">/{plan.billingFrequency}</span>
                  </div>
                </div>

                {/* Behavior Rules */}
                <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className={plan.behavior.allowPause ? 'text-emerald-500' : 'text-slate-300'}>●</span>
                    <span>Customer Pause Allowed: {plan.behavior.allowPause ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={plan.behavior.allowEarlyClosure ? 'text-emerald-500' : 'text-slate-300'}>●</span>
                    <span>Early Closure: {plan.behavior.allowEarlyClosure ? 'Permitted' : 'Strict Term'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={plan.behavior.autoCloseAtEndDate ? 'text-amber-500' : 'text-slate-300'}>●</span>
                    <span>Auto-Close at Term End: {plan.behavior.autoCloseAtEndDate ? 'Enabled' : 'Perpetual Recurring'}</span>
                  </div>
                </div>

                {/* Version History preview */}
                {plan.versions.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                    <span className="font-semibold block text-[10px] uppercase text-slate-400">Latest Version Change:</span>
                    <span className="line-clamp-1 italic">{plan.versions[plan.versions.length - 1].changeSummary}</span>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Min Qty: {plan.minimumQuantity}</span>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEditingPlan(plan);
                      setNewPriceRupees(paiseToRupees(plan.pricePaise).toString());
                      setChangeSummary('');
                    }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Create New Version
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 5: Plan Versioning Modal with Grandfathering Preview */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Create New Plan Version (v{editingPlan.versions.length + 1})
              </h3>
              <button onClick={() => setEditingPlan(null)} className="text-slate-400">✕</button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Per Section 5 plan versioning rules, updating prices creates an immutable new version with an effective date. Existing subscriptions and confirmed invoices will retain their historical price snapshots.
            </p>

            <form onSubmit={handleSaveVersion} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Price (INR ₹)
                </label>
                <input
                  type="number"
                  required
                  value={newPriceRupees}
                  onChange={e => setNewPriceRupees(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Change Summary / Audit Justification
                </label>
                <textarea
                  required
                  value={changeSummary}
                  onChange={e => setChangeSummary(e.target.value)}
                  placeholder="e.g. Annual price adjustment + addition of priority support SLA..."
                  className="w-full h-18 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Grandfathering Toggle */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Grandfathering Policy
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gf"
                    checked={applyToNewOnly}
                    onChange={() => setApplyToNewOnly(true)}
                  />
                  <span>Apply to new subscriptions only (Grandfather existing active subscribers)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gf"
                    checked={!applyToNewOnly}
                    onChange={() => setApplyToNewOnly(false)}
                  />
                  <span>Apply at next renewal date for existing active subscribers</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 text-slate-500 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Publish New Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Create New Subscription Plan
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. ERP Professional Monthly"
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Product</label>
                  <select
                    value={productId}
                    onChange={e => setProductId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Billing Frequency</label>
                  <select
                    value={cadence}
                    onChange={e => setCadence(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={priceRupees}
                    onChange={e => setPriceRupees(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Plan Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full h-16 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Behavior Settings */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Plan Behavior Rules
                </span>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowPause}
                      onChange={e => setAllowPause(e.target.checked)}
                    />
                    <span>Allow customer self-service pause</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowEarlyClosure}
                      onChange={e => setAllowEarlyClosure(e.target.checked)}
                    />
                    <span>Allow early closure before contract term</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCloseAtEndDate}
                      onChange={e => setAutoCloseAtEndDate(e.target.checked)}
                    />
                    <span>Auto-close upon reaching expiry date</span>
                  </label>
                </div>
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
