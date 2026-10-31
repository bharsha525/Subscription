/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Printer, Download, CheckCircle, Clock, AlertTriangle, ShieldCheck, Mail, MessageSquare } from 'lucide-react';
import { Invoice } from '../../types/index.ts';
import { formatINR } from '../../utils/finance.ts';
import { openGmailCompose } from '../../utils/email.ts';
import { SmsModal } from './SmsModal.tsx';

interface InvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onRecordPayment?: (invoice: Invoice) => void;
  onRequestPayment?: (invoice: Invoice) => void;
  isCustomer?: boolean;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoice,
  onClose,
  onRecordPayment,
  onRequestPayment,
  isCustomer
}) => {
  const [showSmsModal, setShowSmsModal] = useState(false);
  if (!invoice) return null;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = () => {
    switch (invoice.status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle className="w-3.5 h-3.5" /> PAID IN FULL
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <Clock className="w-3.5 h-3.5" /> PARTIALLY PAID
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5" /> OVERDUE
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            CONFIRMED
          </span>
        );
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed-none"
    >
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 print:border-none print:shadow-none print:m-0">
        
        {/* Top Action Toolbar (hidden during print) */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 print:hidden gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Tax Invoice Preview — {invoice.invoiceNumber}
            </span>
            {getStatusBadge()}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const recipient = invoice.customerEmail || '';
                const subject = `Tax Invoice ${invoice.invoiceNumber} — Brightloop Pulse`;
                const body = `Dear ${invoice.customerName},\n\nPlease review your tax invoice details for invoice ${invoice.invoiceNumber}.\n\nInvoice Number: ${invoice.invoiceNumber}\nIssue Date: ${invoice.issueDate}\nDue Date: ${invoice.dueDate}\nBilling Period: ${invoice.billingPeriod}\nTotal Amount: ${formatINR(invoice.totalPaise)}\nOutstanding Balance: ${formatINR(invoice.outstandingBalancePaise)}\nPayment Terms: ${invoice.paymentTerms}\n\nPlease proceed to settle this invoice through your Brightloop portal.\n\nBest regards,\nBrightloop Revenue Operations`;
                openGmailCompose({ to: recipient, subject, body });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-teal-600" />
              <span>Send Email</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSmsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#EAB308]/60 transition-colors cursor-pointer group"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#EAB308] group-hover:drop-shadow-[0_0_6px_rgba(234,179,8,0.7)]" />
              <span>Send SMS</span>
            </button>

            {/* Admin / Staff Payment Actions */}
            {!isCustomer && invoice.outstandingBalancePaise > 0 && (
              <>
                {onRequestPayment && (
                  <button
                    type="button"
                    onClick={() => onRequestPayment(invoice)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors cursor-pointer"
                  >
                    <span>Request Payment</span>
                  </button>
                )}
                {onRecordPayment && (
                  <button
                    type="button"
                    onClick={() => onRecordPayment(invoice)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
                  >
                    <span>Record Payment</span>
                  </button>
                )}
              </>
            )}

            {/* Customer Self-Service Checkout Action */}
            {isCustomer && invoice.outstandingBalancePaise > 0 && onRecordPayment && (
              <button
                type="button"
                onClick={() => onRecordPayment(invoice)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs cursor-pointer"
              >
                <span>Pay Outstanding Now</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              title="Close modal (Esc)"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <X className="w-4 h-4" />
              <span>Close <span className="text-[10px] opacity-60 font-mono">(Esc)</span></span>
            </button>
          </div>
        </div>

        {/* Invoice Printable Sheet */}
        <div className="p-8 sm:p-10 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 print:text-black">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                  P
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Brightloop Pulse
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Brightloop Technologies Private Limited<br />
                9th Floor, Brigade Tech Gardens, Brookefield<br />
                Bengaluru, Karnataka 560066, India<br />
                <span className="font-mono text-slate-600 dark:text-slate-400">GSTIN: 29AABCB1234F1Z9</span>
              </p>
            </div>

            <div className="text-right">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">
                TAX INVOICE
              </h2>
              <p className="text-sm font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                {invoice.invoiceNumber}
              </p>
              <div className="mt-3 text-xs text-slate-500 space-y-0.5">
                <p>Issue Date: <span className="font-medium text-slate-800 dark:text-slate-200">{invoice.issueDate}</span></p>
                <p>Due Date: <span className="font-medium text-slate-800 dark:text-slate-200">{invoice.dueDate}</span></p>
                <p>Period: <span className="font-medium text-slate-800 dark:text-slate-200 font-mono">{invoice.billingPeriod}</span></p>
                {invoice.subscriptionNumber && (
                  <p>Subscription: <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{invoice.subscriptionNumber}</span></p>
                )}
              </div>
            </div>
          </div>

          {/* Billed To */}
          <div className="grid grid-cols-2 gap-8 my-6 text-xs">
            <div>
              <span className="text-slate-400 uppercase font-semibold tracking-wider text-[10px]">
                Billed To
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {invoice.customerName}
              </h3>
              <p className="text-slate-500 mt-1 leading-relaxed">
                {invoice.billingAddress.line1}<br />
                {invoice.billingAddress.line2 && <>{invoice.billingAddress.line2}<br /></>}
                {invoice.billingAddress.city}, {invoice.billingAddress.state} - {invoice.billingAddress.postalCode}<br />
                {invoice.billingAddress.country}
              </p>
              <p className="text-slate-500 mt-1">
                Email: <span className="text-slate-700 dark:text-slate-300 font-medium">{invoice.customerEmail}</span>
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-slate-400 uppercase font-semibold tracking-wider text-[10px]">
                  Payment Terms
                </span>
                <p className="text-slate-800 dark:text-slate-200 font-medium mt-1">
                  {invoice.paymentTerms}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400 uppercase font-semibold tracking-wider text-[10px]">
                  Settlement Status
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Balance Due:</span>
                  <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {formatINR(invoice.outstandingBalancePaise)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Description</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Qty</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Unit Price</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Discount</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Tax (18%)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoice.lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {line.productName}
                      </div>
                      {line.variantLabel && (
                        <div className="text-[11px] text-slate-500">
                          Edition / Variant: {line.variantLabel}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{line.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{formatINR(line.unitPricePaise)}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500">
                      {line.discountPaise > 0 ? `-${formatINR(line.discountPaise)}` : '₹0'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500">
                      {formatINR(line.taxAmountPaise)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {formatINR(line.totalPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex justify-end mb-8">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                <span>Subtotal (Pre-tax)</span>
                <span className="font-mono tabular-nums">{formatINR(invoice.subtotalPaise)}</span>
              </div>
              {invoice.discountAmountPaise > 0 && (
                <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400">
                  <span>Discount ({invoice.discountCode || 'Applied'})</span>
                  <span className="font-mono tabular-nums">-{formatINR(invoice.discountAmountPaise)}</span>
                </div>
              )}
              {invoice.taxes.map((t, i) => (
                <div key={i} className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                  <span>{t.name}</span>
                  <span className="font-mono tabular-nums">{formatINR(t.taxAmountPaise)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white">
                <span>Total Payable</span>
                <span className="font-mono tabular-nums">{formatINR(invoice.totalPaise)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                <span>Amount Paid</span>
                <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                  {formatINR(invoice.amountPaidPaise)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-t border-slate-200 dark:border-slate-800 font-bold text-sm text-indigo-600 dark:text-indigo-400">
                <span>Outstanding Balance</span>
                <span className="font-mono tabular-nums">{formatINR(invoice.outstandingBalancePaise)}</span>
              </div>
            </div>
          </div>

          {/* Payment Instructions footer */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Bank & Settlement Details:</p>
            <p>Beneficiary Name: <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">Brightloop Technologies Private Limited</span></p>
            <p>Bank: HDFC Bank Ltd | Account No: <span className="font-mono font-medium">50200084920192</span> | IFSC: <span className="font-mono font-medium">HDFC0001234</span></p>
            <p>UPI ID for instant settlement: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">brightloop@hdfcbank</span></p>
          </div>

          <div className="mt-8 text-center text-[10px] text-slate-400">
            This is a computer-generated tax invoice verified under the Indian Goods and Services Tax (GST) provisions.
          </div>
        </div>
      </div>

      {/* SMS Gateway Modal Integration */}
      <SmsModal
        isOpen={showSmsModal}
        onClose={() => setShowSmsModal(false)}
        defaultCustomerName={invoice.customerName}
        defaultCustomerId={invoice.customerId}
        defaultMessage={`Dear ${invoice.customerName}, payment reminder: Brightloop invoice ${invoice.invoiceNumber} for ${formatINR(invoice.totalPaise)} is due on ${invoice.dueDate}. Settle securely: https://brightloop.io/pay/${invoice.invoiceNumber} - BRTLOP`}
        referenceType="invoice"
        referenceId={invoice.invoiceNumber}
      />
    </div>
  );
};
