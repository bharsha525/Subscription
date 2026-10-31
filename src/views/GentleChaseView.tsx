/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Send,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Mail,
  ShieldCheck,
  MessageSquare,
  RefreshCw,
  X
} from 'lucide-react';
import { formatINR } from '../utils/finance.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { openGmailCompose } from '../utils/email.ts';
import { SmsModal } from '../components/common/SmsModal.tsx';

interface GentleChaseViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const GentleChaseView: React.FC<GentleChaseViewProps> = ({ onNavigate }) => {
  const { isStaff } = useAuth();
  const [queueData, setQueueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [successBanner, setSuccessBanner] = useState('');

  // SECTION 7: Gentle Chase Reminder Modal
  const [reminderModalInv, setReminderModalInv] = useState<any>(null);
  const [reminderChannel, setReminderChannel] = useState<'email' | 'sms'>('email');
  const [reminderMessage, setReminderMessage] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [smsModalData, setSmsModalData] = useState<{ phone: string; name: string; message: string; invoiceNumber: string } | null>(null);

  const fetchDunningQueue = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dunning/queue');
      const data = await res.json();
      setQueueData(data);
    } catch (err) {
      console.error('Failed to load dunning queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDunningQueue();
  }, []);

  const handleOpenReminderModal = (inv: any) => {
    setReminderModalInv(inv);
    setReminderChannel('email');
    setReminderMessage(inv.suggestedTemplate || `Dear ${inv.customerName}, this is a gentle reminder regarding invoice ${inv.invoiceNumber} for ${formatINR(inv.outstandingBalancePaise)}.`);
  };

  const handleSendReminder = async () => {
    if (!reminderModalInv) return;

    if (reminderChannel === 'sms') {
      const inv = reminderModalInv;
      setReminderModalInv(null);
      const prefillPayload = {
        phone: inv.phone || '+91 98450 12345',
        customerName: inv.customerName,
        customerId: inv.customerId,
        message: reminderMessage || `Hi ${inv.customerName}, payment reminder for invoice ${inv.invoiceNumber} of ${formatINR(inv.outstandingBalancePaise)}. Settle: https://brightloop.io/pay/${inv.invoiceNumber} - Brightloop`,
      };
      try {
        sessionStorage.setItem('sms_prefill', JSON.stringify(prefillPayload));
      } catch (e) {}
      onNavigate('sms', prefillPayload);
      return;
    }

    try {
      setDispatching(true);

      if (reminderChannel === 'email') {
        const recipient = reminderModalInv.customerEmail || reminderModalInv.email || 'billing@customer.com';
        const subject = `Gentle Reminder: Invoice ${reminderModalInv.invoiceNumber} Overdue Payment`;
        const body = reminderMessage;

        // Redirect to Gmail composer with recipient and subject/body prefilled
        openGmailCompose({ to: recipient, subject, body });

        // Log reminder action on server
        await fetch('/api/collections/send-reminder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceId: reminderModalInv.id,
            channel: 'email',
            messageText: reminderMessage,
            customerName: reminderModalInv.customerName,
          }),
        });

