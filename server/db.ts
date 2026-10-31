/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { getInitialSeedData } from './seed.ts';
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

export interface DatabaseSchema {
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
}

class DatabaseManager {
  private dbFilePath: string;
  private data: DatabaseSchema;
  private isPersisting: boolean = false;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbFilePath = path.join(dataDir, 'brightloop_pulse_db.json');
    this.data = this.loadOrSeed();
  }

  private loadOrSeed(): DatabaseSchema {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.products && parsed.subscriptions) {
          const seed = getInitialSeedData();
          if (!parsed.smsLogs) parsed.smsLogs = seed.smsLogs;
          if (!parsed.smsConfig) parsed.smsConfig = seed.smsConfig;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[DB] Failed reading disk DB, falling back to seed data:', e);
    }

    const seed = getInitialSeedData();
    this.persistSync(seed);
    return seed;
  }

  public persist(): void {
    if (this.isPersisting) return;
    this.isPersisting = true;
    setTimeout(() => {
      try {
        fs.writeFileSync(this.dbFilePath, JSON.stringify(this.data, null, 2), 'utf-8');
      } catch (err) {
        console.error('[DB] Failed writing to disk:', err);
      } finally {
        this.isPersisting = false;
      }
    }, 50);
  }

  private persistSync(data: DatabaseSchema): void {
    try {
      fs.writeFileSync(this.dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed writing sync to disk:', err);
    }
  }

  public resetToSeed(): DatabaseSchema {
    this.data = getInitialSeedData();
    this.persistSync(this.data);
    return this.data;
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  public logAudit(actor: string, role: any, action: string, module: string, details: string, recordId?: string): void {
    const entry: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      actor,
      actorRole: role,
      action,
      module,
      recordId,
      details,
    };
    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.persist();
  }
}

export const db = new DatabaseManager();
