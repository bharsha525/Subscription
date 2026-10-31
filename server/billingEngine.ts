/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './db.ts';
import { Invoice, BillingRun, Subscription } from '../src/types/index.ts';

/**
 * Calculates next billing date given current billing date and frequency
 */
export function calculateNextBillingDate(currentDateStr: string, frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
  const date = new Date(currentDateStr);
  if (isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  switch (frequency) {
    case 'daily':
      date.setDate(day + 1);
      break;
    case 'weekly':
      date.setDate(day + 7);
      break;
    case 'monthly': {
      // Handle month end roll-over safely
      const targetMonth = month + 1;
      const targetYear = year + Math.floor(targetMonth / 12);
      const normalizedMonth = targetMonth % 12;
      const daysInTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
      const safeDay = Math.min(day, daysInTargetMonth);
      return new Date(Date.UTC(targetYear, normalizedMonth, safeDay)).toISOString().split('T')[0];
    }
    case 'yearly': {
      // Leap year check for Feb 29
      const targetYear = year + 1;
      let safeDay = day;
      if (month === 1 && day === 29) {
        // Not leap year -> Feb 28
        const isLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || (targetYear % 400 === 0);
        if (!isLeap) safeDay = 28;
      }
      return new Date(Date.UTC(targetYear, month, safeDay)).toISOString().split('T')[0];
    }
  }

  return date.toISOString().split('T')[0];
}

/**
 * Derives current billing period string based on frequency and date
 */
export function deriveBillingPeriod(dateStr: string, frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');

  switch (frequency) {
    case 'daily':
      return `${year}-${month}-${day}`;
    case 'weekly': {
      // Calculate ISO week
      const target = new Date(d.valueOf());
      const dayNr = (d.getDay() + 6) % 7;
      target.setDate(target.getDate() - dayNr + 3);
      const firstThursday = target.valueOf();
      target.setMonth(0, 1);
      if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
      }
      const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
      return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
    }
    case 'monthly':
      return `${year}-${month}`;
    case 'yearly':
      return `${year}`;
  }
}

export interface DryRunResult {
  targetPeriod: string;
  eligibleCount: number;
  skippedCount: number;
  duplicateCount: number;
  totalEstimatedInvoicedPaise: number;
  eligibleSubscriptions: {
    id: string;
    subscriptionNumber: string;
    customerName: string;
    planName: string;
    amountPaise: number;
    billingPeriod: string;
  }[];
  skippedSubscriptions: {
    id: string;
    subscriptionNumber: string;
    customerName: string;
    reason: string;
  }[];
  duplicates: {
    subscriptionNumber: string;
    customerName: string;
    existingInvoiceNumber: string;
    billingPeriod: string;
  }[];
}

/**
 * Preview dry-run for recurring billing (Never Twice, Never Missed)
 */