        setSuccessBanner(`Redirected to Gmail composer for ${reminderModalInv.customerName}. Please send your reminder directly from Gmail.`);
        setReminderModalInv(null);
        await fetchDunningQueue();
        setTimeout(() => setSuccessBanner(''), 6000);
      }
    } catch (err) {
      console.error('Error sending reminder', err);
    } finally {
      setDispatching(false);
    }
  };

  if (loading || !queueData) {
    return (
      <div className="p-8 space-y-6 animate-pulse max-w-7xl mx-auto">
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const { totalOverdueCount, bucket1to7, bucket8to30, bucket30plus } = queueData;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Gentle Chase & Empathetic Dunning Board
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Section 14: Friendly overdue collections grouped by aging buckets with calm, respectful customer copy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            {totalOverdueCount} Overdue Accounts
          </span>
        </div>
      </div>

      {successBanner && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* 3 Columns: 1-7 days, 8-30 days, 30+ days overdue */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Bucket 1: 1-7 Days Overdue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Stage 1</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">1–7 Days Overdue</h3>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
              {bucket1to7.length}
            </span>
          </div>

          <div className="space-y-3">
            {bucket1to7.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No accounts in 1–7d bucket.</p>
            ) : (
              bucket1to7.map((inv: any) => (
                <div key={inv.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{inv.customerName}</div>
                      <div className="font-mono text-slate-400 text-[11px]">{inv.invoiceNumber}</div>
                    </div>
                    <span className="font-mono font-bold text-rose-600">
                      {formatINR(inv.outstandingBalancePaise)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    "{inv.suggestedTemplate}"
                  </p>

                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => handleOpenReminderModal(inv)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors shadow-xs cursor-pointer text-xs"
                    >
                      <Send className="w-3 h-3" />
                      <span>Send Gentle Reminder</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bucket 2: 8-30 Days Overdue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Stage 2</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">8–30 Days Overdue</h3>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400">
              {bucket8to30.length}
            </span>
          </div>

          <div className="space-y-3">
            {bucket8to30.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No accounts in 8–30d bucket.</p>
            ) : (
              bucket8to30.map((inv: any) => (
                <div key={inv.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{inv.customerName}</div>
                      <div className="font-mono text-slate-400 text-[11px]">{inv.invoiceNumber}</div>
                    </div>
                    <span className="font-mono font-bold text-rose-600">
                      {formatINR(inv.outstandingBalancePaise)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    "{inv.suggestedTemplate}"
                  </p>

                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => handleOpenReminderModal(inv)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors shadow-xs cursor-pointer text-xs"
                    >
                      <Send className="w-3 h-3" />
                      <span>Dispatch Follow-up</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bucket 3: 30+ Days Overdue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Stage 3</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">30+ Days Critical</h3>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
              {bucket30plus.length}
            </span>
          </div>

          <div className="space-y-3">
            {bucket30plus.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">Zero critical 30+ day arrears.</p>
            ) : (
              bucket30plus.map((inv: any) => (
                <div key={inv.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-rose-50/20 dark:bg-rose-950/20 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{inv.customerName}</div>
                      <div className="font-mono text-slate-400 text-[11px]">{inv.invoiceNumber}</div>
                    </div>
                    <span className="font-mono font-bold text-rose-700">
                      {formatINR(inv.outstandingBalancePaise)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    "{inv.suggestedTemplate}"
                  </p>

                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => handleOpenReminderModal(inv)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition-colors shadow-xs cursor-pointer text-xs"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>Escalate Notice</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SECTION 7: Dedicated Payment Reminder Modal */}
      {reminderModalInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Dispatch Payment Reminder — {reminderModalInv.invoiceNumber}
              </h3>
              <button
                type="button"
                onClick={() => setReminderModalInv(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Recipient Customer:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{reminderModalInv.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Outstanding Overdue:</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {formatINR(reminderModalInv.outstandingBalancePaise)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Due Date:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{reminderModalInv.dueDate}</span>
              </div>
            </div>

            {/* Notification Channel */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Channel Delivery Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReminderChannel('email')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    reminderChannel === 'email'
                      ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Email Dispatch</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReminderChannel('sms')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    reminderChannel === 'sms'
                      ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>SMS Gateway</span>
                </button>
              </div>
            </div>

            {/* Editable Reminder Message */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Customize Friendly Reminder Copy
              </label>
              <textarea
                value={reminderMessage}
                onChange={e => setReminderMessage(e.target.value)}
                rows={4}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReminderModalInv(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendReminder}
                disabled={dispatching || !reminderMessage.trim()}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {dispatching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{dispatching ? 'Dispatching...' : 'Dispatch Reminder'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
