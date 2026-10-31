/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Smartphone,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  Tag,
  Search,
  Filter,
  Settings,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Building
} from 'lucide-react';
import { SmsLog, SmsProviderConfig, SmsTemplate, Customer } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { MotionView } from '../components/motion/MotionView.tsx';

interface SmsGatewayViewProps {
  onNavigate: (view: string, params?: any) => void;
  prefill?: {
    phone?: string;
    customerName?: string;
    customerId?: string;
    message?: string;
  } | null;
}

export const SmsGatewayView: React.FC<SmsGatewayViewProps> = ({ onNavigate, prefill }) => {
  const { isAdmin, isStaff } = useAuth();
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [config, setConfig] = useState<SmsProviderConfig | null>(null);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'composer' | 'logs' | 'config'>('composer');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Composer Form
  const [recipientPhone, setRecipientPhone] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [actionAlert, setActionAlert] = useState<{ message: string; type: 'success' | 'error'; log?: SmsLog } | null>(null);

  // Config Form
  const [provider, setProvider] = useState<'sandbox' | 'twilio' | 'gupshup' | 'fast2sms'>('sandbox');
  const [isSandbox, setIsSandbox] = useState(true);
  const [senderId, setSenderId] = useState('BRTLOP');
  const [apiKey, setApiKey] = useState('');
  const [accountSid, setAccountSid] = useState('');
  const [dltEntityId, setDltEntityId] = useState('11014522900000452');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resLogs, resCfg, resTpl, resCust] = await Promise.all([
        fetch('/api/sms/logs'),
        fetch('/api/sms/config'),
        fetch('/api/sms/templates'),
        fetch('/api/customers'),
      ]);

      const dataLogs = await resLogs.json();
      const dataCfg = await resCfg.json();
      const dataTpl = await resTpl.json();
      const dataCust = await resCust.json();

      setLogs(dataLogs.logs || []);
      setConfig(dataCfg.config || null);
      setTemplates(dataTpl.templates || []);
      setCustomers(dataCust.customers || []);

      if (dataCfg.config) {
        setProvider(dataCfg.config.provider || 'sandbox');
        setIsSandbox(dataCfg.config.isSandbox ?? true);
        setSenderId(dataCfg.config.senderId || 'BRTLOP');
        setApiKey(dataCfg.config.apiKey || '');
        setAccountSid(dataCfg.config.accountSid || '');
        setDltEntityId(dataCfg.config.dltEntityId || '11014522900000452');
      }
    } catch (err) {
      console.error('Failed to load SMS Gateway data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Check prefill prop or sessionStorage
    let targetPrefill = prefill;
    if (!targetPrefill) {
      try {
        const stored = sessionStorage.getItem('sms_prefill');
        if (stored) {
          targetPrefill = JSON.parse(stored);
        }
      } catch (e) {}
    }

    if (targetPrefill) {
      if (targetPrefill.phone) setRecipientPhone(targetPrefill.phone);
      if (targetPrefill.customerName) setCustomerName(targetPrefill.customerName);
      if (targetPrefill.customerId) setSelectedCustomerId(targetPrefill.customerId);
      if (targetPrefill.message) setMessage(targetPrefill.message);
      setActiveTab('composer');
      try {
        sessionStorage.removeItem('sms_prefill');
      } catch (e) {}
    }
  }, [prefill]);

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const cust = customers.find(c => c.id === customerId);
    if (cust) {
      setRecipientPhone(cust.phone || '+91 98450 12345');
      setCustomerName(cust.companyName);
    }
  };

  const handleApplyTemplate = (tpl: SmsTemplate) => {
    setSelectedTemplateId(tpl.id);
    const filled = tpl.template
      .replace('{customerName}', customerName || 'Valued Customer')
      .replace('{invoiceNumber}', 'INV-2026-001')
      .replace('{amount}', '₹53,100')
      .replace('{dueDate}', '2026-11-15')
      .replace('{planName}', 'Enterprise Annual')
      .replace('{payUrl}', 'https://brightloop.io/pay/INV-2026-001')
      .replace('{customText}', 'Your subscription balance is up to date.');
    setMessage(filled);
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone.trim() || !message.trim()) return;

    setIsSending(true);
    setActionAlert(null);

    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientPhone,
          customerName,
          customerId: selectedCustomerId || undefined,
          message,
          referenceType: 'custom',
          dltTemplateId: selectedTemplateId || '1407161234567890123',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionAlert({
          message: `SMS delivered to ${recipientPhone} via ${data.provider === 'sandbox' ? 'Sandbox Gateway Simulator' : data.provider.toUpperCase()} (Message ID: ${data.log?.messageId})`,
          type: 'success',
          log: data.log,
        });
        setMessage('');
        await fetchData();
      } else {
        setActionAlert({
          message: data.error || 'Failed to dispatch SMS.',
          type: 'error',
        });
      }
    } catch (err: any) {
      setActionAlert({
        message: err.message || 'Network error occurred while dispatching SMS.',
        type: 'error',
      });
    } finally {
      setIsSending(false);
      setTimeout(() => setActionAlert(null), 6000);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/sms/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          isSandbox,
          senderId,
          apiKey,
          accountSid,
          dltEntityId,
        }),
      });
      if (res.ok) {
        setActionAlert({ message: 'SMS Gateway configuration saved successfully.', type: 'success' });
        await fetchData();
      } else {
        setActionAlert({ message: 'Failed to update gateway configuration.', type: 'error' });
      }
    } catch (err: any) {
      setActionAlert({ message: err.message || 'Error updating configuration.', type: 'error' });
    } finally {
      setIsSavingConfig(false);
      setTimeout(() => setActionAlert(null), 5000);
    }
  };

  const handleRetry = async (logId: string) => {
    try {
      const res = await fetch(`/api/sms/logs/${logId}/retry`, { method: 'POST' });
      if (res.ok) {
        setActionAlert({ message: 'SMS redelivered successfully.', type: 'success' });
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const charCount = message.length;
  const segments = Math.max(1, Math.ceil(charCount / 160));
  const remainingInSegment = segments * 160 - charCount;

  const filteredLogs = logs.filter(l => {
    if (statusFilter !== 'all' && l.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        l.to.toLowerCase().includes(q) ||
        l.customerName.toLowerCase().includes(q) ||
        l.message.toLowerCase().includes(q) ||
        l.messageId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const deliveredCount = logs.filter(l => l.status === 'Delivered').length;
  const deliveryRate = logs.length > 0 ? Math.round((deliveredCount / logs.length) * 100) : 100;

  return (
    <MotionView className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0F172A] text-[#EAB308] border border-[#EAB308]/30 text-[11px] font-mono mb-1 font-semibold">
            <MessageSquare className="w-3.5 h-3.5 drop-shadow-[0_0_6px_rgba(234,179,8,0.7)]" />
            <span>TRAI DLT Verified Gateway</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            SMS Gateway & Transactional Dispatch
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch automated billing reminders, payment acknowledgments, and urgent collection alerts with verified carrier delivery receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-[#EAB308]/60 transition-colors shadow-xs cursor-pointer group"
            title="Refresh SMS Gateway Data"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 group-hover:text-[#EAB308] ${loading ? 'animate-spin text-[#EAB308]' : ''}`} />
          </button>
          <div className="px-3 py-1.5 rounded-xl bg-[#0F172A] text-white border border-slate-800 text-xs font-mono flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">Credits:</span>
            <strong className="text-[#EAB308] font-bold">{config?.balanceCredits ?? 4850}</strong>
          </div>
        </div>
      </div>

      {/* Action Notification Alert & Real-Time Delivery Receipt */}
      {actionAlert && (
        <div className={`p-4 rounded-2xl border text-xs shadow-md animate-in fade-in space-y-2.5 ${
          actionAlert.type === 'success'
            ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
            : 'bg-rose-50/90 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {actionAlert.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span className="font-bold text-sm">{actionAlert.message}</span>
            </div>
            <button onClick={() => setActionAlert(null)} className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
          </div>

          {actionAlert.log && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/80 font-mono text-[11px]">
              <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="text-slate-400 block text-[9px] uppercase">Delivery Status</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> {actionAlert.log.status}
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="text-slate-400 block text-[9px] uppercase">Carrier Provider</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                  {actionAlert.log.provider === 'sandbox' ? 'Sandbox Mode' : actionAlert.log.provider}
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="text-slate-400 block text-[9px] uppercase">Recipient Handset</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{actionAlert.log.to}</span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="text-slate-400 block text-[9px] uppercase">Message ID</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{actionAlert.log.messageId}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Provider Status */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Carrier Provider</span>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
              {config?.provider || 'Sandbox'}
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
              config?.isSandbox
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
            }`}>
              {config?.isSandbox ? 'Sandbox Simulator' : 'Live Active'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Sender Header: {config?.senderId || 'BRTLOP'}</p>
        </div>

        {/* Card 2: Delivery Rate */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Delivery Success Rate</span>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {deliveryRate}%
            </h3>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-[11px] text-slate-400">DLT registered TRAI routing</p>
        </div>

        {/* Card 3: Total Dispatches */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Total SMS Dispatched</span>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-mono">
              {logs.length}
            </h3>
            <span className="w-8 h-8 rounded-xl bg-[#0F172A] text-[#EAB308] flex items-center justify-center shadow-xs">
              <Send className="w-4 h-4 drop-shadow-[0_0_6px_rgba(234,179,8,0.7)]" />
            </span>
          </div>
          <p className="text-[11px] text-slate-400">All billing & collection events</p>
        </div>

        {/* Card 4: Average Latency */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Avg Carrier Handshake</span>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-mono">
              1.8s
            </h3>
            <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-[#EAB308] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Tier-1 Indian Telecom Aggregators</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('composer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'composer'
              ? 'bg-[#0F172A] text-white shadow-xs border border-[#EAB308]/40'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Send className={`w-3.5 h-3.5 ${activeTab === 'composer' ? 'text-[#EAB308] drop-shadow-[0_0_6px_rgba(234,179,8,0.7)]' : ''}`} />
          <span>Interactive SMS Composer</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-[#0F172A] text-white shadow-xs border border-[#EAB308]/40'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MessageSquare className={`w-3.5 h-3.5 ${activeTab === 'logs' ? 'text-[#EAB308] drop-shadow-[0_0_6px_rgba(234,179,8,0.7)]' : ''}`} />
          <span>Dispatch History & Receipts ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'config'
              ? 'bg-[#0F172A] text-white shadow-xs border border-[#EAB308]/40'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Settings className={`w-3.5 h-3.5 ${activeTab === 'config' ? 'text-[#EAB308] drop-shadow-[0_0_6px_rgba(234,179,8,0.7)]' : ''}`} />
          <span>Gateway Provider Settings</span>
        </button>
      </div>

      {/* ================= TAB 1: COMPOSER ================= */}
      {activeTab === 'composer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: 7 cols */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-[#EAB308]" />
                Compose Transactional SMS
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select an existing customer or enter a recipient mobile number to send an instant SMS.
              </p>
            </div>

            <form onSubmit={handleSendSms} className="space-y-4 text-xs">
              {/* Customer Selector */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Select Registered Customer (Auto-fills phone)
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={e => handleSelectCustomer(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Customer Account --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.phone || 'No phone registered'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Mobile & Contact Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Recipient Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={recipientPhone}
                      onChange={e => setRecipientPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="e.g. Acme Technologies"
                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Template Picker */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#EAB308]" />
                    Approved DLT Message Templates
                  </span>
                  <span className="text-[10px] text-slate-400">1-Click Insert</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {templates.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedTemplateId === tpl.id
                          ? 'bg-[#0F172A] text-white border-[#EAB308]'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#EAB308]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px]">{tpl.title}</span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/20 text-[#EAB308]">
                          {tpl.category}
                        </span>
                      </div>
                      <p className="text-[10px] line-clamp-1 opacity-70 mt-1">{tpl.template}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Body Textarea */}
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
                    <span className="text-slate-400 text-[10px]">({remainingInSegment} chars left in seg)</span>
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

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>TRAI Entity ID: {config?.dltEntityId || '11014522900000452'}</span>
                </div>

                <button
                  type="submit"
                  disabled={isSending || !message.trim() || !recipientPhone.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition-all shadow-md hover:border-[#EAB308] border border-transparent cursor-pointer disabled:opacity-50 group"
                >
                  <Send className={`w-3.5 h-3.5 text-[#EAB308] group-hover:drop-shadow-[0_0_8px_rgba(234,179,8,0.8)] ${isSending ? 'animate-pulse' : ''}`} />
                  <span>{isSending ? 'Transmitting via Carrier...' : 'Dispatch SMS'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Handset Mockup: 5 cols */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-bold mb-3 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#EAB308]" />
              Client Handset Visual Preview
            </span>

            {/* Smartphone Outer Shell */}
            <div className="w-72 bg-[#0F172A] p-3 rounded-[36px] shadow-2xl border-4 border-slate-800 relative">
              {/* Speaker Notch */}
              <div className="w-20 h-3 bg-slate-800 rounded-full mx-auto mb-3" />

              {/* Screen Area */}
              <div className="bg-[#F8FAFC] dark:bg-slate-950 rounded-[24px] p-3.5 min-h-[380px] flex flex-col justify-between text-slate-800 dark:text-slate-200">
                <div className="space-y-3">
                  {/* Status Bar */}
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                    <span>9:41 AM</span>
                    <span className="font-bold text-[#EAB308]">5G · Jio/Airtel</span>
                  </div>

                  {/* SMS Header */}
                  <div className="text-center py-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Sender</span>
                    <div className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                      {config?.senderId || 'BRTLOP'}
                    </div>
                  </div>

                  {/* Message Bubble */}
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                    <p className="leading-relaxed font-sans text-slate-800 dark:text-slate-200 break-words">
                      {message || 'Type a message on the left or choose a template to preview live client handset delivery...'}
                    </p>
                    <div className="text-right text-[9px] font-mono text-slate-400">
                      Now · Sent via {config?.provider === 'sandbox' ? 'Sandbox Gateway' : config?.provider?.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Handset Home Bar */}
                <div className="w-24 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-4" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: DISPATCH HISTORY & STATUS ================= */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by phone, customer, or message ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {['all', 'Delivered', 'Sent', 'Pending', 'Failed'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer capitalize ${
                    statusFilter.toLowerCase() === st.toLowerCase()
                      ? 'bg-[#0F172A] text-white font-bold border border-[#EAB308]/40'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Message ID</th>
                    <th className="py-3 px-4 font-semibold">Recipient & Customer</th>
                    <th className="py-3 px-4 font-semibold">Message Preview</th>
                    <th className="py-3 px-3 font-semibold">Provider</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    <th className="py-3 px-3 font-semibold">Sent At</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No SMS dispatch records found.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                          {log.messageId}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white font-mono">
                            {log.to}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {log.customerName}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="line-clamp-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                            {log.message}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {log.segmentCount} {log.segmentCount === 1 ? 'seg' : 'segs'} ({log.characterCount} chars)
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] uppercase text-slate-600 dark:text-slate-400">
                          {log.provider}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            log.status === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : log.status === 'Sent'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                              : log.status === 'Failed'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                          }`}>
                            {log.status === 'Delivered' && <CheckCircle className="w-3 h-3" />}
                            <span>{log.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                          {new Date(log.sentAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRetry(log.id)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          >
                            Resend
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: CONFIGURATION ================= */}
      {activeTab === 'config' && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#EAB308]" />
              SMS Gateway Provider Credentials
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure your carrier integration (Sandbox Simulator, Twilio, Gupshup, or Fast2SMS). Sandbox mode operates without live credentials.
            </p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            {/* Gateway Mode Toggle */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Sandbox / Demo Simulation Mode
                  </span>
                  <p className="text-[11px] text-slate-500">
                    When active, SMS messages are processed, verified, and logged in sandbox mode with zero carrier charge.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isSandbox}
                  onChange={e => setIsSandbox(e.target.checked)}
                  className="w-5 h-5 rounded text-[#EAB308] focus:ring-[#EAB308] border-slate-300 cursor-pointer"
                />
              </div>
            </div>

            {/* Provider Selection */}
            <div className="space-y-1">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Primary SMS Provider
              </label>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="sandbox">Sandbox Simulator (Built-in Demo Gateway)</option>
                <option value="twilio">Twilio Programmable Messaging</option>
                <option value="gupshup">Gupshup Enterprise India Gateway</option>
                <option value="fast2sms">Fast2SMS DLT Gateway</option>
              </select>
            </div>

            {/* Sender ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Approved 6-Alpha Sender ID
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={senderId}
                  onChange={e => setSenderId(e.target.value.toUpperCase())}
                  placeholder="BRTLOP"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold uppercase"
                />
                <span className="text-[10px] text-slate-400">DLT registered header (e.g. BRTLOP)</span>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  TRAI DLT Entity Registration ID
                </label>
                <input
                  type="text"
                  value={dltEntityId}
                  onChange={e => setDltEntityId(e.target.value)}
                  placeholder="11014522900000452"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
                <span className="text-[10px] text-slate-400">Government Telecom Regulatory ID</span>
              </div>
            </div>

            {/* API Keys */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  API Key / Auth Token
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Live carrier API token (leave blank for sandbox)"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Account SID / Username (Optional)
                </label>
                <input
                  type="text"
                  value={accountSid}
                  onChange={e => setAccountSid(e.target.value)}
                  placeholder="Twilio AC / Gupshup user ID"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isSavingConfig}
                className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition-all shadow-xs border border-[#EAB308]/40 hover:border-[#EAB308] cursor-pointer disabled:opacity-50"
              >
                {isSavingConfig ? 'Saving Settings...' : 'Save Gateway Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}
    </MotionView>
  );
};