export function previewBillingRun(targetDateStr?: string): DryRunResult {
  const data = db.getData();
  const targetDate = targetDateStr || new Date().toISOString().split('T')[0];

  const eligibleSubscriptions: any[] = [];
  const skippedSubscriptions: any[] = [];
  const duplicates: any[] = [];
  let totalEstimatedInvoicedPaise = 0;

  for (const sub of data.subscriptions) {
    const customer = data.customers.find(c => c.id === sub.customerId);
    const customerName = customer ? customer.companyName : sub.customerName;

    // 1. Status check
    if (sub.status === 'Paused') {
      skippedSubscriptions.push({
        id: sub.id,
        subscriptionNumber: sub.subscriptionNumber,
        customerName,
        reason: 'Subscription is currently Paused (billing suspended)',
      });
      continue;
    }

    if (sub.status === 'Closed') {
      skippedSubscriptions.push({
        id: sub.id,
        subscriptionNumber: sub.subscriptionNumber,
        customerName,
        reason: 'Subscription has been Closed',
      });
      continue;
    }

    if (sub.status !== 'Active') {
      skippedSubscriptions.push({
        id: sub.id,
        subscriptionNumber: sub.subscriptionNumber,
        customerName,
        reason: `Subscription is in ${sub.status} state, not Active`,
      });
      continue;
    }

    // 2. Billing period
    const billingPeriod = deriveBillingPeriod(sub.nextBillingDate, sub.billingFrequency);

    // 3. Unique check (subscriptionId, billingPeriod) to prevent duplicates
    const existing = data.invoices.find(
      inv => inv.subscriptionId === sub.id && inv.billingPeriod === billingPeriod && inv.status !== 'Cancelled'
    );

    if (existing) {
      duplicates.push({
        subscriptionNumber: sub.subscriptionNumber,
        customerName,
        existingInvoiceNumber: existing.invoiceNumber,
        billingPeriod,
      });
      continue;
    }

    // Eligible
    eligibleSubscriptions.push({
      id: sub.id,
      subscriptionNumber: sub.subscriptionNumber,
      customerName,
      planName: sub.planName,
      amountPaise: sub.totalPaise,
      billingPeriod,
    });
    totalEstimatedInvoicedPaise += sub.totalPaise;
  }

  return {
    targetPeriod: deriveBillingPeriod(targetDate, 'monthly'),
    eligibleCount: eligibleSubscriptions.length,
    skippedCount: skippedSubscriptions.length,
    duplicateCount: duplicates.length,
    totalEstimatedInvoicedPaise,
    eligibleSubscriptions,
    skippedSubscriptions,
    duplicates,
  };
}

/**
 * Executes authoritative billing run
 */
