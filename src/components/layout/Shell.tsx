/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Activity,
  Layers,
  CreditCard,
  FileText,
  Users,
  Box,
  Percent,
  Calendar,
  Sparkles,
  ShieldCheck,
  Settings,
  CheckSquare,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Zap,
  Menu,
  X,
  MessageSquare
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext.tsx';
import { CommandPalette } from '../common/CommandPalette.tsx';

interface ShellProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ currentView, onNavigate, children }) => {
  const { currentUser, isAdmin, isStaff, isCustomer, switchDemoRole, logout } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDark, setThemeDark] = useState(false);

  // Mobile menu keyboard toggle
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Support Ctrl+B to toggle mobile menu or collapse on compact screens
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setMobileMenuOpen(prev => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, []);

  const toggleTheme = () => {
    setThemeDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const navItems = isCustomer
    ? [
        { id: 'portal', label: 'My Subscriptions', icon: Layers, section: 'Self-Service' },
        { id: 'portal-products', label: 'My Products', icon: Box, section: 'Self-Service' },
        { id: 'portal-invoices', label: 'My Invoices & GST', icon: FileText, section: 'Self-Service' },
        { id: 'portal-history', label: 'My Payments & Receipts', icon: CreditCard, section: 'Self-Service' },
        { id: 'portal-discounts', label: 'Available Discounts', icon: Percent, section: 'Self-Service' },
        { id: 'portal-profile', label: 'My Profile & GSTIN', icon: Users, section: 'Self-Service' },
        { id: 'portal-support', label: 'Help & Support', icon: Sparkles, section: 'Self-Service' },
      ]
    : currentUser?.role === 'staff'
    ? [
        // Staff Dashboard Features (Strictly operational & read-only access)
        { id: 'tasks', label: 'My Assigned Tasks', icon: CheckSquare, section: 'Operations' },
        { id: 'sms', label: 'SMS Gateway', icon: MessageSquare, section: 'Operations' },
        { id: 'products', label: 'Products (Read-Only)', icon: Box, section: 'Catalog' },
        { id: 'subscriptions', label: 'Subscriptions (Read-Only)', icon: Layers, section: 'Catalog' },
        { id: 'customers', label: 'Customers (Read-Only)', icon: Users, section: 'Catalog' },
        { id: 'quotations', label: 'Quotations (Read-Only)', icon: FileText, section: 'Catalog' },
        { id: 'calendar', label: 'Operational Calendar', icon: Calendar, section: 'Operations' },
      ]
    : [
        // Operations
        { id: 'pulse', label: 'Revenue Pulse', icon: Activity, section: 'Finance' },
        { id: 'subscriptions', label: 'Subscriptions', icon: Layers, section: 'Finance' },
        { id: 'billing', label: 'Billing Console', icon: Zap, section: 'Finance' },
        { id: 'invoices', label: 'Invoices & GST', icon: FileText, section: 'Finance' },
        { id: 'payments', label: 'Payments', icon: CreditCard, section: 'Finance' },
        { id: 'reconciliation', label: 'Reconciliation', icon: ShieldCheck, section: 'Finance' },
        { id: 'collections', label: 'Gentle Chase', icon: Users, section: 'Finance' },
        { id: 'sms', label: 'SMS Gateway', icon: MessageSquare, section: 'Finance' },

        // Sales & Catalog
        { id: 'quotations', label: 'Quotations', icon: FileText, section: 'Catalog' },
        { id: 'products', label: 'Products & Variants', icon: Box, section: 'Catalog' },
        { id: 'plans', label: 'Subscription Plans', icon: Layers, section: 'Catalog' },
        { id: 'customers', label: 'Customers Database', icon: Users, section: 'Catalog' },

        // Intelligence & Control
        { id: 'intelligence', label: 'AI Intelligence', icon: Sparkles, section: 'Control' },
        { id: 'calendar', label: 'Billing Calendar', icon: Calendar, section: 'Control' },
        { id: 'tasks', label: 'Staff Tasks', icon: CheckSquare, section: 'Control' },
        { id: 'approvals', label: 'Approvals Inbox', icon: ShieldCheck, section: 'Control' },
        { id: 'rules', label: 'Taxes & Discounts', icon: Percent, section: 'Control' },
        { id: 'audit', label: 'Security & Health', icon: ShieldCheck, section: 'Control' },
        { id: 'settings', label: 'Platform Settings', icon: Settings, section: 'Control' },
      ];

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#090D16] text-slate-800 dark:text-slate-100 antialiased font-sans">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shrink-0">
        
        {/* Brand Lockup (Top Bar Contract Zone 1: Single line wordmark) */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-xl bg-[#0F172A] border border-[#EAB308]/40 flex items-center justify-center text-[#EAB308] font-black text-sm shadow-sm ring-2 ring-[#EAB308]/20 group">
              <span className="drop-shadow-[0_0_6px_rgba(234,179,8,0.8)]">P</span>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#EAB308] ring-2 ring-white dark:ring-slate-900 animate-pulse shadow-[0_0_6px_rgba(234,179,8,0.8)]" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-slate-900 dark:text-white text-base">
                Brightloop Pulse
              </span>
              <span className="block text-[10px] text-[#EAB308] font-mono leading-none font-semibold">
                Recurring Ops Suite
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Modules */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {['Finance', 'Catalog', 'Operations', 'Control', 'Self-Service'].map(sec => {
            const sectionItems = navItems.filter(i => i.section === sec);
            if (sectionItems.length === 0) return null;

            return (
              <div key={sec} className="space-y-1">
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                  {sec}
                </span>
                {sectionItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id || (item.id === 'portal' && currentView.startsWith('portal')) || (item.id === 'sms' && currentView.startsWith('sms'));

                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer group ${
                        isActive
                          ? 'text-white font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeNavPill"
                          className="absolute inset-0 bg-[#0F172A] border border-[#EAB308]/40 dark:bg-slate-800 rounded-xl shadow-xs"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                      <Icon
                        className={`relative z-10 w-4 h-4 shrink-0 transition-all duration-200 ${
                          isActive
                            ? 'text-[#EAB308] drop-shadow-[0_0_8px_rgba(234,179,8,0.85)]'
                            : 'text-slate-400 group-hover:text-[#EAB308] group-hover:drop-shadow-[0_0_6px_rgba(234,179,8,0.6)]'
                        }`}
                      />
                      <span className="relative z-10 truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* User Identity Footer */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#0F172A] border border-[#EAB308]/30 text-[#EAB308] font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              <span className="drop-shadow-[0_0_4px_rgba(234,179,8,0.6)]">{currentUser?.fullName?.charAt(0) || 'U'}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {currentUser?.fullName}
              </p>
              <span className={`inline-block text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                currentUser?.role === 'admin'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                  : currentUser?.role === 'staff'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}>
                {currentUser?.role === 'customer' ? 'Client' : currentUser?.role}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer group"
            title="Log Out"
          >
            <LogOut className="w-4 h-4 group-hover:drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-xs px-6 flex items-center justify-between sticky top-0 z-30">
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Breadcrumb Trail */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Brightloop</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-slate-900 dark:text-slate-100 font-semibold capitalize">
                {currentView.replace('-', ' ')}
              </span>
            </div>
          </div>

          {/* Right Zone: Status Indicator, Search Bar Button, Theme Toggle, Profile */}
          <div className="flex items-center gap-3">
            
            {/* Live Ops Engine Status Badge */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0F172A] border border-[#EAB308]/40 text-[11px] text-[#EAB308] font-mono shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EAB308] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EAB308] shadow-[0_0_6px_rgba(234,179,8,0.8)]" />
              </span>
              <span className="font-semibold drop-shadow-[0_0_4px_rgba(234,179,8,0.5)]">Ops Active</span>
              <span className="text-[#EAB308]/60">·</span>
              <span className="text-slate-300 font-sans">Zero Leakage</span>
            </div>
            
            {/* Search Bar Button (Ctrl+K shortcut completely removed) */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-[#EAB308]/60 transition-all cursor-pointer shadow-xs"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#EAB308] group-hover:drop-shadow-[0_0_6px_rgba(234,179,8,0.7)] transition-all" />
              <span className="hidden sm:inline font-medium">Search & Actions...</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#EAB308] transition-colors cursor-pointer group"
              title="Toggle Light / Dark mode"
            >
              {themeDark ? (
                <Sun className="w-4 h-4 text-[#EAB308] drop-shadow-[0_0_6px_rgba(234,179,8,0.8)]" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 group-hover:text-[#EAB308] group-hover:drop-shadow-[0_0_6px_rgba(234,179,8,0.6)]" />
              )}
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-800 text-xs">
              <div className="w-7 h-7 rounded-full bg-[#0F172A] border border-[#EAB308]/40 text-[#EAB308] font-bold flex items-center justify-center text-xs shadow-xs">
                <span className="drop-shadow-[0_0_4px_rgba(234,179,8,0.6)]">{currentUser?.fullName.charAt(0) || 'U'}</span>
              </div>
              <div className="hidden sm:block text-left">
                <div className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                  {currentUser?.fullName}
                </div>
                <div className="text-[10px] text-slate-400 font-mono leading-none">
                  {currentUser?.email}
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer ml-1 group"
                title="Log Out of Brightloop"
              >
                <LogOut className="w-4 h-4 group-hover:drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 space-y-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  currentView === item.id ? 'bg-[#0F172A] text-white border border-[#EAB308]/40' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <item.icon className={`w-4 h-4 ${currentView === item.id ? 'text-[#EAB308] drop-shadow-[0_0_6px_rgba(234,179,8,0.7)]' : ''}`} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Main Workspace Body */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-[#090D16]">
          {children}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
};
