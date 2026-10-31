/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  User,
  Product,
  SubscriptionPlan,
  Customer,
  StaffProfile,
  QuotationTemplate,
  Quotation,
  Subscription,
  Invoice,
  TaxRule,
  DiscountRule,
  Payment,
  BankStatementRow,
  BillingRun,
  Task,
  ApprovalRequest,
  AuditLogEntry,
  SystemHealthIssue,
  AutomationRule,
  NotificationItem,
  CompanySettings,
  SmsLog,
  SmsProviderConfig
} from '../src/types/index.ts';

export function getInitialSeedData(): {
  users: User[];
  products: Product[];
  plans: SubscriptionPlan[];
  customers: Customer[];
  staffProfiles: StaffProfile[];
  quotationTemplates: QuotationTemplate[];
  quotations: Quotation[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  creditNotes: any[];
  taxRules: TaxRule[];
  discountRules: DiscountRule[];
  payments: Payment[];
  bankStatementRows: BankStatementRow[];
  billingRuns: BillingRun[];
  tasks: Task[];
  approvalRequests: ApprovalRequest[];
  auditLogs: AuditLogEntry[];
  healthIssues: SystemHealthIssue[];
  automationRules: AutomationRule[];
  notifications: NotificationItem[];
  companySettings: CompanySettings;
  smsLogs: SmsLog[];
  smsConfig: SmsProviderConfig;
} {
  const now = new Date('2026-10-31T09:00:00Z').toISOString();

  // 1. Users
  const users: User[] = [
    {
      id: 'usr_admin',
      email: 'admin@brightloop.io',
      fullName: 'Vikramaditya Sharma',
      role: 'admin',
      createdAt: '2026-01-15T08:00:00Z',
      lastLoginAt: now,
      failedLoginAttempts: 0,
      isLocked: false,
      twoFactorEnabled: true,
    },
    {
      id: 'usr_staff_sarah',
      email: 'sarah.ops@brightloop.io',
      fullName: 'Sarah Jenkins',
      role: 'staff',
      staffId: 'stf_01',
      createdAt: '2026-02-01T09:30:00Z',
      lastLoginAt: '2026-10-30T17:15:00Z',
      failedLoginAttempts: 0,
      isLocked: false,
    },
    {
      id: 'usr_staff_arjun',
      email: 'arjun.sales@brightloop.io',
      fullName: 'Arjun Nambiar',
      role: 'staff',
      staffId: 'stf_02',
      createdAt: '2026-02-10T10:00:00Z',
      lastLoginAt: '2026-10-30T14:20:00Z',
      failedLoginAttempts: 0,
      isLocked: false,
    },
    {
      id: 'usr_cust_priya',
      email: 'priya@acmetech.in',
      fullName: 'Priya Sundaram',
      role: 'customer',
      customerId: 'cust_01',
      createdAt: '2026-03-01T11:00:00Z',
      lastLoginAt: '2026-10-29T10:30:00Z',
      failedLoginAttempts: 0,
      isLocked: false,
    },
    {
      id: 'usr_cust_rohit',
      email: 'rohit@zenithcorp.co',
      fullName: 'Rohit Verma',
      role: 'customer',
      customerId: 'cust_02',
      createdAt: '2026-03-15T12:00:00Z',
      lastLoginAt: '2026-10-28T09:45:00Z',
      failedLoginAttempts: 0,
      isLocked: false,
    }
  ];

  // 2. Staff Profiles
  const staffProfiles: StaffProfile[] = [
    {
      id: 'stf_01',
      userId: 'usr_staff_sarah',
      fullName: 'Sarah Jenkins',
      email: 'sarah.ops@brightloop.io',
      department: 'Operations',
      status: 'active',
      assignedCustomerCount: 22,
      createdAt: '2026-02-01T09:30:00Z',
    },
    {
      id: 'stf_02',
      userId: 'usr_staff_arjun',
      fullName: 'Arjun Nambiar',
      email: 'arjun.sales@brightloop.io',
      department: 'Sales',
      status: 'active',
      assignedCustomerCount: 18,
      createdAt: '2026-02-10T10:00:00Z',
    }
  ];

  // 3. Tax Rules
  const taxRules: TaxRule[] = [
    {
      id: 'tax_gst_18',
      name: 'GST 18% (Standard Domestic)',
      code: 'GST-18',
      ratePercent: 18,
      isInclusive: false,
      applicability: 'global',
      status: 'active',
      effectiveFrom: '2025-01-01',
      components: [
        { name: 'CGST 9%', ratePercent: 9 },
        { name: 'SGST 9%', ratePercent: 9 }
      ]
    },
    {
      id: 'tax_igst_18',
      name: 'IGST 18% (Inter-State Domestic)',
      code: 'IGST-18',
      ratePercent: 18,
      isInclusive: false,
      applicability: 'global',
      status: 'active',
      effectiveFrom: '2025-01-01',
      components: [{ name: 'IGST 18%', ratePercent: 18 }]
    },
    {
      id: 'tax_export_0',
      name: 'Export / SEZ Zero Tax (0%)',
      code: 'EXP-00',
      ratePercent: 0,
      isInclusive: false,
      applicability: 'global',
      status: 'active',
      effectiveFrom: '2025-01-01'
    },
    {
      id: 'tax_physical_12',
      name: 'Physical Goods GST (12%)',
      code: 'GST-12',
      ratePercent: 12,
      isInclusive: false,
      applicability: 'product_type',
      targetProductType: 'Physical',
      status: 'active',
      effectiveFrom: '2025-01-01'
    }
  ];

  // 4. Products (12+ products as required)
  const products: Product[] = [
    {
      id: 'prod_erp',
      name: 'Brightloop Pulse ERP Suite',
      code: 'BL-ERP-01',
      type: 'Software',
      salesPricePaise: 4500000, // ₹45,000 / mo
      costPricePaise: 1200000,  // ₹12,000 / mo
      description: 'End-to-end subscription & resource orchestration engine for scale-ups.',
      currency: 'INR',
      status: 'active',
      variants: [
        { id: 'var_erp_std', sku: 'BL-ERP-STD', attributeName: 'Edition', attributeValue: 'Standard Cloud', additionalPricePaise: 0 },
        { id: 'var_erp_ent', sku: 'BL-ERP-ENT', attributeName: 'Edition', attributeValue: 'Enterprise Dedicated', additionalPricePaise: 2500000 },
        { id: 'var_erp_soc2', sku: 'BL-ERP-SOC2', attributeName: 'Edition', attributeValue: 'Fintech SOC-2 Air-Gapped', additionalPricePaise: 5000000 },
      ],
      createdAt: '2026-01-10T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      id: 'prod_pulse_bi',
      name: 'Pulse Business Intelligence Engine',
      code: 'BL-BI-02',
      type: 'Software',
      salesPricePaise: 2200000, // ₹22,000
      costPricePaise: 500000,
      description: 'Cohort churn analytics, cash flow forecasting and cohort telemetry.',
      currency: 'INR',
      status: 'active',
      variants: [
        { id: 'var_bi_base', sku: 'BL-BI-BASE', attributeName: 'Capacity', attributeValue: 'Up to 10k Records', additionalPricePaise: 0 },
        { id: 'var_bi_unlim', sku: 'BL-BI-UNL', attributeName: 'Capacity', attributeValue: 'Unlimited Analytics', additionalPricePaise: 1800000 },
      ],
      createdAt: '2026-01-15T00:00:00Z',
      updatedAt: '2026-08-10T00:00:00Z',
    },
    {
      id: 'prod_api_gw',
      name: 'High-Throughput API Gateway',
      code: 'BL-API-03',
      type: 'Software',
      salesPricePaise: 1500000, // ₹15,000
      costPricePaise: 350000,
      description: 'Global low-latency API proxy with rate-limiting, webhooks and idempotency keys.',
      currency: 'INR',
      status: 'active',
      variants: [
        { id: 'var_api_std', sku: 'BL-API-STD', attributeName: 'Bandwidth', attributeValue: '5 Million Hits', additionalPricePaise: 0 },
        { id: 'var_api_scale', sku: 'BL-API-SCL', attributeName: 'Bandwidth', attributeValue: '25 Million Hits', additionalPricePaise: 1200000 },
      ],
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'prod_hrm',
      name: 'Cloud HRM & Staff Orchestrator',
      code: 'BL-HRM-04',
      type: 'Software',
      salesPricePaise: 1800000, // ₹18,000
      costPricePaise: 400000,
      description: 'Payroll compliance, shift scheduling and biometric integrations.',
      currency: 'INR',
      status: 'active',
      variants: [],
      createdAt: '2026-02-15T00:00:00Z',
      updatedAt: '2026-09-15T00:00:00Z',
    },
    {
      id: 'prod_ai_seat',
      name: 'Pulse Copilot AI Seat',
      code: 'BL-AI-05',
      type: 'Add-on',
      salesPricePaise: 350000, // ₹3,500 / seat
      costPricePaise: 110000,
      description: 'Natural language billing explanations and automatic reconciliation suggestion agent.',
      currency: 'INR',
      status: 'active',
      variants: [],
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    },
    {
      id: 'prod_support_sla',
      name: '24/7 Priority Financial SLA',
      code: 'BL-SLA-06',
      type: 'Service',
      salesPricePaise: 2500000, // ₹25,000
      costPricePaise: 900000,
      description: 'Dedicated financial operations TAM with 15-minute response SLA.',
      currency: 'INR',
      status: 'active',
      variants: [],
      createdAt: '2026-03-10T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      id: 'prod_audit_svc',
      name: 'Quarterly Billing Audit & Recon Service',
      code: 'BL-REC-07',
      type: 'Service',
      salesPricePaise: 5000000, // ₹50,000
      costPricePaise: 1800000,
      description: 'Handcrafted balance sheet reconciliation by senior chartered accountants.',
      currency: 'INR',
      status: 'active',
      variants: [],
      createdAt: '2026-03-20T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z',
    },
    {
      id: 'prod_storage_tb',
      name: 'Immutable Financial Vault Storage (1TB)',
      code: 'BL-STG-08',
      type: 'Add-on',
      salesPricePaise: 600000, // ₹6,000
      costPricePaise: 180000,
      description: 'WORM-compliant encrypted ledger backup storage.',
      currency: 'INR',
      status: 'active',
      variants: [],
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'prod_hardware_token',
      name: 'Hardware FIDO2 Security Token',
      code: 'BL-FIDO-09',
      type: 'Physical',
      salesPricePaise: 450000, // ₹4,500
      costPricePaise: 210000,
      description: 'Cryptographic dual-interface USB-C/NFC physical security key.',
      currency: 'INR',
      status: 'active',
      variants: [],
      createdAt: '2026-04-10T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'prod_payment_pos',
      name: 'Smart Retail Billing Terminal',
      code: 'BL-POS-10',
      type: 'Physical',
      salesPricePaise: 1250000, // ₹12,500
      costPricePaise: 800000,
      description: 'Integrated dual-screen thermal printer terminal with UPI QR generator.',
      currency: 'INR',
      status: 'active',
      variants: [],
      createdAt: '2026-05-01T00:00:00Z',
      updatedAt: '2026-09-10T00:00:00Z',
    },
    {
      id: 'prod_daily_cloud',
      name: 'High-Performance GPU Cluster Access',
      code: 'BL-GPU-11',
      type: 'Service',
      salesPricePaise: 300000, // ₹3,000 / day
      costPricePaise: 160000,
      description: 'Dedicated Nvidia H100 computational node billed on daily cycles.',
      currency: 'INR',
      status: 'active',
      variants: [],
      createdAt: '2026-05-15T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
    },
    {
      id: 'prod_weekly_pentest',
      name: 'Automated Continuous Penetration Prober',
      code: 'BL-PEN-12',
      type: 'Software',
      salesPricePaise: 850000, // ₹8,500 / week
      costPricePaise: 250000,
      description: 'Weekly scheduled perimeter security & compliance test harness.',
      currency: 'INR',
      status: 'active',
      variants: [],
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    }
  ];

  // 5. Subscription Plans (8+ plans covering daily, weekly, monthly, yearly)
  const plans: SubscriptionPlan[] = [
    {
      id: 'plan_erp_monthly',
      name: 'ERP Professional Monthly',
      code: 'ERP-MTH-PRO',
      productId: 'prod_erp',
      description: 'Comprehensive business accounting and automated subscription pipeline.',
      pricePaise: 4500000, // ₹45,000 / mo
      billingFrequency: 'monthly',
      minimumQuantity: 1,
      availabilityStartDate: '2026-01-01',
      taxRuleId: 'tax_gst_18',
      status: 'active',
      behavior: {
        autoCloseAtEndDate: false,
        allowEarlyClosure: true,
        allowPause: true,
        allowRenewal: true,
      },
      versions: [
        {
          versionNumber: 1,
          effectiveDate: '2026-01-01',
          pricePaise: 4200000,
          taxRuleId: 'tax_gst_18',
          changeSummary: 'Initial launch version',
          createdBy: 'usr_admin',
        },
        {
          versionNumber: 2,
          effectiveDate: '2026-07-01',
          pricePaise: 4500000,
          taxRuleId: 'tax_gst_18',
          changeSummary: 'Price adjustment reflecting expanded feature set',
          createdBy: 'usr_admin',
        }
      ],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z',
    },
    {
      id: 'plan_erp_yearly',
      name: 'ERP Enterprise Annual (Best Value)',
      code: 'ERP-YR-ENT',
      productId: 'prod_erp',
      description: 'Annual commit including 2 months free + dedicated support SLA.',
      pricePaise: 45000000, // ₹4,50,000 / yr
      billingFrequency: 'yearly',
      minimumQuantity: 1,
      availabilityStartDate: '2026-01-01',
      taxRuleId: 'tax_gst_18',
      status: 'active',
      behavior: {
        autoCloseAtEndDate: false,
        allowEarlyClosure: true,
        allowPause: false,
        allowRenewal: true,
      },
      versions: [
        {
          versionNumber: 1,
          effectiveDate: '2026-01-01',
          pricePaise: 45000000,
          taxRuleId: 'tax_gst_18',
          changeSummary: 'Annual flagship release',
          createdBy: 'usr_admin',
        }
      ],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'plan_bi_monthly',
      name: 'Pulse BI Analytics Monthly',
      code: 'BI-MTH-STD',
      productId: 'prod_pulse_bi',
      description: 'Real-time cohort and revenue movement dashboards for leadership.',
      pricePaise: 2200000, // ₹22,000 / mo
      billingFrequency: 'monthly',
      minimumQuantity: 1,
      availabilityStartDate: '2026-01-15',
      taxRuleId: 'tax_gst_18',
      status: 'active',
      behavior: {
        autoCloseAtEndDate: false,
        allowEarlyClosure: true,
        allowPause: true,
        allowRenewal: true,
      },
      versions: [],
      createdAt: '2026-01-15T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z',
    },
    {
      id: 'plan_api_weekly',
      name: 'High-Traffic API Prober Weekly',
      code: 'API-WK-BURST',
      productId: 'prod_api_gw',
      description: 'Weekly burst bandwidth for seasonal sales campaigns & flash events.',
      pricePaise: 420000, // ₹4,200 / week
      billingFrequency: 'weekly',
      minimumQuantity: 1,
      availabilityStartDate: '2026-02-01',
      taxRuleId: 'tax_gst_18',
      status: 'active',
      behavior: {
        autoCloseAtEndDate: true,
        allowEarlyClosure: true,
        allowPause: false,
        allowRenewal: true,
      },
      versions: [],
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
    },
    {
      id: 'plan_gpu_daily',
      name: 'AI Model Crunching Daily Node',
      code: 'GPU-DAY-CRUNCH',
      productId: 'prod_daily_cloud',
      description: '24-hour dedicated GPU slice for high-load model inference.',
      pricePaise: 300000, // ₹3,000 / day
      billingFrequency: 'daily',
      minimumQuantity: 1,
      availabilityStartDate: '2026-05-15',
      taxRuleId: 'tax_gst_18',
      status: 'active',
      behavior: {
        autoCloseAtEndDate: true,
        allowEarlyClosure: false,
        allowPause: false,
        allowRenewal: true,
      },
      versions: [],
      createdAt: '2026-05-15T00:00:00Z',
      updatedAt: '2026-05-15T00:00:00Z',
    },
    {
      id: 'plan_pentest_weekly',
      name: 'Continuous Cyber Auditing Weekly',
      code: 'CYB-WK-AUDIT',
      productId: 'prod_weekly_pentest',
      description: 'Continuous weekly fuzzing and vulnerability scanning report.',
      pricePaise: 850000, // ₹8,500 / week
      billingFrequency: 'weekly',
      minimumQuantity: 1,
      availabilityStartDate: '2026-06-01',
      taxRuleId: 'tax_gst_18',
      status: 'active',
      behavior: {
        autoCloseAtEndDate: false,
        allowEarlyClosure: true,
        allowPause: true,
        allowRenewal: true,
      },
      versions: [],
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-01T00:00:00Z',
    },
    {
      id: 'plan_hrm_monthly',
      name: 'Staff & Payroll Orchestration Monthly',
      code: 'HRM-MTH-ORG',
      productId: 'prod_hrm',
      description: 'Full workforce lifecycle for growing multi-branch operations.',
      pricePaise: 1800000, // ₹18,000 / mo
      billingFrequency: 'monthly',
      minimumQuantity: 1,
      availabilityStartDate: '2026-02-15',
      taxRuleId: 'tax_gst_18',
      status: 'active',
      behavior: {
        autoCloseAtEndDate: false,
        allowEarlyClosure: true,
        allowPause: true,
        allowRenewal: true,
      },
      versions: [],
      createdAt: '2026-02-15T00:00:00Z',
      updatedAt: '2026-02-15T00:00:00Z',
    },
    {
      id: 'plan_support_sla_yearly',
      name: 'Mission Critical 24/7 SLA Annual',
      code: 'SLA-YR-GOLD',
      productId: 'prod_support_sla',
      description: 'Named incident commander and guaranteed 15-minute response turnaround.',
      pricePaise: 25000000, // ₹2,50,000 / yr
      billingFrequency: 'yearly',
      minimumQuantity: 1,
      availabilityStartDate: '2026-03-10',
      taxRuleId: 'tax_gst_18',
      status: 'active',
      behavior: {
        autoCloseAtEndDate: false,
        allowEarlyClosure: true,
        allowPause: false,
        allowRenewal: true,
      },
      versions: [],
      createdAt: '2026-03-10T00:00:00Z',
      updatedAt: '2026-03-10T00:00:00Z',
    }
  ];

  // 6. Discount Rules
  const discountRules: DiscountRule[] = [
    {
      id: 'disc_festive25',
      name: 'Diwali Festive Boost 25%',
      code: 'FESTIVE25',
      type: 'percentage',
      value: 25,
      minPurchaseAmountPaise: 2000000, // min ₹20,000
      startDate: '2026-10-01',
      endDate: '2026-11-15',
      usageLimit: 100,
      timesUsed: 14,
      status: 'Active',
    },
    {
      id: 'disc_startup50',
      name: 'Seed Stage Tech Grants 50%',
      code: 'STARTUP50',
      type: 'percentage',
      value: 50,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      usageLimit: 30,
      timesUsed: 19,
      status: 'Active',
    },
    {
      id: 'disc_flat5k',
      name: 'New Onboarding Welcome Credit',
      code: 'WELCOME5000',
      type: 'fixed',
      value: 500000, // ₹5,000 flat discount
      minPurchaseAmountPaise: 1500000,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      usageLimit: 200,
      timesUsed: 42,
      status: 'Active',
    },
    {
      id: 'disc_annualpass',
      name: 'Enterprise Multi-Year Loyalty',
      code: 'LOYALTY15',
      type: 'percentage',
      value: 15,
      startDate: '2026-01-01',
      timesUsed: 8,
      status: 'Active',
    }
  ];

  // 7. Customers (40+ customers with realistic data)
  const customers: Customer[] = [
    {
      id: 'cust_01',
      customerNumber: 'CUST-2026-001',
      companyName: 'Acme Infotech Bengaluru Pvt Ltd',
      contactName: 'Priya Sundaram',
      email: 'priya@acmetech.in',
      phone: '+91 98450 12345',
      billingAddress: {
        line1: '7th Floor, Prestige Tech Park',
        line2: 'Marathahalli Outer Ring Rd',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560103',
        country: 'India',
      },
      taxId: '29ABCDE1234F1Z5',
      status: 'active',
      assignedStaffId: 'stf_01',
      outstandingBalancePaise: 0,
      totalPaidPaise: 18500000,
      createdAt: '2026-01-20T08:00:00Z',
      updatedAt: '2026-10-25T10:00:00Z',
    },
    {
      id: 'cust_02',
      customerNumber: 'CUST-2026-002',
      companyName: 'Zenith Healthcare Technologies',
      contactName: 'Rohit Verma',
      email: 'rohit@zenithcorp.co',
      phone: '+91 99201 67890',
      billingAddress: {
        line1: 'Tower B, Nesco IT Park',
        line2: 'Goregaon East',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400063',
        country: 'India',
      },
      taxId: '27AABCV8976Q1ZM',
      status: 'active',
      assignedStaffId: 'stf_02',
      outstandingBalancePaise: 5310000, // ₹53,100 overdue
      totalPaidPaise: 15930000,
      createdAt: '2026-02-05T09:00:00Z',
      updatedAt: '2026-10-28T14:00:00Z',
    },
    {
      id: 'cust_03',
      customerNumber: 'CUST-2026-003',
      companyName: 'Paramount Logistics Hub',
      contactName: 'Ananya Deshmukh',
      email: 'finance@paramountlog.com',
      phone: '+91 94220 54321',
      billingAddress: {
        line1: 'Plot 44, Viman Nagar Logistics Zone',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411014',
        country: 'India',
      },
      taxId: '27AABCP3321L1ZN',
      status: 'active',
      assignedStaffId: 'stf_01',
      outstandingBalancePaise: 2596000, // ₹25,960 partially paid
      totalPaidPaise: 25960000,
      createdAt: '2026-02-18T10:30:00Z',
      updatedAt: '2026-10-29T11:00:00Z',
    },
    {
      id: 'cust_04',
      customerNumber: 'CUST-2026-004',
      companyName: 'Kaveri Renewable Energy Corp',
      contactName: 'Murali Krishna',
      email: 'accounts@kaverienergy.in',
      phone: '+91 98840 98765',
      billingAddress: {
        line1: 'Cyber Pearl, HITEC City',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500081',
        country: 'India',
      },
      taxId: '36AAACK4567M1ZV',
      status: 'active',
      assignedStaffId: 'stf_02',
      outstandingBalancePaise: 0,
      totalPaidPaise: 53100000,
      createdAt: '2026-03-01T11:00:00Z',
      updatedAt: '2026-10-30T10:00:00Z',
    },
    {
      id: 'cust_05',
      customerNumber: 'CUST-2026-005',
      companyName: 'Finova NeoBanking Solutions',
      contactName: 'Sanjay Aggarwal',
      email: 'sanjay@finovabank.io',
      phone: '+91 98110 34567',
      billingAddress: {
        line1: 'DLF Cyber City, Phase III',
        city: 'Gurugram',
        state: 'Haryana',
        postalCode: '122002',
        country: 'India',
      },
      taxId: '06AAACF7890N1ZW',
      status: 'active',
      assignedStaffId: 'stf_01',
      outstandingBalancePaise: 11800000, // ₹1,18,000 overdue
      totalPaidPaise: 47200000,
      createdAt: '2026-03-12T09:15:00Z',
      updatedAt: '2026-10-27T16:00:00Z',
    }
  ];

  // Dynamically generate the remaining 35 customers for rich CRM database
  const cities = [
    { city: 'Chennai', state: 'Tamil Nadu', code: '33' },
    { city: 'Ahmedabad', state: 'Gujarat', code: '24' },
    { city: 'Kolkata', state: 'West Bengal', code: '19' },
    { city: 'Noida', state: 'Uttar Pradesh', code: '09' },
    { city: 'Jaipur', state: 'Rajasthan', code: '08' },
    { city: 'Kochi', state: 'Kerala', code: '32' },
    { city: 'Chandigarh', state: 'Punjab', code: '04' }
  ];

  const companyPrefixes = ['Apex', 'Vanguard', 'Matrix', 'Starlight', 'Solarium', 'Equinox', 'Hyperion', 'Trident', 'Orbit', 'Optima'];
  const companySuffixes = ['Labs', 'Technologies', 'Consulting', 'Fintech', 'Ventures', 'Digital', 'Systems'];
  const firstNames = ['Dev', 'Kavita', 'Ramesh', 'Sneha', 'Deepak', 'Nisha', 'Gautam', 'Pooja', 'Vivek', 'Meera'];
  const lastNames = ['Menon', 'Patel', 'Kapoor', 'Reddy', 'Chatterjee', 'Gupta', 'Iyer', 'Bhat', 'Joshi', 'Chauhan'];

  for (let i = 6; i <= 42; i++) {
    const cityObj = cities[i % cities.length];
    const compName = `${companyPrefixes[i % companyPrefixes.length]} ${companySuffixes[i % companySuffixes.length]} ${i <= 20 ? 'India' : 'Solutions'}`;
    const contact = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
    const emailPrefix = `${firstNames[i % firstNames.length].toLowerCase()}.${lastNames[i % lastNames.length].toLowerCase()}`;

    customers.push({
      id: `cust_${i < 10 ? '0' + i : i}`,
      customerNumber: `CUST-2026-${(i).toString().padStart(3, '0')}`,
      companyName: compName,
      contactName: contact,
      email: `${emailPrefix}@${compName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      phone: `+91 98${(10000000 + i * 234567).toString().substring(0, 8)}`,
      billingAddress: {
        line1: `${100 + i}, Industrial Tech Zone`,
        city: cityObj.city,
        state: cityObj.state,
        postalCode: `${cityObj.code}00${(10 + i)}`,
        country: 'India',
      },
      taxId: `${cityObj.code}AABBC${(1000 + i)}D1Z${i % 9}`,
      status: i === 41 ? 'inactive' : (i === 42 ? 'prospect' : 'active'),
      assignedStaffId: i % 2 === 0 ? 'stf_01' : 'stf_02',
      outstandingBalancePaise: i % 7 === 0 ? 3540000 : 0,
      totalPaidPaise: (i * 1250000),
      createdAt: `2026-0${(i % 8) + 1}-10T10:00:00Z`,
      updatedAt: '2026-10-28T09:00:00Z',
    });
  }

  // 8. Quotation Templates
  const quotationTemplates: QuotationTemplate[] = [
    {
      id: 'tpl_standard_erp',
      name: 'Standard ERP & BI Onboarding Bundle',
      description: 'Preconfigured package for mid-size manufacturing and logistics firms.',
      defaultPlanId: 'plan_erp_monthly',
      defaultLines: [
        { productId: 'prod_erp', variantId: 'var_erp_std', quantity: 1 },
        { productId: 'prod_pulse_bi', variantId: 'var_bi_base', quantity: 1 },
        { productId: 'prod_support_sla', quantity: 1 },
      ],
      paymentTerms: 'Net 15 Days',
      validityDays: 30,
      defaultDiscountCode: 'FESTIVE25',
      createdAt: '2026-02-01T00:00:00Z',
    },
    {
      id: 'tpl_enterprise_annual',
      name: 'Enterprise Mission-Critical Annual Pack',
      description: 'Dedicated enterprise air-gapped setup with SLA and hardware tokens.',
      defaultPlanId: 'plan_erp_yearly',
      defaultLines: [
        { productId: 'prod_erp', variantId: 'var_erp_ent', quantity: 1 },
        { productId: 'prod_support_sla', quantity: 1 },
        { productId: 'prod_hardware_token', quantity: 5 },
      ],
      paymentTerms: 'Net 30 Days',
      validityDays: 45,
      defaultDiscountCode: 'LOYALTY15',
      createdAt: '2026-03-01T00:00:00Z',
    }
  ];

  // 9. Quotations
  const quotations: Quotation[] = [
    {
      id: 'quot_01',
      quotationNumber: 'Q-2026-00084',
      customerId: 'cust_01',
      customerName: 'Acme Infotech Bengaluru Pvt Ltd',
      planId: 'plan_erp_monthly',
      planName: 'ERP Professional Monthly',
      lines: [
        {
          id: 'qline_1',
          productId: 'prod_erp',
          productName: 'Brightloop Pulse ERP Suite',
          variantId: 'var_erp_std',
          variantLabel: 'Standard Cloud',
          basePricePaise: 4500000,
          variantAdditionalPaise: 0,
          unitPricePaise: 4500000,
          quantity: 1,
          discountPaise: 0,
          taxRatePercent: 18,
          taxAmountPaise: 810000,
          lineTotalPaise: 5310000,
        }
      ],
      subtotalPaise: 4500000,
      discountAmountPaise: 0,
      taxAmountPaise: 810000,
      totalPaise: 5310000,
      paymentTerms: 'Net 30 Days',
      validUntil: '2026-11-25',
      status: 'Converted',
      convertedSubscriptionId: 'sub_01',
      createdBy: 'Sarah Jenkins',
      createdAt: '2026-01-22T10:00:00Z',
      updatedAt: '2026-01-25T11:00:00Z',
    },
    {
      id: 'quot_02',
      quotationNumber: 'Q-2026-00085',
      customerId: 'cust_02',
      customerName: 'Zenith Healthcare Technologies',
      planId: 'plan_erp_monthly',
      planName: 'ERP Professional Monthly',
      lines: [
        {
          id: 'qline_2',
          productId: 'prod_erp',
          productName: 'Brightloop Pulse ERP Suite',
          variantId: 'var_erp_std',
          variantLabel: 'Standard Cloud',
          basePricePaise: 4500000,
          variantAdditionalPaise: 0,
          unitPricePaise: 4500000,
          quantity: 1,
          discountPaise: 0,
          taxRatePercent: 18,
          taxAmountPaise: 810000,
          lineTotalPaise: 5310000,
        }
      ],
      subtotalPaise: 4500000,
      discountAmountPaise: 0,
      taxAmountPaise: 810000,
      totalPaise: 5310000,
      paymentTerms: 'Net 15 Days',
      validUntil: '2026-11-15',
      status: 'Confirmed',
      createdBy: 'Arjun Nambiar',
      createdAt: '2026-10-15T09:30:00Z',
      updatedAt: '2026-10-18T14:00:00Z',
    },
    {
      id: 'quot_03',
      quotationNumber: 'Q-2026-00086',
      customerId: 'cust_05',
      customerName: 'Finova NeoBanking Solutions',
      planId: 'plan_erp_yearly',
      planName: 'ERP Enterprise Annual',
      lines: [
        {
          id: 'qline_3',
          productId: 'prod_erp',
          productName: 'Brightloop Pulse ERP Suite',
          variantId: 'var_erp_ent',
          variantLabel: 'Enterprise Dedicated',
          basePricePaise: 45000000,
          variantAdditionalPaise: 25000000,
          unitPricePaise: 70000000,
          quantity: 1,
          discountPaise: 10500000,
          taxRatePercent: 18,
          taxAmountPaise: 10710000,
          lineTotalPaise: 70210000,
        }
      ],
      subtotalPaise: 70000000,
      discountCode: 'LOYALTY15',
      discountAmountPaise: 10500000,
      taxAmountPaise: 10710000,
      totalPaise: 70210000,
      paymentTerms: 'Net 30 Days',
      validUntil: '2026-11-30',
      status: 'Sent',
      createdBy: 'Sarah Jenkins',
      createdAt: '2026-10-24T16:00:00Z',
      updatedAt: '2026-10-24T16:00:00Z',
    }
  ];

  // 10. Subscriptions (diverse statuses: Active, Paused, Closed)
  const subscriptions: Subscription[] = [
    {
      id: 'sub_01',
      subscriptionNumber: 'SUB-2026-00042',
      customerId: 'cust_01',
      customerName: 'Acme Infotech Bengaluru Pvt Ltd',
      planId: 'plan_erp_monthly',
      planName: 'ERP Professional Monthly',
      billingFrequency: 'monthly',
      startDate: '2026-01-25',
      nextBillingDate: '2026-11-25',
      paymentTerms: 'Net 30 Days',
      lines: [
        {
          id: 'sline_01',
          productId: 'prod_erp',
          productName: 'Brightloop Pulse ERP Suite',
          variantId: 'var_erp_std',
          variantLabel: 'Standard Cloud',
          unitPricePaise: 4500000,
          quantity: 1,
          taxRatePercent: 18,
          discountPaise: 0,
          lineTotalPaise: 5310000,
        }
      ],
      subtotalPaise: 4500000,
      discountAmountPaise: 0,
      taxAmountPaise: 810000,
      totalPaise: 5310000,
      autoRenew: true,
      status: 'Active',
      statusHistory: [
        { id: 'ev_1', timestamp: '2026-01-22T10:00:00Z', fromStatus: 'Draft', toStatus: 'Quotation', actor: 'Sarah Jenkins' },
        { id: 'ev_2', timestamp: '2026-01-24T12:00:00Z', fromStatus: 'Quotation', toStatus: 'Confirmed', actor: 'Priya Sundaram' },
        { id: 'ev_3', timestamp: '2026-01-25T09:00:00Z', fromStatus: 'Confirmed', toStatus: 'Active', actor: 'System' }
      ],
      assignedStaffId: 'stf_01',
      createdAt: '2026-01-22T10:00:00Z',
      updatedAt: '2026-10-25T09:00:00Z',
    },
    {
      id: 'sub_02',
      subscriptionNumber: 'SUB-2026-00043',
      customerId: 'cust_02',
      customerName: 'Zenith Healthcare Technologies',
      planId: 'plan_erp_monthly',
      planName: 'ERP Professional Monthly',
      billingFrequency: 'monthly',
      startDate: '2026-02-10',
      nextBillingDate: '2026-11-10',
      paymentTerms: 'Net 15 Days',
      lines: [
        {
          id: 'sline_02',
          productId: 'prod_erp',
          productName: 'Brightloop Pulse ERP Suite',
          variantId: 'var_erp_std',
          variantLabel: 'Standard Cloud',
          unitPricePaise: 4500000,
          quantity: 1,
          taxRatePercent: 18,
          discountPaise: 0,
          lineTotalPaise: 5310000,
        }
      ],
      subtotalPaise: 4500000,
      discountAmountPaise: 0,
      taxAmountPaise: 810000,
      totalPaise: 5310000,
      autoRenew: true,
      status: 'Active',
      statusHistory: [
        { id: 'ev_4', timestamp: '2026-02-10T09:00:00Z', fromStatus: 'Confirmed', toStatus: 'Active', actor: 'Arjun Nambiar' }
      ],
      assignedStaffId: 'stf_02',
      createdAt: '2026-02-10T09:00:00Z',
      updatedAt: '2026-10-10T09:00:00Z',
    },
    {
      id: 'sub_03',
      subscriptionNumber: 'SUB-2026-00044',
      customerId: 'cust_03',
      customerName: 'Paramount Logistics Hub',
      planId: 'plan_bi_monthly',
      planName: 'Pulse BI Analytics Monthly',
      billingFrequency: 'monthly',
      startDate: '2026-03-01',
      nextBillingDate: '2026-11-01',
      paymentTerms: 'Net 15 Days',
      lines: [
        {
          id: 'sline_03',
          productId: 'prod_pulse_bi',
          productName: 'Pulse Business Intelligence Engine',
          variantId: 'var_bi_base',
          variantLabel: 'Up to 10k Records',
          unitPricePaise: 2200000,
          quantity: 1,
          taxRatePercent: 18,
          discountPaise: 0,
          lineTotalPaise: 2596000,
        }
      ],
      subtotalPaise: 2200000,
      discountAmountPaise: 0,
      taxAmountPaise: 396000,
      totalPaise: 2596000,
      autoRenew: true,
      status: 'Active',
      statusHistory: [
        { id: 'ev_5', timestamp: '2026-03-01T09:00:00Z', fromStatus: 'Confirmed', toStatus: 'Active', actor: 'System' }
      ],
      assignedStaffId: 'stf_01',
      createdAt: '2026-03-01T09:00:00Z',
      updatedAt: '2026-10-01T09:00:00Z',
    },
    {
      id: 'sub_04',
      subscriptionNumber: 'SUB-2026-00045',
      customerId: 'cust_04',
      customerName: 'Kaveri Renewable Energy Corp',
      planId: 'plan_erp_yearly',
      planName: 'ERP Enterprise Annual',
      billingFrequency: 'yearly',
      startDate: '2026-03-15',
      expiryDate: '2027-03-14',
      nextBillingDate: '2027-03-15',
      paymentTerms: 'Net 30 Days',
      lines: [
        {
          id: 'sline_04',
          productId: 'prod_erp',
          productName: 'Brightloop Pulse ERP Suite',
          variantId: 'var_erp_std',
          variantLabel: 'Standard Cloud',
          unitPricePaise: 45000000,
          quantity: 1,
          taxRatePercent: 18,
          discountPaise: 0,
          lineTotalPaise: 53100000,
        }
      ],
      subtotalPaise: 45000000,
      discountAmountPaise: 0,
      taxAmountPaise: 8100000,
      totalPaise: 53100000,
      autoRenew: true,
      status: 'Active',
      statusHistory: [
        { id: 'ev_6', timestamp: '2026-03-15T09:00:00Z', fromStatus: 'Confirmed', toStatus: 'Active', actor: 'Arjun Nambiar' }
      ],
      assignedStaffId: 'stf_02',
      createdAt: '2026-03-15T09:00:00Z',
      updatedAt: '2026-03-15T09:00:00Z',
    },
    {
      id: 'sub_05',
      subscriptionNumber: 'SUB-2026-00046',
      customerId: 'cust_05',
      customerName: 'Finova NeoBanking Solutions',
      planId: 'plan_erp_monthly',
      planName: 'ERP Professional Monthly',
      billingFrequency: 'monthly',
      startDate: '2026-04-01',
      nextBillingDate: '2026-11-01',
      paymentTerms: 'Net 15 Days',
      lines: [
        {
          id: 'sline_05',
          productId: 'prod_erp',
          productName: 'Brightloop Pulse ERP Suite',
          variantId: 'var_erp_ent',
          variantLabel: 'Enterprise Dedicated',
          unitPricePaise: 7000000,
          quantity: 1,
          taxRatePercent: 18,
          discountPaise: 0,
          lineTotalPaise: 8260000,
        }
      ],
      subtotalPaise: 7000000,
      discountAmountPaise: 0,
      taxAmountPaise: 1260000,
      totalPaise: 8260000,
      autoRenew: true,
      status: 'Paused',
      pausedAt: '2026-10-20T10:00:00Z',
      statusHistory: [
        { id: 'ev_7', timestamp: '2026-04-01T09:00:00Z', fromStatus: 'Confirmed', toStatus: 'Active', actor: 'Sarah Jenkins' },
        { id: 'ev_8', timestamp: '2026-10-20T10:00:00Z', fromStatus: 'Active', toStatus: 'Paused', actor: 'Sanjay Aggarwal', reason: 'Temporary infrastructure migration' }
      ],
      assignedStaffId: 'stf_01',
      createdAt: '2026-04-01T09:00:00Z',
      updatedAt: '2026-10-20T10:00:00Z',
    },
    {
      id: 'sub_06',
      subscriptionNumber: 'SUB-2026-00047',
      customerId: 'cust_06',
      customerName: 'Apex Labs India',
      planId: 'plan_gpu_daily',
      planName: 'AI Model Crunching Daily Node',
      billingFrequency: 'daily',
      startDate: '2026-10-01',
      expiryDate: '2026-10-15',
      nextBillingDate: '2026-10-15',
      paymentTerms: 'Immediate',
      lines: [
        {
          id: 'sline_06',
          productId: 'prod_daily_cloud',
          productName: 'High-Performance GPU Cluster Access',
          unitPricePaise: 300000,
          quantity: 1,
          taxRatePercent: 18,
          discountPaise: 0,
          lineTotalPaise: 354000,
        }
      ],
      subtotalPaise: 300000,
      discountAmountPaise: 0,
      taxAmountPaise: 54000,
      totalPaise: 354000,
      autoRenew: false,
      status: 'Closed',
      closedAt: '2026-10-15T23:59:59Z',
      closureReason: 'Project compute cycle completed',
      statusHistory: [
        { id: 'ev_9', timestamp: '2026-10-01T00:00:00Z', fromStatus: 'Confirmed', toStatus: 'Active', actor: 'System' },
        { id: 'ev_10', timestamp: '2026-10-15T23:59:59Z', fromStatus: 'Active', toStatus: 'Closed', actor: 'Auto-Close Engine', reason: 'Reached end date' }
      ],
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-15T23:59:59Z',
    }
  ];

  // 11. Invoices (Draft, Confirmed, Paid, Partially Paid, Overdue)
  const invoices: Invoice[] = [
    {
      id: 'inv_01',
      invoiceNumber: 'INV-2026-000101',
      customerId: 'cust_01',
      customerName: 'Acme Infotech Bengaluru Pvt Ltd',
      customerEmail: 'priya@acmetech.in',
      billingAddress: customers[0].billingAddress,
      subscriptionId: 'sub_01',
      subscriptionNumber: 'SUB-2026-00042',
      billingPeriod: '2026-09',
      issueDate: '2026-09-25',
      dueDate: '2026-10-25',
      lines: [
        {
          id: 'iline_01',
          productName: 'Brightloop Pulse ERP Suite',
          variantLabel: 'Standard Cloud',
          unitPricePaise: 4500000,
          quantity: 1,
          subtotalPaise: 4500000,
          discountPaise: 0,
          taxRatePercent: 18,
          taxAmountPaise: 810000,
          totalPaise: 5310000,
        }
      ],
      subtotalPaise: 4500000,
      discountAmountPaise: 0,
      taxes: [
        { name: 'CGST 9%', ratePercent: 9, taxAmountPaise: 405000 },
        { name: 'SGST 9%', ratePercent: 9, taxAmountPaise: 405000 }
      ],
      taxAmountPaise: 810000,
      totalPaise: 5310000,
      amountPaidPaise: 5310000,
      outstandingBalancePaise: 0,
      paymentTerms: 'Net 30 Days',
      status: 'Paid',
      sentAt: '2026-09-25T10:00:00Z',
      createdAt: '2026-09-25T09:00:00Z',
      updatedAt: '2026-10-20T14:30:00Z',
    },
    {
      id: 'inv_02',
      invoiceNumber: 'INV-2026-000102',
      customerId: 'cust_01',
      customerName: 'Acme Infotech Bengaluru Pvt Ltd',
      customerEmail: 'priya@acmetech.in',
      billingAddress: customers[0].billingAddress,
      subscriptionId: 'sub_01',
      subscriptionNumber: 'SUB-2026-00042',
      billingPeriod: '2026-10',
      issueDate: '2026-10-25',
      dueDate: '2026-11-25',
      lines: [
        {
          id: 'iline_02',
          productName: 'Brightloop Pulse ERP Suite',
          variantLabel: 'Standard Cloud',
          unitPricePaise: 4500000,
          quantity: 1,
          subtotalPaise: 4500000,
          discountPaise: 0,
          taxRatePercent: 18,
          taxAmountPaise: 810000,
          totalPaise: 5310000,
        }
      ],
      subtotalPaise: 4500000,
      discountAmountPaise: 0,
      taxes: [
        { name: 'CGST 9%', ratePercent: 9, taxAmountPaise: 405000 },
        { name: 'SGST 9%', ratePercent: 9, taxAmountPaise: 405000 }
      ],
      taxAmountPaise: 810000,
      totalPaise: 5310000,
      amountPaidPaise: 0,
      outstandingBalancePaise: 5310000,
      paymentTerms: 'Net 30 Days',
      status: 'Confirmed',
      sentAt: '2026-10-25T10:00:00Z',
      createdAt: '2026-10-25T09:00:00Z',
      updatedAt: '2026-10-25T10:00:00Z',
    },
    {
      id: 'inv_03',
      invoiceNumber: 'INV-2026-000103',
      customerId: 'cust_02',
      customerName: 'Zenith Healthcare Technologies',
      customerEmail: 'rohit@zenithcorp.co',
      billingAddress: customers[1].billingAddress,
      subscriptionId: 'sub_02',
      subscriptionNumber: 'SUB-2026-00043',
      billingPeriod: '2026-10',
      issueDate: '2026-10-10',
      dueDate: '2026-10-25', // Overdue since 25 Oct
      lines: [
        {
          id: 'iline_03',
          productName: 'Brightloop Pulse ERP Suite',
          variantLabel: 'Standard Cloud',
          unitPricePaise: 4500000,
          quantity: 1,
          subtotalPaise: 4500000,
          discountPaise: 0,
          taxRatePercent: 18,
          taxAmountPaise: 810000,
          totalPaise: 5310000,
        }
      ],
      subtotalPaise: 4500000,
      discountAmountPaise: 0,
      taxes: [
        { name: 'IGST 18%', ratePercent: 18, taxAmountPaise: 810000 }
      ],
      taxAmountPaise: 810000,
      totalPaise: 5310000,
      amountPaidPaise: 0,
      outstandingBalancePaise: 5310000,
      paymentTerms: 'Net 15 Days',
      status: 'Overdue',
      sentAt: '2026-10-10T11:00:00Z',
      createdAt: '2026-10-10T09:00:00Z',
      updatedAt: '2026-10-26T00:00:00Z',
    },
    {
      id: 'inv_04',
      invoiceNumber: 'INV-2026-000104',
      customerId: 'cust_03',
      customerName: 'Paramount Logistics Hub',
      customerEmail: 'finance@paramountlog.com',
      billingAddress: customers[2].billingAddress,
      subscriptionId: 'sub_03',
      subscriptionNumber: 'SUB-2026-00044',
      billingPeriod: '2026-10',
      issueDate: '2026-10-01',
      dueDate: '2026-10-16',
      lines: [
        {
          id: 'iline_04',
          productName: 'Pulse Business Intelligence Engine',
          variantLabel: 'Up to 10k Records',
          unitPricePaise: 2200000,
          quantity: 1,
          subtotalPaise: 2200000,
          discountPaise: 0,
          taxRatePercent: 18,
          taxAmountPaise: 396000,
          totalPaise: 2596000,
        }
      ],
      subtotalPaise: 2200000,
      discountAmountPaise: 0,
      taxes: [
        { name: 'IGST 18%', ratePercent: 18, taxAmountPaise: 396000 }
      ],
      taxAmountPaise: 396000,
      totalPaise: 2596000,
      amountPaidPaise: 1500000, // Partial payment ₹15,000
      outstandingBalancePaise: 1096000, // ₹10,960 remaining
      paymentTerms: 'Net 15 Days',
      status: 'Partially Paid',
      sentAt: '2026-10-01T10:00:00Z',
      createdAt: '2026-10-01T09:00:00Z',
      updatedAt: '2026-10-12T16:00:00Z',
    },
    {
      id: 'inv_05',
      invoiceNumber: 'INV-2026-000105',
      customerId: 'cust_04',
      customerName: 'Kaveri Renewable Energy Corp',
      customerEmail: 'accounts@kaverienergy.in',
      billingAddress: customers[3].billingAddress,
      subscriptionId: 'sub_04',
      subscriptionNumber: 'SUB-2026-00045',
      billingPeriod: '2026-ANNUAL',
      issueDate: '2026-03-15',
      dueDate: '2026-04-15',
      lines: [
        {
          id: 'iline_05',
          productName: 'Brightloop Pulse ERP Suite',
          variantLabel: 'Standard Cloud',
          unitPricePaise: 45000000,
          quantity: 1,
          subtotalPaise: 45000000,
          discountPaise: 0,
          taxRatePercent: 18,
          taxAmountPaise: 8100000,
          totalPaise: 53100000,
        }
      ],
      subtotalPaise: 45000000,
      discountAmountPaise: 0,
      taxes: [
        { name: 'IGST 18%', ratePercent: 18, taxAmountPaise: 8100000 }
      ],
      taxAmountPaise: 8100000,
      totalPaise: 53100000,
      amountPaidPaise: 53100000,
      outstandingBalancePaise: 0,
      paymentTerms: 'Net 30 Days',
      status: 'Paid',
      sentAt: '2026-03-15T11:00:00Z',
      createdAt: '2026-03-15T09:00:00Z',
      updatedAt: '2026-04-05T12:00:00Z',
    }
  ];

  // 12. Payments
  const payments: Payment[] = [
    {
      id: 'pay_01',
      paymentNumber: 'PAY-2026-00051',
      customerId: 'cust_01',
      customerName: 'Acme Infotech Bengaluru Pvt Ltd',
      invoiceId: 'inv_01',
      invoiceNumber: 'INV-2026-000101',
      paymentMethod: 'UPI',
      amountPaise: 5310000,
      allocatedPaise: 5310000,
      unappliedCreditPaise: 0,
      paymentDate: '2026-10-20',
      transactionReference: 'UPI/293847291039/HDFC',
      notes: 'Monthly settlement via Razorpay UPI QR',
      recordedBy: 'Auto-Gateway',
      status: 'Success',
      allocations: [{ invoiceId: 'inv_01', invoiceNumber: 'INV-2026-000101', amountPaise: 5310000 }],
      createdAt: '2026-10-20T14:30:00Z',
    },
    {
      id: 'pay_02',
      paymentNumber: 'PAY-2026-00052',
      customerId: 'cust_03',
      customerName: 'Paramount Logistics Hub',
      invoiceId: 'inv_04',
      invoiceNumber: 'INV-2026-000104',
      paymentMethod: 'Bank Transfer',
      amountPaise: 1500000,
      allocatedPaise: 1500000,
      unappliedCreditPaise: 0,
      paymentDate: '2026-10-12',
      transactionReference: 'NEFT/CMS284719482/ICICI',
      notes: 'Part payment - balance committed by 10 Nov',
      recordedBy: 'Sarah Jenkins',
      status: 'Success',
      allocations: [{ invoiceId: 'inv_04', invoiceNumber: 'INV-2026-000104', amountPaise: 1500000 }],
      createdAt: '2026-10-12T16:00:00Z',
    },
    {
      id: 'pay_03',
      paymentNumber: 'PAY-2026-00053',
      customerId: 'cust_04',
      customerName: 'Kaveri Renewable Energy Corp',
      invoiceId: 'inv_05',
      invoiceNumber: 'INV-2026-000105',
      paymentMethod: 'Bank Transfer',
      amountPaise: 53100000,
      allocatedPaise: 53100000,
      unappliedCreditPaise: 0,
      paymentDate: '2026-04-05',
      transactionReference: 'RTGS/RBIS2026040510293/SBI',
      notes: 'Full annual contract settlement',
      recordedBy: 'Arjun Nambiar',
      status: 'Success',
      allocations: [{ invoiceId: 'inv_05', invoiceNumber: 'INV-2026-000105', amountPaise: 53100000 }],
      createdAt: '2026-04-05T12:00:00Z',
    }
  ];

  // 13. Bank Statement Rows for Reconciliation
  const bankStatementRows: BankStatementRow[] = [
    {
      id: 'stmt_01',
      date: '2026-10-20',
      description: 'UPI/293847291039/ACME INFOTECH/HDFC',
      reference: 'UPI/293847291039/HDFC',
      amountPaise: 5310000,
      type: 'credit',
      matchStatus: 'Matched',
      matchedInvoiceId: 'inv_01',
      matchedCustomerName: 'Acme Infotech Bengaluru Pvt Ltd',
      confidencePercent: 99,
      approved: true,
    },
    {
      id: 'stmt_02',
      date: '2026-10-26',
      description: 'NEFT/ZENITH TECH/CMS82910283/AXIS',
      reference: 'CMS82910283',
      amountPaise: 5310000,
      type: 'credit',
      matchStatus: 'Needs Review',
      matchedInvoiceId: 'inv_03',
      matchedCustomerName: 'Zenith Healthcare Technologies',
      confidencePercent: 88,
      approved: false,
    },
    {
      id: 'stmt_03',
      date: '2026-10-29',
      description: 'IMPS/RET/REF9820192837/UNKNOWN ENTITY',
      reference: 'REF9820192837',
      amountPaise: 1250000,
      type: 'credit',
      matchStatus: 'Unmatched',
      confidencePercent: 15,
      approved: false,
    }
  ];

  // 14. Billing Runs
  const billingRuns: BillingRun[] = [
    {
      id: 'run_20261025',
      runReference: 'RUN-20261025-1001',
      executionDate: '2026-10-25T09:00:00Z',
      targetPeriod: '2026-10',
      invoicesCreated: 18,
      subscriptionsSkipped: 2,
      duplicatesPrevented: 0,
      totalInvoicedPaise: 114500000,
      durationMs: 420,
      status: 'completed',
      skippedDetails: [
        { subscriptionNumber: 'SUB-2026-00046', customerName: 'Finova NeoBanking', reason: 'Subscription is in Paused status' },
        { subscriptionNumber: 'SUB-2026-00047', customerName: 'Apex Labs', reason: 'Subscription is Closed' }
      ],
      invoiceIds: ['inv_02'],
      executedBy: 'Vikramaditya Sharma',
    }
  ];

  // 15. Tasks
  const tasks: Task[] = [
    {
      id: 'tsk_01',
      title: 'Follow up on Overdue Invoice INV-2026-000103',
      description: 'Gentle chase reminder sent; phone follow-up scheduled with Rohit Verma.',
      assignedStaffId: 'stf_02',
      assignedStaffName: 'Arjun Nambiar',
      customerId: 'cust_02',
      customerName: 'Zenith Healthcare Technologies',
      priority: 'high',
      status: 'In Progress',
      dueDate: '2026-11-02',
      type: 'invoice_followup',
      createdAt: '2026-10-26T09:00:00Z',
    },
    {
      id: 'tsk_02',
      title: 'Review Enterprise Quotation Q-2026-00086 with Finova',
      description: 'Finova reviewing 15% multi-year discount proposal.',
      assignedStaffId: 'stf_01',
      assignedStaffName: 'Sarah Jenkins',
      customerId: 'cust_05',
      customerName: 'Finova NeoBanking Solutions',
      priority: 'medium',
      status: 'Pending',
      dueDate: '2026-11-05',
      type: 'quote_review',
      createdAt: '2026-10-24T16:30:00Z',
    }
  ];

  // 16. Approvals
  const approvalRequests: ApprovalRequest[] = [
    {
      id: 'appr_01',
      requestType: 'high_value_discount',
      entityId: 'quot_03',
      entityReference: 'Q-2026-00086 (₹70.21L)',
      requestedBy: 'usr_staff_sarah',
      requestedByName: 'Sarah Jenkins',
      approverId: 'usr_admin',
      approverName: 'Vikramaditya Sharma',
      amountPaise: 10500000, // ₹1,05,000 discount
      justification: 'Strategic enterprise logo committed for 3-year multi-region rollout.',
      status: 'Pending',
      createdAt: '2026-10-24T16:15:00Z',
    }
  ];

  // 17. Audit Logs
  const auditLogs: AuditLogEntry[] = [
    {
      id: 'aud_01',
      timestamp: '2026-10-20T14:30:00Z',
      actor: 'Auto-Gateway',
      actorRole: 'admin',
      action: 'PAYMENT_RECORDED',
      module: 'Payments',
      recordId: 'pay_01',
      details: 'Recorded UPI payment ₹53,100 for invoice INV-2026-000101',
    },
    {
      id: 'aud_02',
      timestamp: '2026-10-25T09:00:00Z',
      actor: 'Vikramaditya Sharma',
      actorRole: 'admin',
      action: 'BILLING_RUN_EXECUTED',
      module: 'Billing Engine',
      recordId: 'run_20261025',
      details: 'Executed scheduled billing run RUN-20261025-1001. 18 created, 2 skipped.',
    },
    {
      id: 'aud_03',
      timestamp: '2026-10-26T08:15:00Z',
      actor: 'System Watchdog',
      actorRole: 'admin',
      action: 'OVERDUE_CLASSIFICATION',
      module: 'Invoices',
      recordId: 'inv_03',
      details: 'Marked invoice INV-2026-000103 as Overdue (+1 day). Added to Gentle Chase queue.',
    }
  ];

  // 18. System Health
  const healthIssues: SystemHealthIssue[] = [
    {
      id: 'hlth_01',
      severity: 'medium',
      title: '1 Subscription Paused - Skipped in Oct Billing',
      component: 'Billing Engine',
      description: 'Finova NeoBanking (SUB-2026-00046) was safely bypassed according to plan behavior.',
      detectedAt: '2026-10-25T09:00:00Z',
      resolved: true,
      resolutionAction: 'Verified paused status with account manager',
    },
    {
      id: 'hlth_02',
      severity: 'low',
      title: '1 Bank Statement Row Requires Manual Review',
      component: 'Reconciliation',
      description: 'NEFT credit from Zenith Tech CMS82910283 pending approval in Gentle Chase.',
      detectedAt: '2026-10-26T12:00:00Z',
      resolved: false,
    }
  ];

  // 19. Automation Rules
  const automationRules: AutomationRule[] = [
    {
      id: 'auto_01',
      name: 'Gentle Chase Overdue Reminder Stage 1',
      trigger: 'invoice_overdue',
      conditions: 'Overdue between 1 and 7 days',
      action: 'send_email',
      enabled: true,
      lastFiredAt: '2026-10-26T08:30:00Z',
      executionsCount: 38,
    },
    {
      id: 'auto_02',
      name: 'Renewal Notice 14 Days Prior',
      trigger: 'subscription_expiring_soon',
      conditions: 'Days until expiry <= 14',
      action: 'in_app_notification',
      enabled: true,
      lastFiredAt: '2026-10-28T04:00:00Z',
      executionsCount: 112,
    },
    {
      id: 'auto_03',
      name: 'High-Value Discount Escalate to Admin',
      trigger: 'high_value_quote_created',
      conditions: 'Discount value > ₹50,000',
      action: 'request_approval',
      enabled: true,
      lastFiredAt: '2026-10-24T16:15:00Z',
      executionsCount: 7,
    }
  ];

  // 20. Notifications
  const notifications: NotificationItem[] = [
    {
      id: 'notif_01',
      userId: 'usr_admin',
      title: 'Billing Run Completed',
      message: 'Run RUN-20261025-1001 processed 18 invoices (₹11.45L) with zero errors.',
      type: 'success',
      link: '/billing',
      read: false,
      createdAt: '2026-10-25T09:05:00Z',
    },
    {
      id: 'notif_02',
      userId: 'usr_admin',
      title: 'Approval Request: Finova Quotation',
      message: 'Sarah Jenkins requested 15% discount approval for ₹70.21L proposal.',
      type: 'urgent',
      link: '/approvals',
      read: false,
      createdAt: '2026-10-24T16:16:00Z',
    },
    {
      id: 'notif_03',
      userId: 'usr_cust_priya',
      title: 'Invoice INV-2026-000102 Generated',
      message: 'Your monthly bill for ₹53,100 is ready. Due by 25 Nov 2026.',
      type: 'info',
      link: '/portal/invoices',
      read: false,
      createdAt: '2026-10-25T10:00:00Z',
    }
  ];

  // 21. Company Settings
  const companySettings: CompanySettings = {
    companyName: 'Brightloop Technologies Private Limited',
    brandTagline: 'Every Subscription. Every Payment. Always in Sync.',
    taxId: '29AABCB1234F1Z9',
    email: 'billing@brightloop.io',
    phone: '+91 80 4900 1200',
    address: {
      line1: '9th Floor, Brigade Tech Gardens',
      line2: 'Brookefield, Whitefield',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560066',
      country: 'India',
    },
    currency: 'INR',
    currencySymbol: '₹',
    invoicePrefix: 'INV-2026-',
    subscriptionPrefix: 'SUB-2026-',
    defaultPaymentTerms: 'Net 30 Days',
    autoCloseSubscriptions: true,
    pauseAllBillingSafetySwitch: false,
    schedulerEnabled: true,
    timezone: 'Asia/Kolkata (IST, UTC+5:30)',
    fiscalYearStartMonth: 4, // April
  };

  const initialSmsConfig: SmsProviderConfig = {
    provider: 'sandbox',
    isSandbox: true,
    senderId: 'BRTLOP',
    dltEntityId: '11014522900000452',
    balanceCredits: 4850,
    lastTestedAt: '2026-10-31T08:30:00Z',
  };

  const initialSmsLogs: SmsLog[] = [
    {
      id: 'sms_001',
      messageId: 'MSG-SANDBOX-984210',
      to: '+91 98450 12345',
      customerName: 'Acme Technologies Pvt Ltd',
      customerId: 'cust_01',
      message: 'Dear Acme Technologies, invoice INV-2026-001 for ₹53,100 has been generated. Due date: 2026-11-15. Settle securely at https://brightloop.io/pay/INV-2026-001 - Brightloop',
      provider: 'sandbox',
      status: 'Delivered',
      sentAt: '2026-10-30T10:15:00Z',
      deliveredAt: '2026-10-30T10:15:04Z',
      costPaise: 25,
      segmentCount: 1,
      characterCount: 154,
      referenceType: 'invoice',
      referenceId: 'inv_01',
      dltTemplateId: '1407161234567890123'
    },
    {
      id: 'sms_002',
      messageId: 'MSG-SANDBOX-984211',
      to: '+91 98800 23456',
      customerName: 'BlueSky Logistics Ltd',
      customerId: 'cust_02',
      message: 'Hi BlueSky Logistics, gentle reminder: invoice INV-2026-002 for ₹88,500 is pending. Kindly clear outstanding by 2026-11-05. - Brightloop Ops',
      provider: 'sandbox',
      status: 'Delivered',
      sentAt: '2026-10-30T14:20:00Z',
      deliveredAt: '2026-10-30T14:20:03Z',
      costPaise: 25,
      segmentCount: 1,
      characterCount: 146,
      referenceType: 'payment_reminder',
      referenceId: 'inv_02',
      dltTemplateId: '1407161234567890124'
    },
    {
      id: 'sms_003',
      messageId: 'MSG-SANDBOX-984212',
      to: '+91 99000 34567',
      customerName: 'Nexus Cloud Systems',
      customerId: 'cust_03',
      message: 'Nexus Cloud Systems: Payment received ₹1,06,200 for INV-2026-003. Transaction verified. Receipt available in your client portal. - Brightloop',
      provider: 'sandbox',
      status: 'Delivered',
      sentAt: '2026-10-31T06:45:00Z',
      deliveredAt: '2026-10-31T06:45:02Z',
      costPaise: 25,
      segmentCount: 1,
      characterCount: 148,
      referenceType: 'welcome',
      referenceId: 'pay_03',
      dltTemplateId: '1407161234567890125'
    }
  ];

  return {
    users,
    products,
    plans,
    customers,
    staffProfiles,
    quotationTemplates,
    quotations,
    subscriptions,
    invoices,
    creditNotes: [],
    taxRules,
    discountRules,
    payments,
    bankStatementRows,
    billingRuns,
    tasks,
    approvalRequests,
    auditLogs,
    healthIssues,
    automationRules,
    notifications,
    companySettings,
    smsLogs: initialSmsLogs,
    smsConfig: initialSmsConfig
  };
}