export function executeBillingRun(actorName: string, targetDateStr?: string): {
  run: BillingRun;
  createdInvoices: Invoice[];
} {
  const data = db.getData();
  const startTime = Date.now();
  const targetDate = targetDateStr || new Date().toISOString().split('T')[0];

  const dryRun = previewBillingRun(targetDate);
  const createdInvoices: Invoice[] = [];
  const runId = `run_${Date.now()}`;
  const runRef = `RUN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  for (const eligible of dryRun.eligibleSubscriptions) {
    const sub = data.subscriptions.find(s => s.id === eligible.id);
    if (!sub) continue;

    const customer = data.customers.find(c => c.id === sub.customerId);
    const customerAddress = customer?.billingAddress || {
      line1: 'Corporate Park',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
    };

    // Calculate due date (Net 30 or paymentTerms)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoiceSeq = (data.invoices.length + createdInvoices.length + 1).toString().padStart(6, '0');
    const invoiceNumber = `INV-2026-${invoiceSeq}`;

    // Create immutable line snapshots
    const invoiceLines = sub.lines.map(line => ({
      id: `iline_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productName: line.productName,
      variantLabel: line.variantLabel,
      unitPricePaise: line.unitPricePaise,
      quantity: line.quantity,
      subtotalPaise: line.unitPricePaise * line.quantity,
      discountPaise: line.discountPaise || 0,
      taxRatePercent: line.taxRatePercent || 18,
      taxAmountPaise: Math.round(((line.unitPricePaise * line.quantity - (line.discountPaise || 0)) * (line.taxRatePercent || 18)) / 100),
      totalPaise: line.lineTotalPaise,
    }));

    const newInvoice: Invoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      invoiceNumber,
      customerId: sub.customerId,
      customerName: customer ? customer.companyName : sub.customerName,
      customerEmail: customer?.email || 'accounts@client.in',
      billingAddress: customerAddress,
      subscriptionId: sub.id,
      subscriptionNumber: sub.subscriptionNumber,
      billingPeriod: eligible.billingPeriod,
      issueDate: targetDate,
      dueDate: dueDate.toISOString().split('T')[0],
      lines: invoiceLines,
      subtotalPaise: sub.subtotalPaise,
      discountCode: sub.discountCode,
      discountAmountPaise: sub.discountAmountPaise,
      taxes: [
        { name: 'CGST 9%', ratePercent: 9, taxAmountPaise: Math.round(sub.taxAmountPaise / 2) },
        { name: 'SGST 9%', ratePercent: 9, taxAmountPaise: Math.round(sub.taxAmountPaise / 2) }
      ],
      taxAmountPaise: sub.taxAmountPaise,
      totalPaise: sub.totalPaise,
      amountPaidPaise: 0,
      outstandingBalancePaise: sub.totalPaise,
      paymentTerms: sub.paymentTerms || 'Net 30 Days',
      status: 'Confirmed',
      billingRunId: runId,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    createdInvoices.push(newInvoice);
    data.invoices.unshift(newInvoice);

    // Update customer outstanding balance
    if (customer) {
      customer.outstandingBalancePaise += newInvoice.totalPaise;
    }

    // Advance next billing date only after successful creation
    sub.nextBillingDate = calculateNextBillingDate(sub.nextBillingDate, sub.billingFrequency);
    sub.updatedAt = new Date().toISOString();
  }

  const durationMs = Date.now() - startTime;

  const run: BillingRun = {
    id: runId,
    runReference: runRef,
    executionDate: new Date().toISOString(),
    targetPeriod: dryRun.targetPeriod,
    invoicesCreated: createdInvoices.length,
    subscriptionsSkipped: dryRun.skippedSubscriptions.length,
    duplicatesPrevented: dryRun.duplicateCount,
    totalInvoicedPaise: createdInvoices.reduce((sum, inv) => sum + inv.totalPaise, 0),
    durationMs,
    status: 'completed',
    skippedDetails: dryRun.skippedSubscriptions.map(s => ({
      subscriptionNumber: s.subscriptionNumber,
      customerName: s.customerName,
      reason: s.reason,
    })),
    invoiceIds: createdInvoices.map(i => i.id),
    executedBy: actorName,
  };

  data.billingRuns.unshift(run);

  // Log in audit log
  db.logAudit(
    actorName,
    'admin',
    'BILLING_RUN_EXECUTED',
    'Billing Engine',
    `Executed ${runRef}: Created ${run.invoicesCreated} invoices, skipped ${run.subscriptionsSkipped}, 0 duplicates.`,
    runId
  );

  db.persist();

  return { run, createdInvoices };
}

/**
 * Void a billing run - Cancels ONLY Draft invoices generated by this run.
 * Confirmed and Paid invoices are protected according to Section 10!
 */
export function voidBillingRun(runId: string, actorName: string, reason: string): {
  success: boolean;
  cancelledInvoicesCount: number;
  protectedInvoicesCount: number;
} {
  const data = db.getData();
  const run = data.billingRuns.find(r => r.id === runId);
  if (!run) {
    throw new Error('Billing run not found');
  }

  let cancelledInvoicesCount = 0;
  let protectedInvoicesCount = 0;

  for (const invId of run.invoiceIds) {
    const inv = data.invoices.find(i => i.id === invId);
    if (!inv) continue;

    if (inv.status === 'Draft') {
      inv.status = 'Cancelled';
      inv.cancelledAt = new Date().toISOString();
      inv.cancelReason = `Voided run ${run.runReference}: ${reason}`;
      cancelledInvoicesCount++;
    } else {
      // Confirmed or Paid: Protected
      protectedInvoicesCount++;
    }
  }

  run.status = 'voided';

  db.logAudit(
    actorName,
    'admin',
    'BILLING_RUN_VOIDED',
    'Billing Engine',
    `Voided run ${run.runReference}: ${cancelledInvoicesCount} draft invoices cancelled. ${protectedInvoicesCount} confirmed/paid invoices protected. Reason: ${reason}`,
    runId
  );

  db.persist();

  return {
    success: true,
    cancelledInvoicesCount,
    protectedInvoicesCount,
  };
}
