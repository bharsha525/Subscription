/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  X,
  CheckCircle,
  AlertCircle,
  Smartphone,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Tag,
  Check,
  Clock
} from 'lucide-react';
import { SmsLog, SmsTemplate } from '../../types/index.ts';

interface SmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPhone?: string;
  defaultCustomerName?: string;
  defaultCustomerId?: string;
  defaultMessage?: string;
  referenceType?: 'invoice' | 'payment_reminder' | 'renewal' | 'welcome' | 'custom';
  referenceId?: string;
  onSuccess?: (log: SmsLog) => void;
}

export const SmsModal: React.FC<SmsModalProps> = ({
  isOpen,
  onClose,
  defaultPhone = '',
  defaultCustomerName = '',
  defaultCustomerId,
  defaultMessage = '',
  referenceType = 'custom',
  referenceId,
  onSuccess,
}) => {
  const [recipientPhone, setRecipientPhone] = useState(defaultPhone);
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [message, setMessage] = useState(defaultMessage);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [deliveryResult, setDeliveryResult] = useState<SmsLog | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSandbox, setIsSandbox] = useState(true);
  const [providerName, setProviderName] = useState('sandbox');
  const [senderId, setSenderId] = useState('BRTLOP');

  useEffect(() => {
    if (isOpen) {
      setRecipientPhone(defaultPhone);
      setCustomerName(defaultCustomerName);
      setMessage(defaultMessage);
      setDeliveryResult(null);
      setErrorMessage('');
      fetchConfigAndTemplates();
    }
  }, [isOpen, defaultPhone, defaultCustomerName, defaultMessage]);

  const fetchConfigAndTemplates = async () => {
    try {
      const [resConfig, resTpl] = await Promise.all([
        fetch('/api/sms/config'),
        fetch('/api/sms/templates'),
      ]);
      if (resConfig.ok) {
        const dataCfg = await resConfig.json();
        setIsSandbox(dataCfg.config?.isSandbox ?? true);
        setProviderName(dataCfg.config?.provider || 'sandbox');
        setSenderId(dataCfg.config?.senderId || 'BRTLOP');
      }
      if (resTpl.ok) {
        const dataTpl = await resTpl.json();
        setTemplates(dataTpl.templates || []);
      }
    } catch (err) {
      console.error('Failed to load SMS configuration', err);
    }
  };

  if (!isOpen) return null;

  const charCount = message.length;
  const segments = Math.max(1, Math.ceil(charCount / 160));
  const remainingInSegment = segments * 160 - charCount;

  const handleApplyTemplate = (tpl: SmsTemplate) => {
    setSelectedTemplateId(tpl.id);
    let filled = tpl.template
      .replace('{customerName}', customerName || 'Valued Customer')
      .replace('{invoiceNumber}', referenceId || 'INV-2026-001')
      .replace('{amount}', '₹53,100')
      .replace('{dueDate}', '2026-11-15')
      .replace('{planName}', 'Enterprise Tier')
      .replace('{payUrl}', `https://brightloop.io/pay/${referenceId || 'INV-2026-001'}`)
      .replace('{customText}', 'Your subscription account has been updated successfully.');
    setMessage(filled);
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSending(true);

    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientPhone,
          customerName,
          customerId: defaultCustomerId,
          message,
          referenceType,
          referenceId,
          dltTemplateId: selectedTemplateId || '1407161234567890123',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDeliveryResult(data.log);
        if (onSuccess) {
          onSuccess(data.log);
        }
      } else {
        setErrorMessage(data.error || 'Failed to dispatch SMS via gateway.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error occurred while sending SMS.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-[#EAB308] flex items-center justify-center shadow-xs ring-1 ring-[#EAB308]/30">
              <MessageSquare className="w-4 h-4 drop-shadow-[0_0_6px_rgba(234,179,8,0.6)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Send SMS Notification
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#EAB308]/15 text-[#A16207] dark:text-[#EAB308] border border-[#EAB308]/30">
                  {isSandbox ? 'Sandbox Mode' : providerName.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Sender ID: <strong className="font-mono text-slate-700 dark:text-slate-300">{senderId}</strong> · DLT Registered Trai Gateway
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Success Banner */}
          {deliveryResult && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3 animate-in zoom-in-95">
              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      SMS Delivered Successfully
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 font-bold uppercase">
                      Status: {deliveryResult.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                    Dispatched to {deliveryResult.to} via {deliveryResult.provider === 'sandbox' ? 'Sandbox Gateway Simulator' : deliveryResult.provider.toUpperCase()}.
                  </p>
                </div>
              </div>

              {/* Delivery Receipt Metadata Strip */}
              <div className="p-2.5 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-emerald-200/60 dark:border-emerald-800/60 grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div>
                  <span className="text-slate-400 block">Message ID</span>
                  <span className="text-slate-700 dark:text-slate-300 font-bold truncate block">{deliveryResult.messageId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Segments</span>
                  <span className="text-slate-700 dark:text-slate-300 font-bold">{deliveryResult.segmentCount} ({deliveryResult.characterCount} chars)</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Delivered At</span>
                  <span className="text-slate-700 dark:text-slate-300 font-bold">{new Date(deliveryResult.deliveredAt || deliveryResult.sentAt).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeliveryResult(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 cursor-pointer"
                >
                  Compose Another
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!deliveryResult && (
            <form onSubmit={handleSendSms} className="space-y-4 text-xs">
              {/* Recipient Phone & Customer Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Recipient Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      value={recipientPhone}
                      onChange={e => setRecipientPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-[#EAB308]/40 focus:border-[#EAB308]"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">Prefilled from customer profile</span>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Customer / Company Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#EAB308]/40 focus:border-[#EAB308]"
                  />
                  <span className="text-[10px] text-slate-400">Personalizes SMS template tokens</span>
                </div>
              </div>

              {/* Ready-to-use DLT Templates Picker */}
              {templates.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#EAB308]" />
                      Prefill DLT Approved Template
                    </span>
                    <span className="text-[10px] text-slate-400">Instant format</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {templates.map(tpl => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleApplyTemplate(tpl)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedTemplateId === tpl.id
                            ? 'bg-[#0F172A] text-white border-[#EAB308] shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#EAB308]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px] truncate">{tpl.title}</span>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/20 text-[#EAB308]">
                            {tpl.category}
                          </span>
                        </div>
                        <p className="text-[10px] line-clamp-1 opacity-70 mt-1">
                          {tpl.template}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Body */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Message Body <span className="text-rose-500">*</span>
                  </label>
                  <div className="text-[11px] font-mono flex items-center gap-2">
                    <span className={charCount > 160 ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                      {charCount} chars
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                      {segments} {segments === 1 ? 'Segment' : 'Segments'}
                    </span>
                    <span className="text-slate-400 text-[10px]">({remainingInSegment} left in seg)</span>
                  </div>
                </div>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type your message or select an approved template above..."
                  className="w-full p-3 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#EAB308]/40 focus:border-[#EAB308]"
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-3 rounded-xl bg-[#0F172A] text-white space-y-1.5 shadow-sm border border-slate-800">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-[#EAB308]" />
                    Client Handset Mockup Preview
                  </span>
                  <span className="text-[#EAB308]">From: {senderId}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-200 font-mono leading-relaxed break-words">
                  {message || <span className="italic text-slate-500">Your message will appear here...</span>}
                </div>
              </div>

              {/* Footer Controls */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>TRAI compliant · 25 paise/segment</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSending || !message.trim() || !recipientPhone.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition-all shadow-md hover:border-[#EAB308] border border-transparent cursor-pointer disabled:opacity-50 group"
                  >
                    <Send className={`w-3.5 h-3.5 text-[#EAB308] group-hover:drop-shadow-[0_0_6px_rgba(234,179,8,0.7)] ${isSending ? 'animate-pulse' : ''}`} />
                    <span>{isSending ? 'Transmitting via Carrier...' : 'Send SMS Now'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
