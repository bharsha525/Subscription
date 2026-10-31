/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  UserCheck,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  KeyRound,
  RotateCcw,
  Sparkles,
  UserPlus,
  Building,
  Check,
  User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { motion, AnimatePresence } from 'motion/react';

export const LoginPage: React.FC = () => {
  const { login, register, forgotPassword, resetPassword } = useAuth();

  // Mode: Sign In vs Register
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Sign In Form states
  const [email, setEmail] = useState('admin@brightloop.io');
  const [password, setPassword] = useState('Pulse@2026!');
  const [role, setRole] = useState<'admin' | 'staff' | 'client'>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Register Form states (Requirement 5)
  const [regFullName, setRegFullName] = useState('');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  // Forgot Password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState<{
    message?: string;
    isDevMode?: boolean;
    devResetToken?: string;
    devResetLink?: string;
  } | null>(null);

  // Reset Password form state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await login(email, password, role, rememberMe);
      if (!res.success) {
        setErrorMessage(res.error || 'Authentication failed. Please check credentials and selected role.');
      } else {
        setSuccessMessage('Authentication successful. Redirecting to workspace...');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (regPassword.length < 9) {
      setErrorMessage('Password must be at least 9 characters long.');
      return;
    }
    if (!/[A-Z]/.test(regPassword)) {
      setErrorMessage('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[a-z]/.test(regPassword)) {
      setErrorMessage('Password must contain at least one lowercase letter.');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(regPassword)) {
      setErrorMessage('Password must contain at least one special character.');
      return;
    }

    setRegLoading(true);
    try {
      const displayName = regCompanyName ? `${regFullName} (${regCompanyName})` : regFullName;
      const res = await register(displayName, regEmail, regPassword, regConfirmPassword);
      if (!res.success) {
        setErrorMessage(res.error || 'Registration failed.');
      } else {
        setSuccessMessage('Account registered successfully! Redirecting to Customer Portal...');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleQuickFill = (targetRole: 'admin' | 'staff' | 'client') => {
    setRole(targetRole);
    setErrorMessage('');
    if (targetRole === 'admin') {
      setEmail('admin@brightloop.io');
      setPassword('Pulse@2026!');
    } else if (targetRole === 'staff') {
      setEmail('sarah.ops@brightloop.io');
      setPassword('Pulse@2026!');
    } else {
      setEmail('priya@acmetech.in');
      setPassword('Pulse@2026!');
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setErrorMessage('');
    try {
      const res = await forgotPassword(forgotEmail);
      if (res.success) {
        setForgotResult({
          message: res.message,
          isDevMode: res.isDevMode,
          devResetToken: res.devResetToken,
          devResetLink: res.devResetLink,
        });
      } else {
        setErrorMessage(res.error || 'Failed to process password reset request.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error sending password reset request.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters long.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await resetPassword(resetToken, newPassword, confirmPassword);
      if (res.success) {
        setResetModalOpen(false);
        setForgotModalOpen(false);
        setForgotResult(null);
        setPassword(newPassword);
        setSuccessMessage('Password successfully updated! You can now log in with your new credentials.');
      } else {
        setResetError(res.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      setResetError(err.message || 'Error occurred while resetting password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] dark:bg-[#090D16] text-slate-800 dark:text-slate-100 font-sans selection:bg-[#EAB308]/20 selection:text-[#0F172A]">
      
      {/* Left Hero / Brand Showcase (Desktop / Laptop) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0F1D] text-white relative overflow-hidden border-r border-slate-800">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#EAB308]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Wordmark */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-[#EAB308]/40 flex items-center justify-center font-black text-[#EAB308] text-lg shadow-md ring-2 ring-[#EAB308]/30">
            <span className="drop-shadow-[0_0_8px_rgba(234,179,8,0.85)]">P</span>
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white">BRIGHTLOOP PULSE</span>
            <span className="block text-xs text-[#EAB308] font-mono tracking-wide font-medium">
              Enterprise Recurring Revenue Ops
            </span>
          </div>
        </div>

        {/* Center Pitch */}
        <div className="relative z-10 space-y-6 max-w-lg my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAB308]/15 border border-[#EAB308]/30 text-[#EAB308] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[#EAB308] animate-pulse shadow-[0_0_6px_rgba(234,179,8,0.8)]" />
            Fintech Production Architecture
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight font-display">
            Every Subscription. Every Payment. One Clear Picture.
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed font-normal">
            Autonomous integer-paise recurring billing engine with dry-run collision guards, SMS Gateway customer engagement, empathetic gentle chase collections, and 3-way bank reconciliation.
          </p>

          {/* Value Proof Badges */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-xs font-mono text-[#EAB308] font-bold">Never Twice, Never Missed</div>
              <div className="text-[11px] text-slate-300 mt-1">Idempotent cycle execution with composite uniqueness guards.</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-xs font-mono text-[#EAB308] font-bold">Zero Revenue Leakage</div>
              <div className="text-[11px] text-slate-300 mt-1">Automatic audit reconciliation & unbilled lifecycle watchdog.</div>
            </div>
          </div>
        </div>

        {/* Bottom Security Assurance */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-400 font-mono">
          <ShieldCheck className="w-4 h-4 text-[#EAB308] drop-shadow-[0_0_6px_rgba(234,179,8,0.6)]" />
          <span>Role-Based Access Control · Designated Admin Lock · TRAI DLT SMS Gateway</span>
        </div>
      </div>

      {/* Right Login / Registration Workspace */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 max-w-xl mx-auto w-full">
        
        {/* Mobile Header Wordmark */}
        <div className="lg:hidden flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[#0F172A] border border-[#EAB308]/40 flex items-center justify-center font-bold text-[#EAB308] text-base shadow-sm">
            <span className="drop-shadow-[0_0_6px_rgba(234,179,8,0.8)]">P</span>
          </div>
          <div>
            <span className="font-bold text-lg text-slate-900 dark:text-white">BRIGHTLOOP PULSE</span>
            <span className="block text-[11px] text-[#EAB308] font-mono font-semibold">
              Every Subscription. Every Payment.
            </span>
          </div>
        </div>

        {/* Tab Switcher: Sign In vs Register / Sign Up */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl mb-6 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              authMode === 'login'
                ? 'bg-[#0F172A] text-[#EAB308] border border-[#EAB308]/40 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              authMode === 'register'
                ? 'bg-[#0F172A] text-[#EAB308] border border-[#EAB308]/40 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-[#EAB308]" />
            <span>Register / Sign Up</span>
          </button>
        </div>

        {/* Title & Subtitle based on mode */}
        <div className="space-y-1 mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
            {authMode === 'login' ? 'Sign in to your account' : 'Create your Customer Account'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {authMode === 'login'
              ? 'Select your assigned role and enter your registered credentials to proceed.'
              : 'Join Brightloop to manage subscriptions, preview invoices, and settle balances instantly.'}
          </p>
        </div>

        {/* Notifications & Error Banners */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5 mb-5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5 mb-5 animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1">{successMessage}</div>
          </div>
        )}

        {/* ================= MODE 1: SIGN IN ================= */}
        {authMode === 'login' && (
          <div className="space-y-6">
            {/* Quick Demo Credentials Helper */}
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100">
                <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#0F172A] dark:text-[#EAB308]">
                  <Sparkles className="w-3.5 h-3.5 text-[#EAB308] drop-shadow-[0_0_6px_rgba(234,179,8,0.7)]" />
                  Quick Demo Credentials
                </span>
                <span className="text-[10px] text-[#EAB308] font-mono font-bold">1-Click Auto Fill</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-center transition-all cursor-pointer ${
                    role === 'admin'
                      ? 'bg-[#0F172A] text-[#EAB308] border border-[#EAB308] shadow-xs font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-[#EAB308]/60'
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('staff')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-center transition-all cursor-pointer ${
                    role === 'staff'
                      ? 'bg-[#0F172A] text-[#EAB308] border border-[#EAB308] shadow-xs font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-[#EAB308]/60'
                  }`}
                >
                  Staff
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('client')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-center transition-all cursor-pointer ${
                    role === 'client'
                      ? 'bg-[#0F172A] text-[#EAB308] border border-[#EAB308] shadow-xs font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-[#EAB308]/60'
                  }`}
                >
                  Client Portal
                </button>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#EAB308]/40 focus:border-[#EAB308] transition-all font-mono"
                  />
                </div>
                {role === 'admin' && (
                  <p className="text-[11px] text-[#0F172A] dark:text-[#EAB308] font-mono font-semibold mt-0.5">
                    *Designated Admin: admin@brightloop.io
                  </p>
                )}
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Role Selection <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#EAB308]/40 focus:border-[#EAB308] transition-all cursor-pointer font-medium"
                  >
                    <option value="admin">Admin (Designated Preconfigured Executive)</option>
                    <option value="staff">Staff (Operations & Accounts Support)</option>
                    <option value="client">Client (Customer Self-Service Portal)</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotModalOpen(true);
                      setForgotEmail(email);
                      setForgotResult(null);
                    }}
                    className="text-xs font-medium text-[#0F172A] dark:text-[#EAB308] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#EAB308]/40 focus:border-[#EAB308] transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#EAB308] focus:ring-[#EAB308] border-slate-300 dark:border-slate-700 cursor-pointer"
                />
                <label htmlFor="rememberMe" className="text-xs text-slate-600 dark:text-slate-400 select-none cursor-pointer">
                  Remember me on this browser session
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs border border-[#EAB308]/40 hover:border-[#EAB308] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 group"
              >
                {loading ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin text-[#EAB308]" />
                    <span>Validating Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in to Dashboard</span>
                    <ArrowRight className="w-4 h-4 text-[#EAB308] group-hover:drop-shadow-[0_0_6px_rgba(234,179,8,0.8)] transition-all" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ================= MODE 2: REGISTER (Requirement 5) ================= */}
        {authMode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Account Role Notice */}
            <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-900 dark:text-teal-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Public registration creates <strong>Customer Accounts</strong>. Staff and Admin accounts are pre-configured.</span>
            </div>

            {/* Full Name & Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    placeholder="e.g. Vikram Malhotra"
                    className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={regCompanyName}
                    onChange={e => setRegCompanyName(e.target.value)}
                    placeholder="e.g. Horizon Labs India"
                    className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Work Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="vikram@horizonlabs.in"
                  className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="Min 9 chars, uppercase, lowercase & symbol"
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(prev => !prev)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regConfirmPassword}
                  onChange={e => setRegConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            {/* Password Validation Hints */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-500 pt-1">
              <span className={`flex items-center gap-1 ${regPassword.length >= 9 ? 'text-emerald-600 font-medium' : ''}`}>
                <Check className="w-3 h-3" /> Min 9 characters
              </span>
              <span className={`flex items-center gap-1 ${/[A-Z]/.test(regPassword) ? 'text-emerald-600 font-medium' : ''}`}>
                <Check className="w-3 h-3" /> 1 Uppercase letter
              </span>
              <span className={`flex items-center gap-1 ${/[a-z]/.test(regPassword) ? 'text-emerald-600 font-medium' : ''}`}>
                <Check className="w-3 h-3" /> 1 Lowercase letter
              </span>
              <span className={`flex items-center gap-1 ${/[!@#$%^&*(),.?":{}|<>]/.test(regPassword) ? 'text-emerald-600 font-medium' : ''}`}>
                <Check className="w-3 h-3" /> 1 Special character
              </span>
            </div>

            {/* Register Submit */}
            <button
              type="submit"
              disabled={regLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs border border-[#EAB308]/40 hover:border-[#EAB308] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2 group"
            >
              {regLoading ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-[#EAB308]" />
                  <span>Securing & Registering Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Enter Portal</span>
                  <ArrowRight className="w-4 h-4 text-[#EAB308] group-hover:drop-shadow-[0_0_6px_rgba(234,179,8,0.8)] transition-all" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Security & System Info Note */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Brightloop Pulse v2026.4</span>
          <span>Zero-Leakage Guarantee</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {forgotModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                  <KeyRound className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Forgot Password Reset
                </div>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {!forgotResult ? (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Enter your registered email address. We will generate a secure, single-use, time-limited reset link (valid for 15 minutes).
                  </p>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotModalOpen(false)}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#115E59] rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {forgotLoading ? 'Processing...' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                    {forgotResult.message}
                  </div>

                  {forgotResult.isDevMode && forgotResult.devResetToken && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                      <div className="font-mono text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase">
                        Active Reset Token (15m validity)
                      </div>
                      <div className="font-mono text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 break-all select-all">
                        {forgotResult.devResetToken}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setResetToken(forgotResult.devResetToken || '');
                          setForgotModalOpen(false);
                          setResetModalOpen(true);
                        }}
                        className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        Proceed to Reset Form →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {resetModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                  <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Set New Password
                </div>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              {resetError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                  {resetError}
                </div>
              )}

              <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Reset Token</label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={e => setResetToken(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">New Password (Min 8 chars)</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(false)}
                    className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-1.5 font-semibold text-white bg-[#0F766E] hover:bg-[#115E59] rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {resetLoading ? 'Updating...' : 'Update & Confirm Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
