/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  CheckCircle,
  CreditCard,
  QrCode,
  Building,
  ShieldCheck,
  Lock,
  ArrowRight,
  AlertCircle,
  Clock,
  Sparkles,
  Printer,
  Copy,
  Check
} from 'lucide-react';
import { Invoice, PaymentMethod, SubscriptionPlan } from '../../types/index.ts';
import { formatINR, paiseToRupees, rupeesToPaise } from '../../utils/finance.ts';

interface PaymentModalProps {
  invoice?: Invoice | null;
  plan?: SubscriptionPlan | null;
  defaultDiscountCode?: string;
  onClose: () => void;
  onSuccess: () => void;
  isCustomer?: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  invoice,
  plan,
  defaultDiscountCode = '',
  onClose,
  onSuccess,
  isCustomer = true,
}) => {
  if (!invoice && !plan) return null;

  // Checkout type
  const isPlanCheckout = Boolean(plan);

  // Method State
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  
  // Invoice mode amount
  const [amountRupees, setAmountRupees] = useState<string>(
    invoice ? paiseToRupees(invoice.outstandingBalancePaise).toString() : '0'
  );

  // Plan mode discount
  const [couponCode, setCouponCode] = useState(defaultDiscountCode);
  const [appliedDiscountPercent, setAppliedDiscountPercent] = useState<number>(() => {
    if (defaultDiscountCode.toUpperCase() === 'FESTIVE25') return 25;
    if (defaultDiscountCode.toUpperCase() === 'STARTUP50') return 50;
    if (defaultDiscountCode.toUpperCase() === 'ANNUAL15') return 15;
    return 0;
  });
  const [couponError, setCouponError] = useState('');
  const [couponAppliedSuccess, setCouponAppliedSuccess] = useState(Boolean(defaultDiscountCode));

  // Instrument inputs
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [notes, setNotes] = useState(isCustomer ? 'Verified digital checkout' : 'Direct bank settlement');

  // Gateway Simulation & 3DS
  const [step, setStep] = useState<'details' | 'processing' | 'otp' | 'success'>('details');
  const [otpValue, setOtpValue] = useState('123456');
  const [processingStatus, setProcessingStatus] = useState('Initializing secure session...');
  const [error, setError] = useState('');
  const [verifiedResult, setVerifiedResult] = useState<any>(null);
  const [copiedTxn, setCopiedTxn] = useState(false);

  // Calculation for Plan Checkout
  const calculatePlanTotals = () => {
    if (!plan) return { basePaise: 0, discountPaise: 0, taxPaise: 0, totalPaise: 0 };
    const basePaise = plan.pricePaise;
    const discountPaise = appliedDiscountPercent > 0 ? Math.round((basePaise * appliedDiscountPercent) / 100) : 0;
    const taxablePaise = Math.max(0, basePaise - discountPaise);
    const taxPaise = Math.round(taxablePaise * 0.18);
    const totalPaise = taxablePaise + taxPaise;
    return { basePaise, discountPaise, taxPaise, totalPaise };
  };

  const planTotals = calculatePlanTotals();

  const handleApplyCoupon = () => {
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setAppliedDiscountPercent(0);
      setCouponAppliedSuccess(false);
      return;
    }

    if (code === 'FESTIVE25') {
      setAppliedDiscountPercent(25);
      setCouponAppliedSuccess(true);
    } else if (code === 'STARTUP50') {
      setAppliedDiscountPercent(50);
      setCouponAppliedSuccess(true);
    } else if (code === 'ANNUAL15') {
      setAppliedDiscountPercent(15);
      setCouponAppliedSuccess(true);
    } else {
      setCouponError('Invalid voucher code. Try FESTIVE25, STARTUP50, or ANNUAL15.');
      setAppliedDiscountPercent(0);
      setCouponAppliedSuccess(false);
    }
  };

  const executeApiPayment = async (generatedTxnRef: string) => {
    if (isPlanCheckout && plan) {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          discountCode: couponAppliedSuccess ? couponCode.trim().toUpperCase() : undefined,
          paymentMethod: method,
          transactionReference: generatedTxnRef,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Subscription checkout failed');
      }
      return data;
    } else if (invoice) {
      const amountPaise = rupeesToPaise(amountRupees);
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          paymentMethod: method,
          amountPaise,
          transactionReference: generatedTxnRef,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invoice payment failed');
      }
      return data;
    }
  };

  const handleStartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side instrument validation
    if (method === 'UPI') {
      if (upiId && !upiId.includes('@')) {
        setError('Please enter a valid UPI VPA address (e.g., name@okaxis, user@upi).');
        return;
      }
    } else if (method === 'Card') {
      const cleanNum = cardNumber.replace(/\s+/g, '');
      if (cleanNum.length < 12) {
        setError('Please enter a valid 16-digit debit or credit card number.');
        return;
      }
    }

    if (!isPlanCheckout && invoice) {
      const amountPaise = rupeesToPaise(amountRupees);
      if (amountPaise <= 0) {
        setError('Please enter a valid payment amount greater than zero.');
        return;
      }
    }

    // If card payment, show 3DS OTP step
    if (method === 'Card') {
      setStep('otp');
      return;
    }

    // Direct gateway processing
    await processPaymentTransaction();
  };

  const processPaymentTransaction = async () => {
    setStep('processing');
    setError('');

    const generatedTxnRef = `PULSE_TXN_${Date.now().toString().slice(-8)}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    try {
      setProcessingStatus('Verifying banking gateway credentials & 256-bit token...');
      await new Promise(r => setTimeout(r, 600));

      setProcessingStatus(`Connecting to ${method} clearing ledger...`);
      await new Promise(r => setTimeout(r, 700));

      setProcessingStatus('Authorizing transaction & recording GST audit receipt...');
      const responseData = await executeApiPayment(generatedTxnRef);

      setVerifiedResult({
        txnRef: generatedTxnRef,
        method,
        timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        amountPaise: isPlanCheckout ? planTotals.totalPaise : rupeesToPaise(amountRupees),
        itemTitle: isPlanCheckout ? plan?.name : invoice?.invoiceNumber,
        responseData,
      });

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
      setStep('details');
    }
  };

  const handleCopyTxn = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedTxn(true);
    setTimeout(() => setCopiedTxn(false), 3000);
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Pulse Secure Checkout
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal-400/20 text-teal-300 font-semibold border border-teal-400/30">
                  SANDBOX 256-BIT
                </span>
              </div>
              <p className="text-[11px] text-teal-200/80 font-mono">
                {isPlanCheckout ? `Plan Subscription · ${plan?.name}` : `Invoice Settlement · ${invoice?.invoiceNumber}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: TRANSACTION DETAILS FORM */}
        {step === 'details' && (
          <form onSubmit={handleStartPayment} className="p-6 space-y-4">
            {error && (
              <div className="p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Price Overview Card */}
            {isPlanCheckout && plan ? (
              <div className="p-4 bg-teal-50/50 dark:bg-teal-950/30 rounded-2xl border border-teal-100 dark:border-teal-900/50 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {plan.name} ({plan.billingFrequency})
                  </span>
                  <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                    {formatINR(planTotals.basePaise)}
                  </span>
                </div>

                {/* Promo Code Input */}
                <div className="pt-2 border-t border-teal-200/40 dark:border-teal-800/40">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Discount code (e.g. FESTIVE25)"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value)}
                      className="grow px-3 py-1.5 text-xs font-mono uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-[11px] text-rose-600 mt-1">{couponError}</p>}
                  {couponAppliedSuccess && (
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 mt-1 text-[11px] font-semibold">
                      <span>✓ {appliedDiscountPercent}% discount applied</span>
                      <span className="font-mono">-{formatINR(planTotals.discountPaise)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-slate-500 text-[11px]">
                  <span>Domestic GST (18% Software / SaaS)</span>
                  <span className="font-mono">{formatINR(planTotals.taxPaise)}</span>
                </div>

                <div className="pt-2 border-t border-teal-200/40 dark:border-teal-800/40 flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">Total Payable Now:</span>
                  <span className="font-mono font-bold text-teal-700 dark:text-teal-400 text-base">
                    {formatINR(planTotals.totalPaise)}
                  </span>
                </div>
              </div>
            ) : invoice ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500">Invoice Total:</span>
                  <p className="font-mono font-medium text-slate-700 dark:text-slate-300">
                    {formatINR(invoice.totalPaise)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Outstanding Balance:</span>
                  <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                    {formatINR(invoice.outstandingBalancePaise)}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Payment Instrument
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                  { id: 'Card', label: 'Card (3DS)', icon: CreditCard },
                  { id: 'Bank Transfer', label: 'NetBanking', icon: Building },
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = method === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMethod(item.id as PaymentMethod)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Method Specific Fields */}
            {method === 'UPI' && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 bg-white p-1.5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=brightloop.pulse@icici%26pn=Brightloop%20Pulse%26cu=INR"
                      alt="UPI QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-xs space-y-1">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      Scan with any UPI App
                    </span>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      GPay, PhonePe, Paytm, or BHIM. Or enter your Virtual Payment Address (VPA) below:
                    </p>
                    <div className="text-[10px] font-mono text-teal-700 dark:text-teal-400 font-semibold">
                      VPA: brightloop.pulse@icici
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Your UPI ID / VPA (Optional for instant push request)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. yourname@okhdfcbank"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
                  />
                </div>
              </div>
            )}

            {method === 'Card' && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={19}
                      placeholder="4532 •••• •••• 8890"
                      value={cardNumber}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                        setCardNumber(val);
                      }}
                      className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
                    />
                    <CreditCard className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      maxLength={5}
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={e => setCardExpiry(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      CVV / Security Code
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="•••"
                      value={cardCvv}
                      onChange={e => setCardCvv(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    placeholder="As printed on card"
                    value={cardHolder}
                    onChange={e => setCardHolder(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
                  />
                </div>
                <div className="text-[10px] text-teal-700 dark:text-teal-400 font-mono">
                  Sandbox Test Card: 4532 0123 4567 8890 · Any MM/YY · 123
                </div>
              </div>
            )}

            {method === 'Bank Transfer' && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select NetBanking Bank
                  </label>
                  <select
                    value={selectedBank}
                    onChange={e => setSelectedBank(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                  >
                    <option>HDFC Bank</option>
                    <option>ICICI Bank</option>
                    <option>State Bank of India (SBI)</option>
                    <option>Axis Bank</option>
                    <option>Kotak Mahindra Bank</option>
                    <option>Punjab National Bank</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-500">
                  You will be securely routed to {selectedBank}'s verified corporate gateway to authorize this payment.
                </p>
              </div>
            )}

            {/* Custom invoice amount input if partial payment */}
            {!isPlanCheckout && invoice && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amount to Pay (INR ₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={amountRupees}
                    onChange={e => setAmountRupees(e.target.value)}
                    required
                    className="w-full pl-7 pr-3 py-2 text-xs font-mono tabular-nums bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:border-teal-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            )}

            {/* Submit Bar */}
            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified SSL Checkout</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>
                    Pay {formatINR(isPlanCheckout ? planTotals.totalPaise : rupeesToPaise(amountRupees))}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 2: 3D SECURE OTP SIMULATION */}
        {step === 'otp' && (
          <div className="p-6 space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                3D Secure Bank Verification
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                An authentication one-time passcode has been dispatched to your registered mobile number for card ending in{' '}
                <strong className="font-mono text-slate-800 dark:text-slate-200">
                  {cardNumber.slice(-4) || '8890'}
                </strong>.
              </p>
            </div>

            <div className="max-w-xs mx-auto space-y-3">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={otpValue}
                  onChange={e => setOtpValue(e.target.value)}
                  className="w-full text-center tracking-[0.5em] font-mono text-lg py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                />
                <span className="text-[10px] text-teal-600 dark:text-teal-400 mt-1 block font-mono">
                  Sandbox OTP: 123456
                </span>
              </div>

              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={processPaymentTransaction}
                  className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Authorize Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PROCESSING SPINNER */}
        {step === 'processing' && (
          <div className="p-10 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full border-4 border-teal-200 border-t-teal-700 animate-spin mx-auto" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Processing Secure Clearance
            </h4>
            <p className="text-xs text-slate-500 font-mono animate-pulse">
              {processingStatus}
            </p>
          </div>
        )}

        {/* STEP 4: VERIFIED SUCCESS RECEIPT */}
        {step === 'success' && verifiedResult && (
          <div className="p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Payment Verified & Cleared
              </h4>
              <p className="text-xs text-slate-500">
                Your transaction has been confirmed on the banking ledger and tax records have been generated.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Transaction Reference:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {verifiedResult.txnRef}
                  </span>
                  <button
                    onClick={() => handleCopyTxn(verifiedResult.txnRef)}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {copiedTxn ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Item / Allocation:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {verifiedResult.itemTitle}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Payment Instrument:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {verifiedResult.method} (Cleared)
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Clearance Timestamp:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {verifiedResult.timestamp}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
                <span>Amount Paid:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {formatINR(verifiedResult.amountPaise)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Done / View Dashboard
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
