/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  FileText,
  Layers,
  CreditCard,
  Clock,
  CheckCircle,
  Building,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { Customer } from '../types/index.ts';
import { formatINR } from '../utils/finance.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface CustomersViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ onNavigate }) => {
  const { isStaff, isAdmin } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'invoices' | 'payments' | 'activity'>('overview');

  const handleOpenSendSms = (cust: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const phone = cust.phone || '+91 98450 12345';
    const prefillData = {
      phone,
      customerName: cust.companyName,
      customerId: cust.id,
      message: `Dear ${cust.companyName}, update from Brightloop Pulse: Your subscription account is active. For billing inquiries, contact billing@brightloop.io`,
    };
    try {
      sessionStorage.setItem('sms_prefill', JSON.stringify(prefillData));
    } catch (err) {}
    onNavigate('sms', prefillData);
  };

  // Add customer modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customers');
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSelectCustomer = async (cust: Customer) => {
    setSelectedCustomerId(cust.id);
    try {
      const res = await fetch(`/api/customers/${cust.id}/full`);
      if (res.ok) {
        const data = await res.json();
        setCustomerDetail(data);
      }
    } catch (err) {
      console.error('Failed to fetch full customer profile', err);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          contactName,
          email,
          phone,
          taxId,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setCompanyName('');
        setContactName('');
        setEmail('');
        setPhone('');
        await fetchCustomers();
      }
    } catch (err) {
      console.error('Error adding customer', err);
    }
  };

  const filtered = customers.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.companyName.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.customerNumber.toLowerCase().includes(q)
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
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Customer Database & Accounts CRM
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized enterprise client accounts, tax registrations, lifetime revenue, and outstanding receivables.
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
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by company name, contact, GSTIN, or email..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-semibold">Customer ID</th>
                <th className="py-3 px-4 font-semibold">Company / Name</th>
                <th className="py-3 px-4 font-semibold">Contact & Email</th>
                <th className="py-3 px-3 font-semibold">GSTIN / Tax ID</th>
                <th className="py-3 px-4 font-semibold text-right">Lifetime Paid</th>
                <th className="py-3 px-4 font-semibold text-right">Outstanding</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(cust => (
                <tr
                  key={cust.id}
                  onClick={() => handleSelectCustomer(cust)}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group/row"
                >
                  <td className="py-3 px-4 font-mono font-medium text-[#0F172A] dark:text-[#EAB308]">
                    {cust.customerNumber}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{cust.companyName}</div>
                    <div className="text-[11px] text-slate-400">{cust.billingAddress.city}, {cust.billingAddress.state}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-800 dark:text-slate-200">{cust.contactName}</div>
                    <div className="text-[11px] text-slate-400">{cust.phone || cust.email}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                    {cust.taxId || '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatINR(cust.totalPaidPaise)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                    <span className={cust.outstandingBalancePaise > 0 ? 'text-[#EAB308]' : 'text-slate-400'}>
                      {formatINR(cust.outstandingBalancePaise)}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        cust.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {cust.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => handleOpenSendSms(cust, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0F172A] text-white border border-[#EAB308]/40 hover:border-[#EAB308] hover:bg-slate-900 transition-all shadow-xs cursor-pointer group"
                      title="Open SMS Gateway with customer mobile prefilled"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#EAB308] group-hover:drop-shadow-[0_0_6px_rgba(234,179,8,0.85)] transition-all" />
                      <span>Send SMS</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Full Profile Drawer / Modal (Section 6: Overview, Subscriptions, Quotations, Invoices, Payments, Activity) */}
      {customerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono font-semibold text-[#EAB308] uppercase">
                  {customerDetail.customer.customerNumber}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {customerDetail.customer.companyName}
                </h3>
                <p className="text-xs text-slate-500">
                  Contact: {customerDetail.customer.contactName} · Phone: <strong className="font-mono text-slate-700 dark:text-slate-300">{customerDetail.customer.phone || '+91 98450 12345'}</strong> · {customerDetail.customer.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenSendSms(customerDetail.customer)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#0F172A] text-white border border-[#EAB308]/40 hover:border-[#EAB308] transition-all shadow-xs cursor-pointer group"
                  title="Open SMS Gateway with prefilled phone"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#EAB308] group-hover:drop-shadow-[0_0_6px_rgba(234,179,8,0.85)] transition-all" />
                  <span>Send SMS</span>
                </button>
                <button
                  onClick={() => setCustomerDetail(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Profile Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 text-xs">
              {[
                { id: 'overview', label: 'Overview & Ledger' },
                { id: 'subscriptions', label: `Subscriptions (${customerDetail.subscriptions.length})` },
                { id: 'invoices', label: `Invoices (${customerDetail.invoices.length})` },
                { id: 'payments', label: `Payments (${customerDetail.payments.length})` },
                { id: 'activity', label: 'Activity Trail' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`py-2 px-3 font-semibold transition-colors border-b-2 cursor-pointer ${
                    activeTab === t.id
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Total Revenue Collected</span>
                    <div className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400 mt-1">
                      {formatINR(customerDetail.customer.totalPaidPaise)}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Outstanding Receivables</span>
                    <div className="font-mono font-bold text-lg text-indigo-600 dark:text-indigo-400 mt-1">
                      {formatINR(customerDetail.customer.outstandingBalancePaise)}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Registered Billing Address</span>
                  <p className="text-slate-700 dark:text-slate-300">
                    {customerDetail.customer.billingAddress.line1}, {customerDetail.customer.billingAddress.city}, {customerDetail.customer.billingAddress.state} - {customerDetail.customer.billingAddress.postalCode}
                  </p>
                  <p className="text-slate-500">GSTIN: <span className="font-mono font-semibold">{customerDetail.customer.taxId || 'Unregistered'}</span></p>
                </div>
              </div>
            )}

            {/* Tab 2: Subscriptions */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-2 text-xs">
                {customerDetail.subscriptions.map((s: any) => (
                  <div key={s.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{s.subscriptionNumber}</span>
                      <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{s.planName}</div>
                      <div className="text-[11px] text-slate-400">Next Billing: {s.nextBillingDate}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatINR(s.totalPaise)}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">{s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Invoices */}
            {activeTab === 'invoices' && (
              <div className="space-y-2 text-xs">
                {customerDetail.invoices.map((i: any) => (
                  <div key={i.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">{i.invoiceNumber}</span>
                      <div className="text-slate-500">Due: {i.dueDate} · Period: {i.billingPeriod}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatINR(i.totalPaise)}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">{i.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 4: Payments */}
            {activeTab === 'payments' && (
              <div className="space-y-2 text-xs">
                {customerDetail.payments.map((p: any) => (
                  <div key={p.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{p.paymentMethod} · {p.paymentNumber}</span>
                      <div className="text-slate-400 font-mono text-[11px]">{p.transactionReference}</div>
                    </div>
                    <div className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatINR(p.amountPaise)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 5: Activity */}
            {activeTab === 'activity' && (
              <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                {customerDetail.activity.map((a: any) => (
                  <div key={a.id} className="py-2.5 flex justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{a.action}</span>
                      <p className="text-slate-500 mt-0.5">{a.details}</p>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px] shrink-0">{new Date(a.timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Add Enterprise Customer
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Legal Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Infotech Private Limited"
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Primary Contact Name</label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="e.g. Priya Sundaram"
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="accounts@client.in"
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={e => setTaxId(e.target.value)}
                    placeholder="29ABCDE1234F1Z5"
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-500 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
