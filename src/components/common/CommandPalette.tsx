/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Activity,
  CreditCard,
  FileText,
  Users,
  Box,
  Layers,
  Sparkles,
  Calendar,
  CheckSquare,
  ShieldCheck,
  Settings,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { isCustomer } = useAuth();

  const actions = isCustomer
    ? [
        { label: 'My Subscriptions', view: 'portal', icon: Layers, cat: 'Self-Service' },
        { label: 'My Products & Catalog', view: 'portal-products', icon: Box, cat: 'Self-Service' },
        { label: 'My Invoices & GST Bills', view: 'portal-invoices', icon: FileText, cat: 'Self-Service' },
        { label: 'My Payments & Receipts', view: 'portal-history', icon: CreditCard, cat: 'Self-Service' },
        { label: 'Available Discounts & Promos', view: 'portal-discounts', icon: Sparkles, cat: 'Self-Service' },
        { label: 'My Profile & GSTIN Settings', view: 'portal-profile', icon: Users, cat: 'Self-Service' },
        { label: 'Help & Operational Support', view: 'portal-support', icon: ShieldCheck, cat: 'Self-Service' },
      ]
    : [
        { label: 'Revenue Pulse Dashboard', view: 'pulse', icon: Activity, cat: 'Navigation' },
        { label: 'Subscription Lifecycle & Journey', view: 'subscriptions', icon: Layers, cat: 'Navigation' },
        { label: 'Automated Billing Console', view: 'billing', icon: CreditCard, cat: 'Operations' },
        { label: 'Invoices & PDF Generation', view: 'invoices', icon: FileText, cat: 'Operations' },
        { label: 'Record & Settle Payments', view: 'payments', icon: CreditCard, cat: 'Operations' },
        { label: 'Bank Statement Reconciliation', view: 'reconciliation', icon: FileText, cat: 'Operations' },
        { label: 'Renewals & Gentle Chase Collections', view: 'collections', icon: Users, cat: 'Operations' },
        { label: 'Quotations & Proposal Builder', view: 'quotations', icon: FileText, cat: 'Sales' },
        { label: 'Products & Variant Pricing', view: 'products', icon: Box, cat: 'Catalog' },
        { label: 'Subscription Plans & Versioning', view: 'plans', icon: Layers, cat: 'Catalog' },
        { label: 'Customers Database (CRM)', view: 'customers', icon: Users, cat: 'Catalog' },
        { label: 'AI Business Intelligence Assistant', view: 'intelligence', icon: Sparkles, cat: 'Intelligence' },
        { label: 'Smart Billing Calendar', view: 'calendar', icon: Calendar, cat: 'Intelligence' },
        { label: 'Staff Tasks & Follow-ups', view: 'tasks', icon: CheckSquare, cat: 'Intelligence' },
        { label: 'Approvals Inbox', view: 'approvals', icon: ShieldCheck, cat: 'Control' },
        { label: 'Tax & Discount Rules', view: 'rules', icon: Settings, cat: 'Control' },
        { label: 'Immutable Audit Log & Security', view: 'audit', icon: ShieldCheck, cat: 'Control' },
        { label: 'System Settings & Safety Switch', view: 'settings', icon: Settings, cat: 'Control' },
      ];

  const filtered = actions.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.cat.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onNavigate(filtered[selectedIndex].view);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNavigate, filtered, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <input
            type="text"
            placeholder="Type a command or jump to view... (e.g. billing, invoices, customers)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-slate-500">
              No matching commands or pages found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={idx}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    onNavigate(item.view);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs sm:text-sm transition-colors group cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 group-hover:text-teal-600'}`} />
                    <span className={`font-medium ${isSelected ? 'font-semibold' : ''}`}>{item.label}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                    {item.cat}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">↑↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">↵</kbd>
              <span>select</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">ESC</kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
