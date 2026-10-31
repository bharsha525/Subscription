/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Layers,
  FileText,
  Clock,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Download,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Tag,
  User,
  Building,
  Mail,
  Phone,
  Copy,
  Send,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Check
} from 'lucide-react';
import { Customer, Subscription, Invoice, Payment, Product, SubscriptionPlan } from '../types/index.ts';
import { formatINR } from '../utils/finance.ts';
import { InvoiceModal } from '../components/common/InvoiceModal.tsx';
import { PaymentModal } from '../components/common/PaymentModal.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { motion } from 'motion/react';
import { MotionView } from '../components/motion/MotionView.tsx';
import { openGmailCompose } from '../utils/email.ts';

interface CustomerPortalViewProps {
  currentView?: string;
  onNavigate: (view: string) => void;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({ currentView = 'portal', onNavigate }) => {
  const { currentUser } = useAuth();
  const [portalData, setPortalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [activeDiscountCode, setActiveDiscountCode] = useState<string>('');

  // Tab State
  const activeTab = currentView || 'portal';

  // Discounts tab state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Support Ticket Form state
  const [supportSubject, setSupportSubject] = useState('');
  const [supportCategory, setSupportCategory] = useState('Billing Inquiry');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);

  // Profile Edit state
  const [profileSavedFeedback, setProfileSavedFeedback] = useState(false);

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      const [resOverview, resProd, resPlans] = await Promise.all([
        fetch('/api/portal/overview'),
        fetch('/api/products'),
        fetch('/api/plans'),
      ]);
      const dataOverview = await resOverview.json();
      const dataProd = await resProd.json();
      const dataPlans = await resPlans.json();

      setPortalData(dataOverview);
      setProducts(dataProd.products || []);
      setPlans(dataPlans.plans || []);
    } catch (err) {
      console.error('Failed to load portal data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  const handleCopyPromo = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSupportSubmitting(true);
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[Client Ticket - ${supportCategory}] ${supportSubject}`,
          description: `Submitted by ${currentUser?.fullName} (${currentUser?.email}):\n${supportMessage}`,
          priority: supportCategory === 'Disputed Charge' ? 'urgent' : 'high',
          dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        }),
      });
      if (res.ok) {
        setSupportSuccess(true);
        setSupportSubject('');
        setSupportMessage('');
        setTimeout(() => setSupportSuccess(false), 6000);
      }
    } catch (err) {
      console.error('Failed to submit support inquiry', err);
    } finally {
      setSupportSubmitting(false);
    }
  };

  if (loading || !portalData) {
    return (
      <div className="p-8 space-y-6 animate-pulse max-w-5xl mx-auto">
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const { customer, activeSubscription, subscriptions, invoices, recentPayments, outstandingPaise } = portalData;

  const monthlyRunRate = activeSubscription ? activeSubscription.totalPaise : 0;
  const forecastMonths = [
    { label: 'Nov 2026', estimatePaise: monthlyRunRate },
    { label: 'Dec 2026', estimatePaise: monthlyRunRate },
    { label: 'Jan 2027', estimatePaise: monthlyRunRate },
    { label: 'Feb 2027', estimatePaise: monthlyRunRate },
    { label: 'Mar 2027', estimatePaise: monthlyRunRate },
    { label: 'Apr 2027', estimatePaise: monthlyRunRate },
  ];

  const availableDiscounts = [
    {
      code: 'FESTIVE25',
      title: 'Diwali & New Fiscal Celebration',
      discount: '25% Flat Discount',
      description: 'Applicable on any annual plan upgrade or addition of high-capacity storage add-ons.',
      validUntil: 'Nov 30, 2026',
      minTerm: 'Annual commitment',
    },
    {
      code: 'STARTUP50',
      title: 'Founder Growth Catalyst',
      discount: '50% Off First Quarter',
      description: 'Exclusive tier grant for seed and Series A startups migrating from legacy billing software.',
      validUntil: 'Dec 31, 2026',
      minTerm: 'Quarterly billing',
    },
    {
      code: 'ANNUAL15',
      title: 'Enterprise Pre-payment Waiver',
      discount: '15% Off Total Billing',
      description: 'Available automatically when prepaying multi-year enterprise platform commitments via wire/NEFT.',
      validUntil: 'Ongoing',
      minTerm: 'Multi-year agreement',
    },
  ];

  return (
    <MotionView className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      
      {/* 1. Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#082926] via-[#0E3D39] to-[#0A2724] text-white p-6 md:p-8 shadow-xl relative overflow-hidden border border-teal-500/20">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-teal-300 text-xs font-semibold tracking-wider uppercase font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Client Self-Service Portal
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome back, {customer?.contactName || currentUser?.fullName || 'Valued Partner'}
          </h1>
          <p className="text-sm text-teal-100/80 max-w-xl font-normal leading-relaxed">
            Your subscriptions, made simple. Transparent pricing, instant GST receipts, and verified zero hidden charges.
          </p>
        </div>

        {/* Quick Account Strip */}
        <div className="mt-5 pt-4 border-t border-teal-500/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-teal-300/80">Account:</span>{' '}
              <strong className="text-white font-medium">{customer?.companyName}</strong>
            </div>
            <div>
              <span className="text-teal-300/80">GSTIN:</span>{' '}
              <strong className="text-white font-mono">{customer?.taxId || '29ABCDE1234F1Z5'}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs bg-black/25 px-3 py-1.5 rounded-xl border border-teal-500/30">
            <span className="text-teal-200">Current Balance Due:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {formatINR(outstandingPaise)}
            </span>
          </div>
        </div>
      </div>

      {/* Discrete Client Portal Tab Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 text-xs font-medium no-scrollbar">
        {[
          { id: 'portal', label: 'My Subscriptions', icon: Layers },
          { id: 'portal-products', label: 'My Products & Catalog', icon: Sparkles },
          { id: 'portal-invoices', label: 'My Invoices', icon: FileText },
          { id: 'portal-history', label: 'Payment Receipts', icon: CreditCard },
          { id: 'portal-discounts', label: 'Available Discounts', icon: Tag },
          { id: 'portal-profile', label: 'Billing Profile', icon: User },
          { id: 'portal-support', label: 'Help & Support', icon: HelpCircle },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: MY SUBSCRIPTIONS (portal) ================= */}
      {activeTab === 'portal' && (
        <div className="space-y-6">
          {activeSubscription ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400 font-mono">
                    Transparent Billing Breakdown
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Next Bill, Explained
                  </h2>
                  <p className="text-xs text-slate-500">
                    Your next recurring bill is <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatINR(activeSubscription.totalPaise)}</strong> due on{' '}
                    <strong className="text-slate-800 dark:text-slate-200">{activeSubscription.nextBillingDate}</strong>. Here's exactly how it is calculated:
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {activeSubscription.status}
                </span>
              </div>

              {/* Breakdown Box */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{activeSubscription.planName}</span>
                    <span className="text-slate-400 ml-2">({activeSubscription.billingFrequency} commitment)</span>
                  </div>
                  <span className="font-mono font-medium">{formatINR(activeSubscription.subtotalPaise)}</span>
                </div>

                {activeSubscription.discountAmountPaise > 0 && (
                  <div className="flex justify-between items-center py-1 text-emerald-600 dark:text-emerald-400">
                    <span>Applied Discount ({activeSubscription.discountCode || 'Promo'})</span>
                    <span className="font-mono font-medium">-{formatINR(activeSubscription.discountAmountPaise)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-1 text-slate-500">
                  <span>Standard GST (18% Domestic Software / Service)</span>
                  <span className="font-mono">{formatINR(activeSubscription.taxAmountPaise)}</span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center font-bold text-sm text-slate-900 dark:text-white">
                  <span>Final Payable per Cycle</span>
                  <span className="font-mono text-teal-700 dark:text-teal-400">
                    {formatINR(activeSubscription.totalPaise)}
                  </span>
                </div>
              </div>

              {/* 6-Month Forward Cost Forecast with Animated Visual Bars */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
                    6-Month Forward Cost Projection
                  </span>
                  <span className="text-[10px] text-slate-400 italic">
                    *Estimated projection based on current active tiers and tax rates
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {forecastMonths.map((m, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.25 }}
                      className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 text-center text-xs relative overflow-hidden group hover:border-teal-300 dark:hover:border-teal-700 transition-colors"
                    >
                      <div className="text-[10px] font-medium text-slate-400">{m.label}</div>
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                        {formatINR(m.estimatePaise, { compact: true })}
                      </div>
                      <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '85%' }}
                          transition={{ delay: 0.2 + idx * 0.05, duration: 0.4 }}
                          className="h-full bg-teal-500 rounded-full"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Get Started with Brightloop</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  You don't have an active subscription yet. Select a plan below with instant verified checkout to start your enterprise recurring service.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('portal-products')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs shadow-md shadow-teal-700/20 cursor-pointer"
              >
                <span>Browse All Plans & Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Plans & Pricing Showcase (Requirement 4) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                    Available Plans & Upgrades
                  </span>
                  <span className="text-xs text-slate-400 font-mono">18% GST Applicable</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  Choose or Upgrade Your Subscription
                </h3>
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-teal-50 to-indigo-50 dark:from-teal-950/40 dark:to-indigo-950/40 px-3 py-1.5 rounded-xl border border-teal-200/60 dark:border-teal-800/60 text-xs">
                <Tag className="w-3.5 h-3.5 text-teal-600" />
                <span className="text-slate-700 dark:text-slate-300">
                  Promo <strong className="font-mono text-teal-700 dark:text-teal-400">FESTIVE25</strong> (25% off)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {plans.slice(0, 3).map(pl => {
                const isCurrent = activeSubscription?.planId === pl.id;
                return (
                  <div
                    key={pl.id}
                    className={`rounded-2xl p-4 bg-slate-50/70 dark:bg-slate-950/40 border transition-all flex flex-col justify-between ${
                      isCurrent
                        ? 'border-teal-500 ring-2 ring-teal-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-teal-400'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-teal-200/50">
                            {pl.billingFrequency}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                            {pl.name}
                          </h4>
                        </div>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-1 pt-1">
                        <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                          {formatINR(pl.pricePaise)}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          /{pl.billingFrequency}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {pl.description || 'Full platform capabilities and automated billing engine.'}
                      </p>
                    </div>

                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutPlan(pl);
                          setActiveDiscountCode('FESTIVE25');
                        }}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                          isCurrent
                            ? 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 hover:bg-slate-100'
                            : 'bg-teal-700 hover:bg-teal-800 text-white'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{isCurrent ? 'Renew / Extend' : 'Select & Pay'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onNavigate('portal-products')}
                className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View all products, add-ons and full catalog</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* All Subscriptions List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Subscription History & Commitments
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(subscriptions || []).map((sub: Subscription) => (
                <div key={sub.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{sub.planName}</span>
                    <span className="text-slate-400 ml-2 font-mono">#{sub.subscriptionNumber}</span>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Started: {sub.startDate} · Renews: {sub.nextBillingDate}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatINR(sub.totalPaise)} / {sub.billingFrequency}
                    </span>
                    <div className="mt-0.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                        sub.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: MY PRODUCTS & CATALOG (portal-products) ================= */}
      {activeTab === 'portal-products' && (
        <div className="space-y-8">
          {/* Section A: Available Subscription Plans */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-600 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                    Self-Service Subscription
                  </span>
                  <span className="text-xs text-slate-400 font-mono">18% GST Applicable</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  Choose Your Subscription Plan
                </h2>
                <p className="text-xs text-slate-500">
                  Select a subscription plan below to immediately activate your enterprise platform tier and proceed to payment.
                </p>
              </div>

              {/* Promo Banner Chip */}
              <div className="flex items-center gap-2 bg-gradient-to-r from-teal-50 to-indigo-50 dark:from-teal-950/40 dark:to-indigo-950/40 p-2.5 rounded-xl border border-teal-200/60 dark:border-teal-800/60 text-xs">
                <Tag className="w-3.5 h-3.5 text-teal-600" />
                <span className="text-slate-700 dark:text-slate-300">
                  Active Promo: <strong className="font-mono text-teal-700 dark:text-teal-400">FESTIVE25</strong> for 25% OFF
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map(pl => {
                const isCurrent = activeSubscription?.planId === pl.id;
                return (
                  <div
                    key={pl.id}
                    className={`rounded-2xl p-6 bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between shadow-xs ${
                      isCurrent
                        ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-teal-400 hover:shadow-md'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded">
                            {pl.billingFrequency} billing
                          </span>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                            {pl.name}
                          </h3>
                        </div>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Current Active
                          </span>
                        )}
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                            {formatINR(pl.pricePaise)}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            /{pl.billingFrequency}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          +18% Domestic GST · Auto-generated tax invoice
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {pl.description || 'Full platform capabilities, automated billing engine, and dedicated SLA.'}
                      </p>

                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>Min Quantity: {pl.minimumQuantity || 1} license</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>Instant UPI / Card 3DS Checkout</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>GST Input Credit (ITC) Eligible</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutPlan(pl);
                          setActiveDiscountCode('FESTIVE25');
                        }}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                          isCurrent
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            : 'bg-teal-700 hover:bg-teal-800 text-white shadow-teal-700/20'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{isCurrent ? 'Renew / Extend Plan' : 'Select Plan & Pay'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Available Products & Add-ons */}
          <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Available Platform Solutions & Add-on Modules
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Explore available products, tier upgrades, and variant capacities tailored for your business.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map(prod => (
                <div
                  key={prod.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700 dark:text-teal-400 font-semibold">
                        {prod.code}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {prod.name}
                      </h3>
                    </div>
                    <span className="font-mono text-sm font-bold text-teal-700 dark:text-teal-400">
                      From {formatINR(prod.salesPricePaise)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {prod.description}
                  </p>

                  {/* Variants List */}
                  {prod.variants && prod.variants.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Available Capacities & Editions:
                      </span>
                      <div className="space-y-1.5">
                        {prod.variants.map((v, i) => (
                          <div key={i} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-950/50">
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {v.attributeName}: {v.attributeValue}
                            </span>
                            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                              +{formatINR(v.additionalPricePaise)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">Standard GST 18%</span>
                    <button
                      onClick={() => {
                        setSupportCategory('Plan Upgrade');
                        setSupportSubject(`Inquiry: Adding ${prod.name}`);
                        setSupportMessage(`Hello, we would like to explore adding ${prod.name} or upgrading our current subscription tier.`);
                        onNavigate('portal-support');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-semibold text-xs hover:bg-teal-100 cursor-pointer"
                    >
                      <span>Request Add-on</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: MY INVOICES (portal-invoices) ================= */}
      {activeTab === 'portal-invoices' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Tax Invoices & Official Receipts
              </h3>
              <p className="text-xs text-slate-500">
                Section 4.B: View, inspect GST breakup, and settle tax invoices directly.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {invoices.length} Invoices
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Invoice No.</th>
                  <th className="py-2.5 px-3 font-semibold">Period</th>
                  <th className="py-2.5 px-3 font-semibold">Due Date</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Balance Due</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      No invoices generated yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv: Invoice) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">{inv.billingPeriod}</td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">{inv.dueDate}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {formatINR(inv.totalPaise)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span className={inv.outstandingBalancePaise > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}>
                          {formatINR(inv.outstandingBalancePaise)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : inv.status === 'Partially Paid'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          >
                            View / Print
                          </button>
                          {inv.outstandingBalancePaise > 0 && (
                            <button
                              onClick={() => setPayingInvoice(inv)}
                              className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer shadow-xs"
                            >
                              Pay Now
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
      )}

      {/* ================= TAB 4: PAYMENT RECEIPTS (portal-history) ================= */}
      {activeTab === 'portal-history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Realized Payment Receipts & Audit Log
              </h3>
              <p className="text-xs text-slate-500">
                Official records of settled payments, gateway transaction references, and clearance dates.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {recentPayments.length} Transactions
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {recentPayments.length === 0 ? (
              <p className="text-slate-400 py-6 text-center">No payment transactions recorded yet.</p>
            ) : (
              recentPayments.map((p: Payment) => (
                <div key={p.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{p.paymentMethod} Payment</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold">
                        Cleared ✓
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Ref: {p.transactionReference} · Allocated to {p.invoiceNumber}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      +{formatINR(p.amountPaise)}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">{p.paymentDate}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 5: AVAILABLE DISCOUNTS (portal-discounts) ================= */}
      {activeTab === 'portal-discounts' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-600" />
              Eligible Promotional Credits & Discount Vouchers
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Copy and apply these active discount codes during renewals or plan upgrades.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availableDiscounts.map(d => (
              <div
                key={d.code}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 uppercase">
                      {d.discount}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Until {d.validUntil}</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {d.title}
                  </h3>

                  <p className="text-xs text-slate-500">
                    {d.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                      {d.code}
                    </span>
                    <button
                      onClick={() => handleCopyPromo(d.code)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      {copiedCode === d.code ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (plans.length > 0) {
                        setCheckoutPlan(plans[0]);
                        setActiveDiscountCode(d.code);
                      }
                    }}
                    className="w-full py-1.5 px-3 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply & Subscribe Now</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 6: BILLING PROFILE (portal-profile) ================= */}
      {activeTab === 'portal-profile' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-600" />
                  Organization & Tax Identity
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified organization details printed on all formal GST tax invoices.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200">
                Verified Enterprise Account
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Legal Company Name</span>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">{customer?.companyName || 'Enterprise Corp'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GSTIN / Tax Identification</span>
                <p className="font-mono font-semibold text-slate-900 dark:text-white text-sm">{customer?.taxId || '29ABCDE1234F1Z5'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Primary Contact Person</span>
                <p className="font-semibold text-slate-900 dark:text-white">{customer?.contactName || currentUser?.fullName}</p>
                <p className="text-slate-500">{customer?.contactEmail || currentUser?.email}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Default Currency & Terms</span>
                <p className="font-semibold text-slate-900 dark:text-white">{customer?.currency || 'INR (₹)'} · Net 30 Terms</p>
                <p className="text-slate-500">Auto-reconciliation on RTGS / NEFT / UPI</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Registered Billing Address
              </span>
              <p className="text-slate-700 dark:text-slate-300">
                {customer?.billingAddress?.street || '742 Cyber City, Tech Corridor'}, {customer?.billingAddress?.city || 'Bangalore'}, {customer?.billingAddress?.state || 'Karnataka'} - {customer?.billingAddress?.postalCode || '560100'}, {customer?.billingAddress?.country || 'India'}
              </p>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Need to update your tax registration or legal address? Contact billing support.
              </p>
              <button
                onClick={() => onNavigate('portal-support')}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Request Profile Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 7: HELP & SUPPORT (portal-support) ================= */}
      {activeTab === 'portal-support' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 block">Dedicated Account Manager</span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Priya Sharma</h4>
                <p className="text-xs text-slate-500">Enterprise Account Support</p>
                <div className="text-xs font-mono text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  priya.sharma@brightloop.io
                </div>
              </div>
              <button
                type="button"
                onClick={() => openGmailCompose({
                  to: 'priya.sharma@brightloop.io',
                  subject: `Account Inquiry - ${customer?.companyName || 'Enterprise Client'}`,
                  body: `Hi Priya,\n\nI am contacting you regarding our Brightloop account (${customer?.companyName || ''}).\n\nIssue/Inquiry:\n- \n\nThank you,\n${customer?.contactName || currentUser?.fullName || ''}`,
                })}
                className="mt-2 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 hover:bg-teal-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send Email via Gmail</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">Phone Support Hotline</span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">+91 (80) 4120-8800</h4>
              <p className="text-xs text-slate-500">Mon-Fri: 9:00 AM - 7:00 PM IST</p>
              <div className="text-xs text-emerald-600 font-semibold pt-2 border-t border-slate-100 dark:border-slate-800">
                Priority Line Active
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">SLA Commitment</span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">99.95% Availability</h4>
              <p className="text-xs text-slate-500">Under 2h response on billing tickets</p>
              <div className="text-xs text-slate-400 font-mono pt-2 border-t border-slate-100 dark:border-slate-800">
                Enterprise Support Tier
              </div>
            </div>
          </div>

          {/* Inquiry / Ticket Submission Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-600" />
              Submit Priority Billing or Account Inquiry
            </h3>
            <p className="text-xs text-slate-500">
              Your inquiry will be logged directly to the Brightloop staff follow-up queue.
            </p>

            {supportSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Inquiry submitted successfully! A Brightloop staff member will follow up within 2 hours.</span>
              </div>
            )}

            <form onSubmit={handleSupportSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Inquiry Category
                  </label>
                  <select
                    value={supportCategory}
                    onChange={e => setSupportCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option>Billing Inquiry</option>
                    <option>Disputed Charge</option>
                    <option>Plan Upgrade</option>
                    <option>Payment Clearance Help</option>
                    <option>Tax Invoice GST Update</option>
                    <option>General Support</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    required
                    value={supportSubject}
                    onChange={e => setSupportSubject(e.target.value)}
                    placeholder="e.g. Question regarding October GST credit invoice"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Message Details
                </label>
                <textarea
                  required
                  rows={4}
                  value={supportMessage}
                  onChange={e => setSupportMessage(e.target.value)}
                  placeholder="Provide any invoice references, payment transaction IDs, or questions..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={supportSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 ${supportSubmitting ? 'animate-spin' : ''}`} />
                  <span>{supportSubmitting ? 'Dispatching...' : 'Submit Inquiry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      <InvoiceModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onRecordPayment={(inv) => {
          setSelectedInvoice(null);
          setPayingInvoice(inv);
        }}
        isCustomer={true}
      />

      {/* Verified Client-Side Payment Gateway Modal */}
      <PaymentModal
        invoice={payingInvoice}
        plan={checkoutPlan}
        defaultDiscountCode={activeDiscountCode}
        onClose={() => {
          setPayingInvoice(null);
          setCheckoutPlan(null);
          setActiveDiscountCode('');
        }}
        onSuccess={() => {
          fetchPortalData();
        }}
        isCustomer={true}
      />
    </MotionView>
  );
};
