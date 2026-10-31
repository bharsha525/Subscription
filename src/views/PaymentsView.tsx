/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle,
  Plus,
  RotateCcw,
  QrCode,
  Building,
  DollarSign
} from 'lucide-react';
import { Payment } from '../types/index.ts';
import { formatINR } from '../utils/finance.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface PaymentsViewProps {
  onNavigate: (view: string) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ onNavigate }) => {
  const { isStaff } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payments');
      const data = await res.json();
      setPayments(data.payments || []);
    } catch (err) {
      console.error('Failed to load payments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filtered = payments.filter(p => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.paymentNumber.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        p.invoiceNumber.toLowerCase().includes(q) ||
        p.transactionReference.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalCollected = payments.reduce((sum, p) => sum + (p.status === 'Success' ? p.allocatedPaise : 0), 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Payment Settlements & Allocations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Section 14: Multi-method payment allocations (UPI, Card, Bank wires, Cash) with partial payment & credit support.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Cash Realized</span>
            <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatINR(totalCollected)}
            </div>
          </div>
          <button
            onClick={() => onNavigate('invoices')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record via Invoices</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by PAY-..., UTR reference, customer or invoice..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden"
        />
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-semibold">Payment ID</th>
                <th className="py-3 px-4 font-semibold">Customer / Account</th>
                <th className="py-3 px-3 font-semibold">Method</th>
                <th className="py-3 px-4 font-semibold">Transaction Reference / UTR</th>
                <th className="py-3 px-3 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold text-right">Settled (INR)</th>
                <th className="py-3 px-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-sans">
                  <td className="py-3 px-4 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                    {p.paymentNumber}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                    <div>{p.customerName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">Allocated to {p.invoiceNumber}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {p.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                    {p.transactionReference}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">{p.paymentDate}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +{formatINR(p.amountPaise)}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
