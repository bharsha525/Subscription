/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Send,
  CheckCircle,
  ArrowRight,
  Clock,
  Search,
  Box,
  Percent,
  Layers,
  Sparkles
} from 'lucide-react';
import { Quotation, QuotationTemplate, Customer, SubscriptionPlan, Product } from '../types/index.ts';
import { formatINR } from '../utils/finance.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { openGmailCompose } from '../utils/email.ts';

interface QuotationsViewProps {
  onNavigate: (view: string) => void;
}

export const QuotationsView: React.FC<QuotationsViewProps> = ({ onNavigate }) => {
  const { isStaff, isAdmin } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New Quote Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [notes, setNotes] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Preview / Send Modal
  const [selectedQuoteForPreview, setSelectedQuoteForPreview] = useState<Quotation | null>(null);
  const [sendingQuoteId, setSendingQuoteId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resQ, resT, resC, resP, resProd] = await Promise.all([
        fetch('/api/quotations'),
        fetch('/api/quotation-templates'),
        fetch('/api/customers'),
        fetch('/api/plans'),
        fetch('/api/products'),
      ]);
      const dataQ = await resQ.json();
      const dataT = await resT.json();
      const dataC = await resC.json();
      const dataP = await resP.json();
      const dataProd = await resProd.json();

      setQuotations(dataQ.quotations || []);
      setTemplates(dataT.templates || []);
      setCustomers(dataC.customers || []);
      setPlans(dataP.plans || []);
      setProducts(dataProd.products || []);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load quotation data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApplyTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = templates.find(t => t.id === tplId);
    if (tpl) {
      setSelectedPlanId(tpl.defaultPlanId);
      setPaymentTerms(tpl.paymentTerms);
      if (tpl.defaultDiscountCode) setDiscountCode(tpl.defaultDiscountCode);
    }
  };

  const handleSendQuotation = async (quote: Quotation) => {
    try {
      setSendingQuoteId(quote.id);
      const customer = customers.find(c => c.id === quote.customerId);
      const recipient = customer?.email || (quote as any).sentToEmail || 'client@enterprise.com';
      const subject = `Official Quotation ${quote.quotationNumber} from Brightloop Pulse`;
      const body = `Dear ${quote.customerName},\n\nPlease find attached the official quotation details for your proposal ${quote.quotationNumber}.\n\nPlan / Package: ${quote.planName}\nTotal Invoiced: ${formatINR(quote.totalPaise)} (inclusive of 18% GST)\nPayment Terms: ${quote.paymentTerms}\nValid Until: ${quote.validUntil}\n${quote.notes ? `\nNotes: ${quote.notes}\n` : ''}\nPlease review and confirm this quotation or complete your activation via the Brightloop Client Portal.\n\nBest regards,\nBrightloop Revenue Operations`;

      // Update record status on backend
      await fetch(`/api/quotations/${quote.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recipient }),
      });

      // Redirect user to Gmail with recipient and subject/body prefilled
      openGmailCompose({
        to: recipient,
        subject,
        body,
      });

      setActionFeedback(`Redirected to Gmail composer for ${recipient}. Please send the email directly from Gmail.`);
      await fetchData();
      if (selectedQuoteForPreview?.id === quote.id) {
        setSelectedQuoteForPreview(prev => prev ? { ...prev, status: 'Sent' } : null);
      }
    } catch (err) {
      console.error('Error redirecting to Gmail for quotation', err);
      setActionFeedback('Failed to open Gmail composer.');
    } finally {
      setSendingQuoteId(null);
      setTimeout(() => setActionFeedback(null), 7000);
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          planId: selectedPlanId,
          templateId: selectedTemplateId || undefined,
          discountCode: discountCode || undefined,
          paymentTerms,
          notes,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setSelectedCustomerId('');
        setSelectedPlanId('');
        setDiscountCode('');
        setActionFeedback('Quotation successfully generated.');
        setTimeout(() => setActionFeedback(null), 5000);
        await fetchData();
      }
    } catch (err) {
      console.error('Error creating quotation', err);
    }
  };

  const handleConfirmQuote = async (quote: Quotation) => {
    try {
      const res = await fetch(`/api/quotations/${quote.id}/confirm`, { method: 'POST' });
      if (res.ok) {
        setActionFeedback(`Quotation ${quote.quotationNumber} confirmed.`);
        setTimeout(() => setActionFeedback(null), 4000);
        await fetchData();
      }
    } catch (err) {
      console.error('Error confirming quote', err);
    }
  };

  const handleConvertQuote = async (quote: Quotation) => {
    try {
      const res = await fetch(`/api/quotations/${quote.id}/convert`, { method: 'POST' });
      if (res.ok) {
        setActionFeedback(`Quotation ${quote.quotationNumber} converted to active subscription!`);
        await fetchData();
        setTimeout(() => {
          onNavigate('subscriptions');
        }, 800);
      }
    } catch (err) {
      console.error('Error converting quote', err);
    }
  };

  const filteredQuotes = quotations.filter(q => {
    if (searchQuery) {
      const qLower = searchQuery.toLowerCase();
      return (
        q.quotationNumber.toLowerCase().includes(qLower) ||
        q.customerName.toLowerCase().includes(qLower) ||
        q.planName.toLowerCase().includes(qLower)
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
            Quotations & Proposal Pipeline
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Section 8: Build enterprise proposals with variant pricing, discount rules, automated GST calculation, customer email dispatch, and 1-click subscription conversion.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Updated: {lastRefreshed}</span>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh Quotations"
          >
            <Clock className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Quotation</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-indigo-500 hover:text-indigo-700 p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Reusable Template Quick Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(tpl => (
          <div
            key={tpl.id}
            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Preset Package
              </span>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{tpl.name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{tpl.description}</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  handleApplyTemplate(tpl.id);
                  setShowCreateModal(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-medium shrink-0 transition-colors cursor-pointer"
              >
                Use Template
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by quote reference, customer or plan..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden"
        />
      </div>

      {/* Quotations Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-semibold">Quote Reference</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Plan</th>
                <th className="py-3 px-3 font-semibold">Valid Until</th>
                <th className="py-3 px-4 font-semibold text-right">Total Payable</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No quotations found.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                      <button
                        onClick={() => setSelectedQuoteForPreview(q)}
                        className="hover:underline text-left cursor-pointer"
                        title="Click to preview quotation"
                      >
                        {q.quotationNumber}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{q.customerName}</td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{q.planName}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{q.validUntil}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatINR(q.totalPaise)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                          q.status === 'Converted'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : q.status === 'Confirmed'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                            : q.status === 'Sent'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Preview Quote Button */}
                        <button
                          onClick={() => setSelectedQuoteForPreview(q)}
                          className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded font-medium text-[11px] transition-colors cursor-pointer"
                        >
                          Preview / Print
                        </button>

                        {/* Send Quotation to Customer (Staff and Admin can dispatch email to client) */}
                        <button
                          onClick={() => handleSendQuotation(q)}
                          disabled={sendingQuoteId === q.id}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          <Send className={`w-3 h-3 ${sendingQuoteId === q.id ? 'animate-pulse' : ''}`} />
                          <span>{sendingQuoteId === q.id ? 'Sending...' : 'Send Email'}</span>
                        </button>

                        {isAdmin && q.status === 'Draft' && (
                          <button
                            onClick={() => handleConfirmQuote(q)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          >
                            Confirm
                          </button>
                        )}

                        {isAdmin && (q.status === 'Confirmed' || q.status === 'Sent') && (
                          <button
                            onClick={() => handleConvertQuote(q)}
                            className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                          >
                            <span>Convert</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {q.status === 'Converted' && (
                          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            Converted ✓
                          </span>
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

      {/* Quotation Detail / Printable PDF Preview Modal */}
      {selectedQuoteForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Actions Bar (Non-printable) */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 uppercase">
                  {selectedQuoteForPreview.status}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Ref: {selectedQuoteForPreview.quotationNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setSelectedQuoteForPreview(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 text-sm font-mono cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-lg tracking-tight">
                    <Sparkles className="w-5 h-5" />
                    <span>BRIGHTLOOP PULSE</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enterprise Subscription & Recurring Revenue Operations<br />
                    GSTIN: 29AAAAA0000A1Z5 | Bangalore, Karnataka, India
                  </p>
                </div>
                <div className="text-right">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    Official Quotation
                  </h2>
                  <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                    {selectedQuoteForPreview.quotationNumber}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Date: {selectedQuoteForPreview.createdAt?.split('T')[0] || '2026-10-31'}
                  </p>
                  <p className="text-[11px] text-rose-600 font-medium">
                    Valid Until: {selectedQuoteForPreview.validUntil}
                  </p>
                </div>
              </div>

              {/* Recipient and Terms */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Prepared For
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedQuoteForPreview.customerName}
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Account: #{selectedQuoteForPreview.customerId}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Commercial Terms
                  </span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Payment Terms: {selectedQuoteForPreview.paymentTerms || 'Net 30 Days'}
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Billing: Recurring monthly / annual
                  </p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <tr>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Plan Tier</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedQuoteForPreview.planName}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Enterprise platform license with automated billing, reconciliation and API access
                        </div>
                      </td>
                      <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                        Primary Plan
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {formatINR(selectedQuoteForPreview.subtotalPaise)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Financial Breakup */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Base Subtotal:</span>
                    <span className="font-mono">{formatINR(selectedQuoteForPreview.subtotalPaise)}</span>
                  </div>
                  {selectedQuoteForPreview.discountAmountPaise > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount Applied:</span>
                      <span className="font-mono">-{formatINR(selectedQuoteForPreview.discountAmountPaise)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>GST (18% - CGST 9% + SGST 9%):</span>
                    <span className="font-mono">{formatINR(selectedQuoteForPreview.taxAmountPaise)}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                    <span>Total Invoiced:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      {formatINR(selectedQuoteForPreview.totalPaise)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedQuoteForPreview.notes && (
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                  <span className="font-bold block text-[10px] uppercase tracking-wider mb-0.5">Notes & SLA:</span>
                  {selectedQuoteForPreview.notes}
                </div>
              )}

              {/* Footer / Conversion Controls */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[11px] text-slate-400">
                  Generated via Brightloop Billing Engine. Quote valid through {selectedQuoteForPreview.validUntil}.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSendQuotation(selectedQuoteForPreview)}
                    disabled={sendingQuoteId === selectedQuoteForPreview.id}
                    className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold rounded-xl text-xs hover:bg-indigo-100 cursor-pointer"
                  >
                    {sendingQuoteId === selectedQuoteForPreview.id ? 'Sending...' : 'Send to Customer'}
                  </button>
                  {isAdmin && selectedQuoteForPreview.status !== 'Converted' && (
                    <button
                      onClick={() => {
                        handleConvertQuote(selectedQuoteForPreview);
                        setSelectedQuoteForPreview(null);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      Convert to Subscription →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quotation Builder Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Build Quotation Proposal
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreateQuote} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
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
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Subscription Plan</label>
                <select
                  value={selectedPlanId}
                  onChange={e => setSelectedPlanId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="">-- Choose Plan --</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({formatINR(p.pricePaise)} / {p.billingFrequency})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Discount Code</label>
                  <input
                    type="text"
                    placeholder="e.g. FESTIVE25, STARTUP50"
                    value={discountCode}
                    onChange={e => setDiscountCode(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option>Net 15 Days</option>
                    <option>Net 30 Days</option>
                    <option>Net 45 Days</option>
                    <option>Immediate Settlement</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Internal Notes</label>
                <input
                  type="text"
                  placeholder="Special SLA notes or onboarding timeline..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Generate Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
