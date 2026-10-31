/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Tag,
  Percent,
  Plus,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Calculator
} from 'lucide-react';
import { TaxRule, DiscountRule } from '../types/index.ts';
import { formatINR, paiseToRupees, rupeesToPaise } from '../utils/finance.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface RulesViewProps {
  onNavigate: (view: string) => void;
}

export const RulesView: React.FC<RulesViewProps> = ({ onNavigate }) => {
  const { isAdmin } = useAuth();
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(true);

  // New Discount Modal
  const [showDiscModal, setShowDiscModal] = useState(false);
  const [discName, setDiscName] = useState('');
  const [discCode, setDiscCode] = useState('');
  const [discType, setDiscType] = useState<'percentage' | 'fixed'>('percentage');
  const [discValue, setDiscValue] = useState('20');
  const [minSpendRupees, setMinSpendRupees] = useState('10000');

  // New Tax Modal
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxName, setTaxName] = useState('');
  const [taxRate, setTaxRate] = useState('18');

  const fetchRules = async () => {
    try {
      setLoading(true);
      const [resT, resD] = await Promise.all([
        fetch('/api/taxes'),
        fetch('/api/discounts'),
      ]);
      const dataT = await resT.json();
      const dataD = await resD.json();
      setTaxes(dataT.taxes || []);
      setDiscounts(dataD.discounts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const val = discType === 'percentage' ? Number(discValue) : rupeesToPaise(discValue);
      const res = await fetch('/api/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: discName,
          code: discCode,
          type: discType,
          value: val,
          minPurchaseAmountPaise: rupeesToPaise(minSpendRupees),
        }),
      });
      if (res.ok) {
        setShowDiscModal(false);
        setDiscName('');
        setDiscCode('');
        await fetchRules();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/taxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: taxName,
          ratePercent: Number(taxRate),
          isInclusive: false,
        }),
      });
      if (res.ok) {
        setShowTaxModal(false);
        setTaxName('');
        await fetchRules();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Percent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Tax & Promotional Discount Engines
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Sections 12 & 13: Admin-only configurations for GST/CGST/SGST breakdowns and promotional coupon rules with live limits.
        </p>
      </div>

      {/* Tax Rules Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Configured Tax Regimes (GST / VAT)
            </h3>
            <p className="text-xs text-slate-500">Sample GST configurations for domestic and inter-state subscriptions.</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowTaxModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Tax Rule</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {taxes.map(t => (
            <div key={t.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2 text-xs">
              <div className="flex justify-between items-start">
                <span className="font-bold text-slate-900 dark:text-white">{t.name}</span>
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{t.ratePercent}%</span>
              </div>
              <p className="text-[11px] text-slate-500">Applicability: {t.applicability}</p>
              {t.components && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 space-y-0.5 text-[11px] text-slate-400 font-mono">
                  {t.components.map((c, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{c.name}:</span>
                      <span>{c.ratePercent}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Discount Rules Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Promotional Discount Coupons & Eligibility
            </h3>
            <p className="text-xs text-slate-500">Discounts apply strictly before tax; line amounts can never become negative.</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowDiscModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Discount Rule</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {discounts.map(d => (
            <div key={d.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2 text-xs">
              <div className="flex justify-between items-start">
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950">
                  {d.code}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600">Active</span>
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{d.name}</div>
              <div className="font-mono text-slate-900 dark:text-white font-bold text-sm">
                {d.type === 'percentage' ? `${d.value}% OFF` : `${formatINR(d.value)} FLAT OFF`}
              </div>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex justify-between">
                <span>Usage: {d.timesUsed} {d.usageLimit ? `/ ${d.usageLimit}` : 'times'}</span>
                {d.minPurchaseAmountPaise && (
                  <span>Min: {formatINR(d.minPurchaseAmountPaise, { compact: true })}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Discount Modal */}
      {showDiscModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create Discount Rule</h3>
            <form onSubmit={handleCreateDiscount} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={discName}
                  onChange={e => setDiscName(e.target.value)}
                  placeholder="e.g. Black Friday Special"
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Promo Code</label>
                  <input
                    type="text"
                    required
                    value={discCode}
                    onChange={e => setDiscCode(e.target.value.toUpperCase())}
                    placeholder="BF30"
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Type</label>
                  <select
                    value={discType}
                    onChange={e => setDiscType(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Rupees (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Value ({discType === 'percentage' ? '%' : '₹'})
                  </label>
                  <input
                    type="number"
                    required
                    value={discValue}
                    onChange={e => setDiscValue(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Min Spend (₹)</label>
                  <input
                    type="number"
                    value={minSpendRupees}
                    onChange={e => setMinSpendRupees(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscModal(false)}
                  className="px-4 py-2 text-slate-500 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Tax Modal */}
      {showTaxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create Tax Rule</h3>
            <form onSubmit={handleCreateTax} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tax Name</label>
                <input
                  type="text"
                  required
                  value={taxName}
                  onChange={e => setTaxName(e.target.value)}
                  placeholder="e.g. IGST 18% Interstate"
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Rate Percentage (%)</label>
                <input
                  type="number"
                  required
                  value={taxRate}
                  onChange={e => setTaxRate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaxModal(false)}
                  className="px-4 py-2 text-slate-500 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Tax Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
