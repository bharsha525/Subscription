/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  Printer,
  CreditCard,
  XCircle,
  RotateCcw,
  Eye,
  Send,
  Mail,
  MessageSquare,
  Check,
  RefreshCw
} from 'lucide-react';
import { Invoice } from '../types/index.ts';
import { formatINR } from '../utils/finance.ts';
import { InvoiceModal } from '../components/common/InvoiceModal.tsx';
import { PaymentModal } from '../components/common/PaymentModal.tsx';
import { SmsModal } from '../components/common/SmsModal.tsx';
import { useAuth } from '../context/AuthContext.tsx';

import { openGmailCompose } from '../utils/email.ts';

interface InvoicesViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ onNavigate }) => {
  const { isStaff, isAdmin, isCustomer } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Preview, Payment & SMS Modals
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [smsModalInvoice, setSmsModalInvoice] = useState<Invoice | null>(null);

  // SECTION 5: Request Payment Modal state
  const [requestingPaymentInvoice, setRequestingPaymentInvoice] = useState<Invoice | null>(null);
  const [requestChannel, setRequestChannel] = useState<'email' | 'sms'>('email');
  const [requestNote, setRequestNote] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cancellation Modal
  const [cancellingInvoice, setCancellingInvoice] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(new Date().toLocaleTimeString());
  const [refreshFeedback, setRefreshFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setRefreshFeedback(null);
      const res = await fetch('/api/invoices');
      if (!res.ok) throw new Error('Failed to fetch invoice records.');
      const data = await res.json();
      setInvoices(data.invoices || []);
      setLastRefreshTime(new Date().toLocaleTimeString());
      setRefreshFeedback({ type: 'success', text: `Invoices updated (${data.invoices?.length || 0} records retrieved).` });
      setTimeout(() => setRefreshFeedback(null), 3000);
    } catch (err: any) {
      console.error('Failed to load invoices', err);
      setRefreshFeedback({ type: 'error', text: err.message || 'Error occurred while loading invoices.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendPaymentRequest = async () => {
    if (!requestingPaymentInvoice) return;
    try {
      setIsSendingRequest(true);

      if (requestChannel === 'sms') {
        const inv = requestingPaymentInvoice;
        setRequestingPaymentInvoice(null);
        setSmsModalInvoice(inv);
        setIsSendingRequest(false);
        return;
      }

      if (requestChannel === 'email') {
        const recipient = requestingPaymentInvoice.customerEmail || 'billing@customer.com';
        const subject = `Payment Request: Tax Invoice ${requestingPaymentInvoice.invoiceNumber}`;
        const body = requestNote || `Dear ${requestingPaymentInvoice.customerName},\n\nThis is an official request for payment regarding invoice ${requestingPaymentInvoice.invoiceNumber}.\nOutstanding Balance: ${formatINR(requestingPaymentInvoice.outstandingBalancePaise)}\nDue Date: ${requestingPaymentInvoice.dueDate}\n\nPlease proceed to payment through your customer portal or settle via company banking transfer.\n\nThank you,\nBrightloop Revenue Operations`;

        openGmailCompose({ to: recipient, subject, body });

        await fetch(`/api/invoices/${requestingPaymentInvoice.id}/request-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: 'email',
            notes: requestNote,
            requestedAmountPaise: requestingPaymentInvoice.outstandingBalancePaise,
          }),
        });

        setRequestFeedback({
          type: 'success',
          text: `Redirected to Gmail composer for ${requestingPaymentInvoice.customerName}. Please send the email directly from Gmail.`,
        });
        await fetchInvoices();
        setTimeout(() => {
          setRequestingPaymentInvoice(null);
          setRequestFeedback(null);
        }, 4000);
      } else {
        const res = await fetch(`/api/invoices/${requestingPaymentInvoice.id}/request-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: requestChannel,
            notes: requestNote,
            requestedAmountPaise: requestingPaymentInvoice.outstandingBalancePaise,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setRequestFeedback({
            type: 'success',
            text: `Payment request dispatched to ${requestingPaymentInvoice.customerName} via ${(requestChannel as string).toUpperCase()}!`,
          });
          await fetchInvoices();
          setTimeout(() => {
            setRequestingPaymentInvoice(null);
            setRequestFeedback(null);
          }, 1500);
        } else {
          setRequestFeedback({ type: 'error', text: data.error || 'Failed to dispatch payment request' });
        }
      }
    } catch (err: any) {
      setRequestFeedback({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setIsSendingRequest(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleConfirm = async (invoice: Invoice) => {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/confirm`, {
        method: 'POST',
      });
      if (res.ok) await fetchInvoices();
    } catch (err) {
      console.error('Error confirming invoice', err);
    }
  };

  const handleCancel = async () => {
    if (!cancellingInvoice || !cancelReason.trim()) return;
    try {
      const res = await fetch(`/api/invoices/${cancellingInvoice.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      if (res.ok) {
        setCancellingInvoice(null);
        setCancelReason('');
        await fetchInvoices();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to cancel invoice');
      }
    } catch (err) {
      console.error('Error cancelling invoice', err);
    }
  };

  const filtered = invoices.filter(inv => {
    if (statusFilter !== 'all' && inv.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        (inv.subscriptionNumber && inv.subscriptionNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Invoice Operations & GST Ledgers
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable financial snapshots, automated line item breakdowns, and settlement tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Last synced: {lastRefreshTime}
          </span>
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh invoices from backend"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Invoices'}</span>
          </button>
        </div>
      </div>

      {refreshFeedback && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
          refreshFeedback.type === 'success'
            ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        }`}>
          <span>{refreshFeedback.text}</span>
          <button onClick={() => setRefreshFeedback(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Invoice Counts & Outstanding Balance Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-slate-500 font-medium">Total Invoices</span>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
            {invoices.length}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-slate-500 font-medium">Settled / Paid</span>
          <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
            {invoices.filter(i => i.status === 'Paid').length}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-slate-500 font-medium">Overdue Invoices</span>
          <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
            {invoices.filter(i => i.status === 'Overdue').length}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-slate-500 font-medium">Total Outstanding</span>
          <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
            {formatINR(invoices.reduce((sum, i) => sum + (i.status !== 'Cancelled' ? i.outstandingBalancePaise : 0), 0))}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search INV-..., customer, or subscription..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['all', 'Confirmed', 'Paid', 'Partially Paid', 'Overdue', 'Draft', 'Cancelled'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer capitalize ${
                statusFilter.toLowerCase() === st.toLowerCase()
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-semibold">Invoice No.</th>
                <th className="py-3 px-4 font-semibold">Customer / Account</th>
                <th className="py-3 px-3 font-semibold">Period</th>
                <th className="py-3 px-3 font-semibold">Due Date</th>
                <th className="py-3 px-4 font-semibold text-right">Total (INR)</th>
                <th className="py-3 px-4 font-semibold text-right">Balance Due</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No invoices matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{inv.customerName}</div>
                      {inv.subscriptionNumber && (
                        <div className="text-[11px] text-slate-400 font-mono">{inv.subscriptionNumber}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">{inv.billingPeriod}</td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">{inv.dueDate}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatINR(inv.totalPaise)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                      <span className={inv.outstandingBalancePaise > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}>
                        {formatINR(inv.outstandingBalancePaise)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : inv.status === 'Partially Paid'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                            : inv.status === 'Overdue'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            : inv.status === 'Cancelled'
                            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          title="Print / View Tax Invoice"
                          className="p-1 rounded text-slate-600 dark:text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Admin & Staff distinct Request Payment vs Admin Record Payment */}
                        {!isCustomer && inv.outstandingBalancePaise > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setRequestingPaymentInvoice(inv);
                                setRequestChannel('email');
                                setRequestNote(`Payment request for invoice ${inv.invoiceNumber} with outstanding balance of ${formatINR(inv.outstandingBalancePaise)}.`);
                                setRequestFeedback(null);
                              }}
                              title="Request Payment via Email"
                              className="p-1 rounded text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const prefillData = {
                                  phone: (inv as any).phone || '+91 98450 12345',
                                  customerName: inv.customerName,
                                  customerId: inv.customerId,
                                  message: `Dear ${inv.customerName}, payment reminder: invoice ${inv.invoiceNumber} of ${formatINR(inv.outstandingBalancePaise)} is due on ${inv.dueDate}. Settle securely: https://brightloop.io/pay/${inv.invoiceNumber} - BRTLOP`,
                                };
                                try {
                                  sessionStorage.setItem('sms_prefill', JSON.stringify(prefillData));
                                } catch (e) {}
                                onNavigate('sms', prefillData);
                              }}
                              title="Open SMS Gateway with customer mobile prefilled"
                              className="p-1.5 rounded-lg text-[#EAB308] hover:bg-[#0F172A] hover:text-[#EAB308] transition-colors cursor-pointer group"
                            >
                              <MessageSquare className="w-3.5 h-3.5 group-hover:drop-shadow-[0_0_6px_rgba(234,179,8,0.85)] transition-all" />
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setPayingInvoice(inv)}
                                title="Record Payment in Ledger (Admin Only)"
                                className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}

                        {/* Customer Self-Service Checkout */}
                        {isCustomer && inv.outstandingBalancePaise > 0 && (
                          <button
                            type="button"
                            onClick={() => setPayingInvoice(inv)}
                            title="Pay Outstanding Now"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Pay</span>
                          </button>
                        )}

                        {isAdmin && inv.status === 'Draft' && (
                          <button
                            type="button"
                            onClick={() => handleConfirm(inv)}
                            title="Confirm Draft Invoice"
                            className="p-1 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isAdmin && inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancellingInvoice(inv);
                              setCancelReason('');
                            }}
                            title="Cancel Invoice"
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

      {/* Invoice Printable View Modal */}
      <InvoiceModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onRequestPayment={(inv) => {
          setSelectedInvoice(null);
          setRequestingPaymentInvoice(inv);
          setRequestChannel('email');
          setRequestNote(`Payment request for invoice ${inv.invoiceNumber} with outstanding balance of ${formatINR(inv.outstandingBalancePaise)}.`);
          setRequestFeedback(null);
        }}
        onRecordPayment={(inv) => {
          setSelectedInvoice(null);
          setPayingInvoice(inv);
        }}
        isCustomer={isCustomer}
      />

      {/* SECTION 5: Request Payment Modal */}
      {requestingPaymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Request Payment — {requestingPaymentInvoice.invoiceNumber}
              </h3>
              <button
                type="button"
                onClick={() => setRequestingPaymentInvoice(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{requestingPaymentInvoice.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Outstanding Balance:</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {formatINR(requestingPaymentInvoice.outstandingBalancePaise)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Due Date:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{requestingPaymentInvoice.dueDate}</span>
              </div>
            </div>

            {/* Channel Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Dispatch Notification Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRequestChannel('email')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    requestChannel === 'email'
                      ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Email Dispatch</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRequestChannel('sms')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    requestChannel === 'sms'
                      ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>SMS Gateway</span>
                </button>
              </div>
            </div>

            {/* Notes / Message */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Message & Direct Payment Link
              </label>
              <textarea
                value={requestNote}
                onChange={e => setRequestNote(e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>

            {requestFeedback && (
              <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                requestFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
              }`}>
                {requestFeedback.text}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRequestingPaymentInvoice(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendPaymentRequest}
                disabled={isSendingRequest}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isSendingRequest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send Payment Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Settlement Modal */}
      <PaymentModal
        invoice={payingInvoice}
        onClose={() => setPayingInvoice(null)}
        onSuccess={() => {
          fetchInvoices();
        }}
        isCustomer={isCustomer}
      />

      {/* Cancel Invoice Modal */}
      {cancellingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-rose-600 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Cancel Invoice {cancellingInvoice.invoiceNumber}
            </h3>
            <p className="text-xs text-slate-500">
              Please enter an authorized reason. This will reverse the customer balance and record an immutable entry in the audit trail.
            </p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="e.g. Superseded by revised quote, billing dispute settled..."
              className="w-full h-20 text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancellingInvoice(null)}
                className="px-4 py-2 text-xs text-slate-500 font-medium"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={!cancelReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMS Gateway Modal Integration */}
      <SmsModal
        isOpen={!!smsModalInvoice}
        onClose={() => setSmsModalInvoice(null)}
        defaultCustomerName={smsModalInvoice?.customerName || ''}
        defaultCustomerId={smsModalInvoice?.customerId}
        defaultMessage={
          smsModalInvoice
            ? `Dear ${smsModalInvoice.customerName}, payment reminder: invoice ${smsModalInvoice.invoiceNumber} of ${formatINR(smsModalInvoice.outstandingBalancePaise)} is due on ${smsModalInvoice.dueDate}. Settle online: https://brightloop.io/pay/${smsModalInvoice.invoiceNumber} - BRTLOP`
            : ''
        }
        referenceType="invoice"
        referenceId={smsModalInvoice?.invoiceNumber}
      />
    </div>
  );
};
