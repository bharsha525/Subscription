/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Shell } from './components/layout/Shell.tsx';

// Views
import { RevenuePulseView } from './views/RevenuePulseView.tsx';
import { SubscriptionsView } from './views/SubscriptionsView.tsx';
import { BillingConsoleView } from './views/BillingConsoleView.tsx';
import { InvoicesView } from './views/InvoicesView.tsx';
import { PaymentsView } from './views/PaymentsView.tsx';
import { ReconciliationView } from './views/ReconciliationView.tsx';
import { GentleChaseView } from './views/GentleChaseView.tsx';
import { QuotationsView } from './views/QuotationsView.tsx';
import { ProductsView } from './views/ProductsView.tsx';
import { PlansView } from './views/PlansView.tsx';
import { CustomersView } from './views/CustomersView.tsx';
import { CustomerPortalView } from './views/CustomerPortalView.tsx';
import { IntelligenceView } from './views/IntelligenceView.tsx';
import { SmartCalendarView } from './views/SmartCalendarView.tsx';
import { StaffTasksView } from './views/StaffTasksView.tsx';
import { ApprovalsView } from './views/ApprovalsView.tsx';
import { RulesView } from './views/RulesView.tsx';
import { AuditHealthView } from './views/AuditHealthView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { SmsGatewayView } from './views/SmsGatewayView.tsx';
import { LoginPage } from './components/auth/LoginPage.tsx';

function AppContent() {
  const { currentUser, isCustomer, isStaff, isAdmin, loading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('pulse');
  const [smsPrefill, setSmsPrefill] = useState<{
    phone?: string;
    customerName?: string;
    customerId?: string;
    message?: string;
  } | null>(null);

  const handleNavigate = (view: string, params?: any) => {
    if (params) {
      setSmsPrefill(params);
      try {
        sessionStorage.setItem('sms_prefill', JSON.stringify(params));
      } catch (e) {}
    }
    setCurrentView(view);
  };

  // Synchronize default landing view based on user role
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'customer') {
        setCurrentView('portal');
      } else if (currentUser.role === 'staff') {
        setCurrentView('tasks');
      } else {
        setCurrentView('pulse');
      }
    }
  }, [currentUser?.role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0F172A]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0F172A] border border-[#EAB308]/40 flex items-center justify-center text-[#EAB308] font-extrabold text-base shadow-xl animate-pulse">
            <span className="drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">P</span>
          </div>
          <span className="text-xs font-mono text-slate-800 dark:text-[#EAB308] font-bold tracking-wider">
            INITIALIZING BRIGHTLOOP PULSE...
          </span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'pulse':
        return <RevenuePulseView onNavigate={handleNavigate} />;
      case 'subscriptions':
        return <SubscriptionsView onNavigate={handleNavigate} />;
      case 'billing':
        return <BillingConsoleView onNavigate={handleNavigate} />;
      case 'invoices':
        return <InvoicesView onNavigate={handleNavigate} />;
      case 'payments':
        return <PaymentsView onNavigate={handleNavigate} />;
      case 'reconciliation':
        return <ReconciliationView onNavigate={handleNavigate} />;
      case 'collections':
        return <GentleChaseView onNavigate={handleNavigate} />;
      case 'sms':
      case 'sms-gateway':
        return <SmsGatewayView onNavigate={handleNavigate} prefill={smsPrefill} />;
      case 'quotations':
        return <QuotationsView onNavigate={handleNavigate} />;
      case 'products':
        return <ProductsView onNavigate={handleNavigate} />;
      case 'plans':
        return <PlansView onNavigate={handleNavigate} />;
      case 'customers':
        return <CustomersView onNavigate={handleNavigate} />;
      case 'portal':
      case 'portal-products':
      case 'portal-invoices':
      case 'portal-history':
      case 'portal-discounts':
      case 'portal-profile':
      case 'portal-support':
        return <CustomerPortalView currentView={currentView} onNavigate={handleNavigate} />;
      case 'intelligence':
        return <IntelligenceView onNavigate={handleNavigate} />;
      case 'calendar':
        return <SmartCalendarView onNavigate={handleNavigate} />;
      case 'tasks':
        return <StaffTasksView onNavigate={handleNavigate} />;
      case 'approvals':
        return <ApprovalsView onNavigate={handleNavigate} />;
      case 'rules':
        return <RulesView onNavigate={handleNavigate} />;
      case 'audit':
      case 'health':
        return <AuditHealthView onNavigate={handleNavigate} />;
      case 'settings':
        return <SettingsView onNavigate={handleNavigate} />;
      default:
        return isCustomer ? <CustomerPortalView currentView={currentView} onNavigate={handleNavigate} /> : <RevenuePulseView onNavigate={handleNavigate} />;
    }
  };

  return (
    <Shell currentView={currentView} onNavigate={handleNavigate}>
      {renderView()}
    </Shell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
