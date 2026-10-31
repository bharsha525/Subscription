/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'staff' | 'customer';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  customerId?: string; // Linked for customers
  staffId?: string;    // Linked for staff
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
  failedLoginAttempts: number;
  isLocked: boolean;
  twoFactorEnabled?: boolean;
  updatedAt?: string;
}

export type ProductType = 'Software' | 'Service' | 'Add-on' | 'Physical';

export interface ProductVariant {
  id: string;
  sku: string;
  attributeName: string; // e.g. "Tier", "Brand", "Storage"
  attributeValue: string; // e.g. "Enterprise", "Odoo", "1TB"
  additionalPricePaise: number; // in paise
}

export interface Product {
  id: string;
  name: string;
  code: string;
  type: ProductType;
  salesPricePaise: number; // base price in paise
  costPricePaise: number;  // cost price in paise
  description: string;
  internalNotes?: string;
  currency: string;
  status: 'active' | 'archived';
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export type BillingFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface PlanBehavior {
  autoCloseAtEndDate: boolean;
  allowEarlyClosure: boolean;
  allowPause: boolean;
  allowRenewal: boolean;
}

export interface PlanVersion {
  versionNumber: number;
  effectiveDate: string;
  pricePaise: number;
  taxRuleId: string;
  changeSummary: string;
  createdBy: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  productId: string;
  description: string;
  pricePaise: number; // current price in paise
  billingFrequency: BillingFrequency;
  minimumQuantity: number;
  availabilityStartDate: string;
  availabilityEndDate?: string;
  taxRuleId: string;
  status: 'active' | 'inactive';
  behavior: PlanBehavior;
  versions: PlanVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Customer {
  id: string;
  customerNumber: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  billingAddress: Address;
  taxId?: string; // GSTIN e.g. 29ABCDE1234F1Z5
  status: 'active' | 'inactive' | 'prospect';
  assignedStaffId?: string;
  outstandingBalancePaise: number;
  totalPaidPaise: number;
  createdAt: string;
  updatedAt: string;
}

export interface StaffProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  department: 'Operations' | 'Finance' | 'Sales' | 'Customer Success' | 'Engineering';
  status: 'active' | 'inactive';
  assignedCustomerCount: number;
  createdAt: string;
}

export type QuotationStatus = 'Draft' | 'Sent' | 'Confirmed' | 'Expired' | 'Converted';

export interface QuotationLine {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantLabel?: string;
  basePricePaise: number;
  variantAdditionalPaise: number;
  unitPricePaise: number;
  quantity: number;
  discountPaise: number;
  taxRatePercent: number;
  taxAmountPaise: number;
  lineTotalPaise: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  templateId?: string;
  planId: string;
  planName: string;
  lines: QuotationLine[];
  subtotalPaise: number;
  discountCode?: string;
  discountAmountPaise: number;
  taxAmountPaise: number;
  totalPaise: number;
  paymentTerms: string;
  validUntil: string;
  notes?: string;
  status: QuotationStatus;
  convertedSubscriptionId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationTemplate {
  id: string;
  name: string;
  description: string;
  defaultPlanId: string;
  defaultLines: {
    productId: string;
    variantId?: string;
    quantity: number;
  }[];
  paymentTerms: string;
  validityDays: number;
  defaultDiscountCode?: string;
  createdAt: string;
}

export type SubscriptionStatus = 'Draft' | 'Quotation' | 'Confirmed' | 'Active' | 'Paused' | 'Closed';

export interface SubscriptionLine {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantLabel?: string;
  unitPricePaise: number;
  quantity: number;
  taxRatePercent: number;
  discountPaise: number;
  lineTotalPaise: number;
}

export interface SubscriptionEvent {
  id: string;
  timestamp: string;
  fromStatus: SubscriptionStatus;
  toStatus: SubscriptionStatus;
  actor: string;
  reason?: string;
}

export interface Subscription {
  id: string;
  subscriptionNumber: string;
  customerId: string;
  customerName: string;
  planId: string;
  planName: string;
  billingFrequency: BillingFrequency;
  startDate: string;
  expiryDate?: string;
  nextBillingDate: string;
  paymentTerms: string;
  lines: SubscriptionLine[];
  subtotalPaise: number;
  discountCode?: string;
  discountAmountPaise: number;
  taxAmountPaise: number;
  totalPaise: number;
  autoRenew: boolean;
  status: SubscriptionStatus;
  statusHistory: SubscriptionEvent[];
  assignedStaffId?: string;
  createdAt: string;
  updatedAt: string;
  pausedAt?: string;
  closedAt?: string;
  closureReason?: string;
}

export type InvoiceStatus = 'Draft' | 'Confirmed' | 'Paid' | 'Partially Paid' | 'Overdue' | 'Cancelled';

export interface InvoiceTaxDetail {
  name: string;
  ratePercent: number;
  taxAmountPaise: number;
}

export interface InvoiceLine {
  id: string;
  productName: string;
  variantLabel?: string;
  unitPricePaise: number;
  quantity: number;
  subtotalPaise: number;
  discountPaise: number;
  taxRatePercent: number;
  taxAmountPaise: number;
  totalPaise: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  billingAddress: Address;
  subscriptionId?: string;
  subscriptionNumber?: string;
  billingPeriod: string; // e.g. "2026-10", "2026-W44", "2026-10-31"
  issueDate: string;
  dueDate: string;
  lines: InvoiceLine[];
  subtotalPaise: number;
  discountCode?: string;
  discountAmountPaise: number;
  taxes: InvoiceTaxDetail[];
  taxAmountPaise: number;
  totalPaise: number;
  amountPaidPaise: number;
  outstandingBalancePaise: number;
  paymentTerms: string;
  notes?: string;
  status: InvoiceStatus;
  billingRunId?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  amountPaise: number;
  reason: string;
  issuedBy: string;
  createdAt: string;
}

export interface TaxRule {
  id: string;
  name: string; // e.g. "GST 18%", "CGST 9% + SGST 9%"
  code: string;
  ratePercent: number;
  isInclusive: boolean;
  applicability: 'global' | 'product_type' | 'specific_product';
  targetProductType?: ProductType;
  targetProductId?: string;
  status: 'active' | 'inactive';
  effectiveFrom: string;
  effectiveTo?: string;
  components?: { name: string; ratePercent: number }[];
}

export interface DiscountRule {
  id: string;
  name: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number; // percentage (e.g. 15) or fixed paise (e.g. 50000 = ₹500)
  minPurchaseAmountPaise?: number;
  minQuantity?: number;
  startDate: string;
  endDate?: string;
  usageLimit?: number;
  timesUsed: number;
  applicableProductIds?: string[];
  status: 'Scheduled' | 'Active' | 'Expired' | 'Exhausted';
}

export type PaymentMethod = 'UPI' | 'Card' | 'Bank Transfer' | 'Cash' | 'Cheque' | 'Other';

export interface PaymentAllocation {
  invoiceId: string;
  invoiceNumber: string;
  amountPaise: number;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  paymentMethod: PaymentMethod;
  amountPaise: number;
  allocatedPaise: number;
  unappliedCreditPaise: number;
  paymentDate: string;
  transactionReference: string;
  notes?: string;
  recordedBy: string;
  status: 'Success' | 'Pending' | 'Failed' | 'Refunded' | 'Reversed';
  allocations: PaymentAllocation[];
  createdAt: string;
}

export interface BankStatementRow {
  id: string;
  date: string;
  description: string;
  reference: string;
  amountPaise: number;
  type: 'credit' | 'debit';
  matchStatus: 'Matched' | 'Needs Review' | 'Unmatched';
  matchedInvoiceId?: string;
  matchedCustomerName?: string;
  confidencePercent?: number;
  approved: boolean;
}

export interface BillingRun {
  id: string;
  runReference: string; // e.g. "RUN-20261031-1024"
  executionDate: string;
  targetPeriod: string;
  invoicesCreated: number;
  subscriptionsSkipped: number;
  duplicatesPrevented: number;
  totalInvoicedPaise: number;
  durationMs: number;
  status: 'completed' | 'voided' | 'failed';
  skippedDetails: { subscriptionNumber: string; customerName: string; reason: string }[];
  invoiceIds: string[];
  executedBy: string;
}

export type TaskStatus =
  | 'Assigned'
  | 'In Progress'
  | 'Submitted for Review'
  | 'Admin Review'
  | 'Feedback Provided'
  | 'Approved'
  | 'Completed'
  | 'Pending';

export interface TaskReviewEntry {
  phase: string;
  notes: string;
  by: string;
  at: string;
  action: 'submit' | 'feedback' | 'approve';
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedStaffId: string;
  assignedStaffName: string;
  customerId?: string;
  customerName?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: TaskStatus;
  dueDate: string;
  type: 'invoice_followup' | 'renewal_outreach' | 'quote_review' | 'general';
  createdAt: string;
  completedAt?: string;
  submissionNotes?: string;
  submissionDate?: string;
  adminFeedback?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewHistory?: TaskReviewEntry[];
}

export interface ApprovalRequest {
  id: string;
  requestType: 'high_value_discount' | 'invoice_cancellation' | 'large_refund' | 'exceptional_pricing' | 'payment_reversal';
  entityId: string;
  entityReference: string;
  requestedBy: string;
  requestedByName: string;
  approverId?: string;
  approverName?: string;
  amountPaise?: number;
  justification: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  decisionNotes?: string;
  createdAt: string;
  decidedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: UserRole;
  action: string;
  module: string;
  recordId?: string;
  details: string;
  ipAddress?: string;
}

export interface SystemHealthIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  component: 'Billing Engine' | 'Reconciliation' | 'Scheduler' | 'Database' | 'Integrations';
  description: string;
  detectedAt: string;
  resolved: boolean;
  resolutionAction?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: 'invoice_overdue' | 'subscription_expiring_soon' | 'payment_failed' | 'high_value_quote_created';
  conditions: string;
  action: 'send_email' | 'create_staff_task' | 'in_app_notification' | 'request_approval';
  enabled: boolean;
  lastFiredAt?: string;
  executionsCount: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface CompanySettings {
  companyName: string;
  brandTagline: string;
  taxId: string;
  email: string;
  phone: string;
  address: Address;
  currency: string;
  currencySymbol: string;
  invoicePrefix: string;
  subscriptionPrefix: string;
  defaultPaymentTerms: string;
  autoCloseSubscriptions: boolean;
  pauseAllBillingSafetySwitch: boolean;
  schedulerEnabled: boolean;
  timezone: string;
  fiscalYearStartMonth: number;
}

export type SmsStatus = 'Delivered' | 'Sent' | 'Pending' | 'Failed';

export interface SmsLog {
  id: string;
  messageId: string;
  to: string;
  customerName: string;
  customerId?: string;
  message: string;
  provider: 'sandbox' | 'twilio' | 'gupshup' | 'fast2sms';
  status: SmsStatus;
  sentAt: string;
  deliveredAt?: string;
  costPaise: number;
  segmentCount: number;
  characterCount: number;
  referenceType?: 'invoice' | 'payment_reminder' | 'renewal' | 'welcome' | 'custom';
  referenceId?: string;
  dltTemplateId?: string;
  errorMessage?: string;
}

export interface SmsProviderConfig {
  provider: 'sandbox' | 'twilio' | 'gupshup' | 'fast2sms';
  isSandbox: boolean;
  senderId: string;
  accountSid?: string;
  authToken?: string;
  apiKey?: string;
  dltEntityId?: string;
  balanceCredits: number;
  webhookUrl?: string;
  lastTestedAt?: string;
}

export interface SmsTemplate {
  id: string;
  title: string;
  category: 'payment' | 'invoice' | 'renewal' | 'general';
  dltTemplateId: string;
  template: string;
}

