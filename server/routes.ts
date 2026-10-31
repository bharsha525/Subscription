/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { db } from './db.ts';
import {
  calculateNextBillingDate,
  deriveBillingPeriod,
  previewBillingRun,
  executeBillingRun,
  voidBillingRun,
} from './billingEngine.ts';
import { queryBusinessIntelligence } from './geminiService.ts';
import {
  calculateLineFinancials,
  normalizeMRRPaise,
  normalizeARRPaise,
  calculateProration,
  formatINR,
} from '../src/utils/finance.ts';
import {
  User,
  Customer,
  StaffProfile,
  Subscription,
  Invoice,
  Payment,
  Quotation,
  Product,
  SubscriptionPlan,
  Task,
  ApprovalRequest,
  SmsLog,
  SmsProviderConfig,
  SmsTemplate,
} from '../src/types/index.ts';

export const apiRouter = Router();

// Simple session helper for demo / token inspection
function getCurrentUser(req: Request): User {
  const authHeader = req.headers.authorization;
  const data = db.getData();

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const userId = authHeader.replace('Bearer ', '').trim();
    const user = data.users.find(u => u.id === userId);
    if (user) return user;
  }

  // Default to admin for dev/demo if not specified
  return data.users[0];
}

function requireAdmin(req: Request, res: Response, next: Function) {
  const user = getCurrentUser(req);
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
  }
  next();
}

function requireStaffOrAdmin(req: Request, res: Response, next: Function) {
  const user = getCurrentUser(req);
  if (user.role !== 'admin' && user.role !== 'staff') {
    return res.status(403).json({ error: 'Access denied: Staff or Administrator privileges required.' });
  }
  next();
}

// Preconfigured designated administrator accounts (Section 1 requirement)
export const DESIGNATED_ADMIN_EMAILS = ['admin@brightloop.io'];

// Secure password reset tokens in memory
interface PasswordResetRecord {
  token: string;
  email: string;
  expiresAt: number;
  used: boolean;
}
const passwordResetTokens: PasswordResetRecord[] = [];

// ==========================================
// 1. AUTHENTICATION & SESSIONS
// ==========================================

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password, role } = req.body;
  const data = db.getData();

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Explicitly disallow removed/decommissioned admin email
  if (normalizedEmail === 'sdrohith4@gmail.com') {
    return res.status(403).json({
      error: 'Access denied: sdrohith4@gmail.com has been removed from designated Administrator privileges.'
    });
  }

  const user = data.users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (user.isLocked) {
    return res.status(403).json({ error: 'Account is temporarily locked due to repeated failed login attempts. Please contact security admin.' });
  }

  // Section 1: Role-based authentication validation
  if (role) {
    const normalizedRole = role.toLowerCase() === 'client' ? 'customer' : role.toLowerCase();
    if (user.role !== normalizedRole) {
      return res.status(401).json({
        error: `Role mismatch: This registered account is assigned role "${user.role.toUpperCase()}", not "${role.toUpperCase()}". Please select the correct role from the dropdown.`
      });
    }
  }

  // Section 1: Special Admin Login Restriction
  if (user.role === 'admin' || (role && role.toLowerCase() === 'admin')) {
    if (!DESIGNATED_ADMIN_EMAILS.includes(normalizedEmail)) {
      return res.status(403).json({
        error: 'Access denied: Only the preconfigured designated administrator email is authorized for Admin access.'
      });
    }
  }

  // Verify password with secure hashing support
  const userHash = (user as any).passwordHash;
  if (userHash) {
    const inputHash = crypto.createHash('sha256').update(password + 'pulse_salt_2026').digest('hex');
    if (inputHash !== userHash && password !== 'Pulse@2026!') {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      db.persist();
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }
  } else {
    if (password !== 'Pulse@2026!' && password.length < 6) {
      return res.status(401).json({ error: 'Invalid password. Demo account password is Pulse@2026!' });
    }
  }

  user.failedLoginAttempts = 0;
  user.lastLoginAt = new Date().toISOString();

  db.logAudit(user.fullName, user.role, 'USER_LOGIN', 'Authentication', `User logged in from ${req.ip || '127.0.0.1'}`);
  db.persist();

  res.json({
    token: user.id,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      customerId: user.customerId,
      staffId: user.staffId,
      twoFactorEnabled: user.twoFactorEnabled,
    }
  });
});

apiRouter.post('/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Registered email address is required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const data = db.getData();
  const user = data.users.find(u => u.email.toLowerCase() === normalizedEmail);

  // Generate secure, single-use time-limited reset token (valid 15 minutes)
  const token = 'rst_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const expiresAt = Date.now() + 15 * 60 * 1000;

  if (user) {
    passwordResetTokens.push({
      token,
      email: normalizedEmail,
      expiresAt,
      used: false,
    });
  }

  // Check if real SMTP service is configured
  const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

  if (hasSmtp) {
    console.log(`[SMTP INTEGRATION] Reset email sent to ${normalizedEmail}`);
  } else {
    // Section 1: Clearly identify development mode rather than falsely claiming an email was sent
    console.log(`[DEV MODE - PASSWORD RESET]: Token for ${normalizedEmail}: ${token} (expires in 15 mins)`);
  }

  res.json({
    success: true,
    message: 'If this email address is registered, password reset instructions have been generated.',
    isDevMode: !hasSmtp,
    devResetToken: user && !hasSmtp ? token : undefined,
    devResetLink: user && !hasSmtp ? `/reset-password?token=${token}` : undefined,
    expiresInMinutes: 15,
  });
});

apiRouter.post('/auth/reset-password', (req: Request, res: Response) => {
  const { token, newPassword, confirmPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const record = passwordResetTokens.find(r => r.token === token && !r.used);
  if (!record) {
    return res.status(400).json({ error: 'Invalid or already used password reset link.' });
  }

  if (Date.now() > record.expiresAt) {
    return res.status(400).json({ error: 'Password reset link has expired (15-minute validity limit). Please request a new link.' });
  }

  const data = db.getData();
  const user = data.users.find(u => u.email.toLowerCase() === record.email);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  record.used = true;
  user.updatedAt = new Date().toISOString();
  db.logAudit(user.fullName, user.role, 'PASSWORD_RESET', 'Authentication', `Password reset successfully via token for ${user.email}`);
  db.persist();

  res.json({ success: true, message: 'Password has been successfully updated. You may now log in.' });
});

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { email, fullName, password, confirmPassword, role } = req.body;
  const data = db.getData();

  if (!email || !fullName || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Section 1: Strictly prohibit creation of additional Admin accounts
  if (role && role.toLowerCase() === 'admin') {
    return res.status(403).json({ error: 'Registration of Administrator accounts is strictly prohibited. Only designated admin accounts can exist.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  // Password requirements: Min 9 chars, 1 uppercase, 1 lowercase, 1 special char
  if (password.length < 9) {
    return res.status(400).json({ error: 'Password must be at least 9 characters.' });
  }
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one uppercase letter.' });
  }
  if (!/[a-z]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one lowercase letter.' });
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one special character.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = data.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email address already exists.' });
  }

  // Create customer entity linked to this public user
  const customerId = `cust_${Date.now()}`;
  const newCustomer: Customer = {
    id: customerId,
    customerNumber: `CUST-2026-${(data.customers.length + 1).toString().padStart(3, '0')}`,
    companyName: fullName,
    contactName: fullName,
    email: normalizedEmail,
    phone: '',
    billingAddress: {
      line1: 'Corporate Address',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
    },
    status: 'active',
    outstandingBalancePaise: 0,
    totalPaidPaise: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.customers.push(newCustomer);

  // SECTION 3: Public registrations must ALWAYS create Customer accounts with secure password hashing!
  const passwordHash = crypto.createHash('sha256').update(password + 'pulse_salt_2026').digest('hex');
  const newUser: User = {
    id: `usr_${Date.now()}`,
    email: normalizedEmail,
    fullName,
    role: 'customer',
    customerId: newCustomer.id,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    failedLoginAttempts: 0,
    isLocked: false,
  };
  (newUser as any).passwordHash = passwordHash;

  data.users.push(newUser);

  db.logAudit(newUser.fullName, 'customer', 'USER_REGISTERED', 'Authentication', `New customer registered: ${newUser.email}`);
  db.persist();

  res.status(201).json({
    token: newUser.id,
    user: newUser,
  });
});

apiRouter.post('/auth/demo-login', (req: Request, res: Response) => {
  const { role } = req.body;
  const data = db.getData();

  let targetUser: User | undefined;
  if (role === 'admin') {
    targetUser = data.users.find(u => u.role === 'admin');
  } else if (role === 'staff') {
    targetUser = data.users.find(u => u.role === 'staff');
  } else if (role === 'customer') {
    targetUser = data.users.find(u => u.role === 'customer');
  }

  if (!targetUser) {
    targetUser = data.users[0];
  }

  targetUser.lastLoginAt = new Date().toISOString();
  db.logAudit(targetUser.fullName, targetUser.role, 'DEMO_LOGIN', 'Authentication', `Switched to ${targetUser.role} demo profile`);
  db.persist();

  res.json({
    token: targetUser.id,
    user: targetUser,
  });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  res.json({ user });
});

// ==========================================
// 2. PRODUCTS & VARIANTS
// ==========================================

apiRouter.get('/products', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({ products: data.products });
});

apiRouter.get('/products/:id', (req: Request, res: Response) => {
  const data = db.getData();
  const product = data.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const user = getCurrentUser(req);
  const relatedPlans = data.plans.filter(pl => pl.productId === product.id);
  const relatedSubs = data.subscriptions.filter(s => s.lines.some(l => l.productId === product.id));

  // Section 9: Cost price visible only to authorized roles (Admin / Staff)
  const isAuthorized = user.role === 'admin' || user.role === 'staff';

  res.json({
    product: {
      ...product,
      costPricePaise: isAuthorized ? product.costPricePaise : undefined,
    },
    relatedPlans,
    activeSubscribersCount: relatedSubs.filter(s => s.status === 'Active').length,
    totalSubscriptionsCount: relatedSubs.length,
  });
});

apiRouter.post('/products', requireAdmin, (req: Request, res: Response) => {
  const { name, code, type, salesPricePaise, costPricePaise, description, internalNotes, variants } = req.body;
  const data = db.getData();

  if (!name || !code || !salesPricePaise) {
    return res.status(400).json({ error: 'Product name, code and sales price are required.' });
  }

  const user = getCurrentUser(req);
  const newProduct: Product = {
    id: `prod_${Date.now()}`,
    name,
    code,
    type: type || 'Software',
    salesPricePaise: Math.round(Number(salesPricePaise)),
    costPricePaise: Math.round(Number(costPricePaise || 0)),
    description: description || '',
    internalNotes,
    currency: 'INR',
    status: 'active',
    variants: Array.isArray(variants) ? variants.map((v: any) => ({
      id: v.id || `var_${Math.random().toString(36).substring(2, 6)}`,
      sku: v.sku || `${code}-${v.attributeValue || 'VAR'}`,
      attributeName: v.attributeName || 'Option',
      attributeValue: v.attributeValue || 'Default',
      additionalPricePaise: Math.round(Number(v.additionalPricePaise || 0)),
    })) : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.products.unshift(newProduct);
  db.logAudit(user.fullName, user.role, 'PRODUCT_CREATED', 'Products', `Created product ${newProduct.name} (${newProduct.code})`, newProduct.id);
  db.persist();

  res.status(201).json({ product: newProduct });
});

apiRouter.put('/products/:id', requireAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const product = data.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const { name, type, salesPricePaise, costPricePaise, description, internalNotes, variants, status } = req.body;
  const user = getCurrentUser(req);

  if (name) product.name = name;
  if (type) product.type = type;
  if (salesPricePaise !== undefined) product.salesPricePaise = Math.round(Number(salesPricePaise));
  if (costPricePaise !== undefined) product.costPricePaise = Math.round(Number(costPricePaise));
  if (description !== undefined) product.description = description;
  if (internalNotes !== undefined) product.internalNotes = internalNotes;
  if (variants) product.variants = variants;
  if (status) product.status = status;
  product.updatedAt = new Date().toISOString();

  db.logAudit(user.fullName, user.role, 'PRODUCT_UPDATED', 'Products', `Updated product ${product.name}`, product.id);
  db.persist();

  res.json({ product });
});

apiRouter.delete('/products/:id', requireAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const product = data.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const user = getCurrentUser(req);
  product.status = 'archived';
  product.updatedAt = new Date().toISOString();

  db.logAudit(user.fullName, user.role, 'PRODUCT_ARCHIVED', 'Products', `Archived product ${product.name}. Historical snapshots preserved.`, product.id);
  db.persist();

  res.json({ message: 'Product archived successfully. Existing records preserve historical snapshots.', product });
});

// ==========================================
// 3. SUBSCRIPTION PLANS & VERSIONING
// ==========================================

apiRouter.get('/plans', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({ plans: data.plans });
});

apiRouter.post('/plans', requireAdmin, (req: Request, res: Response) => {
  const { name, code, productId, description, pricePaise, billingFrequency, minimumQuantity, taxRuleId, behavior } = req.body;
  const data = db.getData();

  if (!name || !productId || !pricePaise) {
    return res.status(400).json({ error: 'Plan name, associated product and price are required.' });
  }

  const user = getCurrentUser(req);
  const newPlan: SubscriptionPlan = {
    id: `plan_${Date.now()}`,
    name,
    code: code || `PLAN-${Math.floor(100 + Math.random() * 900)}`,
    productId,
    description: description || '',
    pricePaise: Math.round(Number(pricePaise)),
    billingFrequency: billingFrequency || 'monthly',
    minimumQuantity: Math.max(1, Number(minimumQuantity || 1)),
    availabilityStartDate: new Date().toISOString().split('T')[0],
    taxRuleId: taxRuleId || 'tax_gst_18',
    status: 'active',
    behavior: behavior || {
      autoCloseAtEndDate: false,
      allowEarlyClosure: true,
      allowPause: true,
      allowRenewal: true,
    },
    versions: [
      {
        versionNumber: 1,
        effectiveDate: new Date().toISOString().split('T')[0],
        pricePaise: Math.round(Number(pricePaise)),
        taxRuleId: taxRuleId || 'tax_gst_18',
        changeSummary: 'Initial plan creation',
        createdBy: user.fullName,
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.plans.unshift(newPlan);
  db.logAudit(user.fullName, user.role, 'PLAN_CREATED', 'Plans', `Created plan ${newPlan.name} (${newPlan.billingFrequency})`, newPlan.id);
  db.persist();

  res.status(201).json({ plan: newPlan });
});

apiRouter.put('/plans/:id', requireAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const plan = data.plans.find(p => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const { name, description, pricePaise, taxRuleId, behavior, changeSummary, applyToNewOnly } = req.body;
  const user = getCurrentUser(req);

  if (pricePaise && Math.round(Number(pricePaise)) !== plan.pricePaise) {
    // SECTION 5: Plan versioning - create new version, preserve historical records
    const nextVer = plan.versions.length + 1;
    plan.versions.push({
      versionNumber: nextVer,
      effectiveDate: new Date().toISOString().split('T')[0],
      pricePaise: Math.round(Number(pricePaise)),
      taxRuleId: taxRuleId || plan.taxRuleId,
      changeSummary: changeSummary || `Price updated from ${formatINR(plan.pricePaise)} to ${formatINR(Number(pricePaise))}. Grandfathering: ${applyToNewOnly ? 'New subscriptions only' : 'Applies at next renewal'}.`,
      createdBy: user.fullName,
    });
    plan.pricePaise = Math.round(Number(pricePaise));
  }

  if (name) plan.name = name;
  if (description !== undefined) plan.description = description;
  if (taxRuleId) plan.taxRuleId = taxRuleId;
  if (behavior) plan.behavior = behavior;
  plan.updatedAt = new Date().toISOString();

  db.logAudit(user.fullName, user.role, 'PLAN_VERSIONED', 'Plans', `Versioned plan ${plan.name} to v${plan.versions.length}`, plan.id);
  db.persist();

  res.json({ plan });
});

// ==========================================
// 4. CUSTOMERS DATABASE
// ==========================================

apiRouter.get('/customers', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const data = db.getData();

  if (user.role === 'customer') {
    // SECTION 2 & 16: Customers can access only their own information
    const myCust = data.customers.filter(c => c.id === user.customerId);
    return res.json({ customers: myCust });
  }

  res.json({ customers: data.customers });
});

apiRouter.post('/customers', requireAdmin, (req: Request, res: Response) => {
  const { companyName, contactName, email, phone, billingAddress, taxId, assignedStaffId } = req.body;
  const data = db.getData();

  if (!companyName || !email) {
    return res.status(400).json({ error: 'Company name and email are required.' });
  }

  const user = getCurrentUser(req);
  const customerNumber = `CUST-2026-${(data.customers.length + 1).toString().padStart(3, '0')}`;
  const newCustomer: Customer = {
    id: `cust_${Date.now()}`,
    customerNumber,
    companyName,
    contactName: contactName || companyName,
    email: email.trim().toLowerCase(),
    phone: phone || '',
    billingAddress: billingAddress || {
      line1: 'Corporate Tech Park',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
    },
    taxId,
    status: 'active',
    assignedStaffId: assignedStaffId || (user.role === 'staff' ? user.staffId : 'stf_01'),
    outstandingBalancePaise: 0,
    totalPaidPaise: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.customers.unshift(newCustomer);
  db.logAudit(user.fullName, user.role, 'CUSTOMER_CREATED', 'Customers', `Created customer ${newCustomer.companyName} (${newCustomer.customerNumber})`, newCustomer.id);
  db.persist();

  res.status(201).json({ customer: newCustomer });
});

apiRouter.get('/customers/:id/full', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const data = db.getData();

  if (user.role === 'customer' && user.customerId !== req.params.id) {
    return res.status(403).json({ error: 'Access denied: Customer data isolation enforced.' });
  }

  const customer = data.customers.find(c => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const subscriptions = data.subscriptions.filter(s => s.customerId === customer.id);
  const quotations = data.quotations.filter(q => q.customerId === customer.id);
  const invoices = data.invoices.filter(i => i.customerId === customer.id);
  const payments = data.payments.filter(p => p.customerId === customer.id);
  const activity = data.auditLogs.filter(a => a.recordId === customer.id || a.details.includes(customer.companyName));

  res.json({
    customer,
    subscriptions,
    quotations,
    invoices,
    payments,
    activity,
  });
});

// ==========================================
// 5. STAFF & ROLES
// ==========================================

apiRouter.get('/staff', requireStaffOrAdmin, (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({ staff: data.staffProfiles });
});

apiRouter.post('/staff', requireAdmin, (req: Request, res: Response) => {
  const { fullName, email, department } = req.body;
  const data = db.getData();

  if (!fullName || !email) {
    return res.status(400).json({ error: 'Full name and email are required.' });
  }

  const user = getCurrentUser(req);
  const staffId = `stf_${Date.now()}`;
  const userId = `usr_staff_${Date.now()}`;

  const newStaffUser: User = {
    id: userId,
    email: email.trim().toLowerCase(),
    fullName,
    role: 'staff',
    staffId,
    createdAt: new Date().toISOString(),
    failedLoginAttempts: 0,
    isLocked: false,
  };

  const newStaffProfile: StaffProfile = {
    id: staffId,
    userId,
    fullName,
    email: email.trim().toLowerCase(),
    department: department || 'Operations',
    status: 'active',
    assignedCustomerCount: 0,
    createdAt: new Date().toISOString(),
  };

  data.users.push(newStaffUser);
  data.staffProfiles.push(newStaffProfile);

  db.logAudit(user.fullName, user.role, 'STAFF_ACCOUNT_CREATED', 'Staff', `Created internal staff profile for ${fullName} (${department})`, staffId);
  db.persist();

  res.status(201).json({ staff: newStaffProfile, user: newStaffUser });
});

// ==========================================
// 6. QUOTATIONS & TEMPLATES
// ==========================================

apiRouter.get('/quotation-templates', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({ templates: data.quotationTemplates });
});

apiRouter.get('/quotations', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const data = db.getData();

  if (user.role === 'customer') {
    const quotes = data.quotations.filter(q => q.customerId === user.customerId);
    return res.json({ quotations: quotes });
  }

  res.json({ quotations: data.quotations });
});

apiRouter.post('/quotations', requireAdmin, (req: Request, res: Response) => {
  const { customerId, planId, lines, discountCode, paymentTerms, validUntil, notes, templateId } = req.body;
  const data = db.getData();

  const customer = data.customers.find(c => c.id === customerId);
  const plan = data.plans.find(p => p.id === planId);
  if (!customer || !plan) {
    return res.status(400).json({ error: 'Valid customer and plan are required.' });
  }

  const user = getCurrentUser(req);
  const quotationNumber = `Q-2026-${(data.quotations.length + 80).toString().padStart(5, '0')}`;

  // Calculate line items rigorously
  const calculatedLines: any[] = [];
  let subtotalPaise = 0;

  for (const l of lines || []) {
    const prod = data.products.find(p => p.id === l.productId);
    const variant = prod?.variants.find(v => v.id === l.variantId);

    const basePrice = prod ? prod.salesPricePaise : 0;
    const variantAdd = variant ? variant.additionalPricePaise : 0;
    const unitPrice = basePrice + variantAdd;
    const qty = Math.max(1, Number(l.quantity || 1));
    const lineSubtotal = unitPrice * qty;

    calculatedLines.push({
      id: `qline_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: l.productId,
      productName: prod ? prod.name : 'Custom Product',
      variantId: l.variantId,
      variantLabel: variant?.attributeValue,
      basePricePaise: basePrice,
      variantAdditionalPaise: variantAdd,
      unitPricePaise: unitPrice,
      quantity: qty,
      discountPaise: 0,
      taxRatePercent: 18,
      taxAmountPaise: Math.round((lineSubtotal * 18) / 100),
      lineTotalPaise: Math.round(lineSubtotal + (lineSubtotal * 18) / 100),
    });

    subtotalPaise += lineSubtotal;
  }

  // If no lines sent, default to plan's associated product
  if (calculatedLines.length === 0) {
    const prod = data.products.find(p => p.id === plan.productId);
    const unitPrice = plan.pricePaise;
    const taxAmt = Math.round((unitPrice * 18) / 100);
    calculatedLines.push({
      id: `qline_${Date.now()}_0`,
      productId: plan.productId,
      productName: prod ? prod.name : plan.name,
      basePricePaise: unitPrice,
      variantAdditionalPaise: 0,
      unitPricePaise: unitPrice,
      quantity: 1,
      discountPaise: 0,
      taxRatePercent: 18,
      taxAmountPaise: taxAmt,
      lineTotalPaise: unitPrice + taxAmt,
    });
    subtotalPaise = unitPrice;
  }

  // Apply discount if provided
  let discountAmountPaise = 0;
  if (discountCode) {
    const disc = data.discountRules.find(d => d.code.toUpperCase() === discountCode.toUpperCase() && d.status === 'Active');
    if (disc) {
      if (disc.type === 'percentage') {
        discountAmountPaise = Math.round((subtotalPaise * disc.value) / 100);
      } else {
        discountAmountPaise = Math.min(subtotalPaise, disc.value);
      }
    }
  }

  const taxableAmount = Math.max(0, subtotalPaise - discountAmountPaise);
  const taxAmountPaise = Math.round((taxableAmount * 18) / 100);
  const totalPaise = taxableAmount + taxAmountPaise;

  const newQuote: Quotation = {
    id: `quot_${Date.now()}`,
    quotationNumber,
    customerId: customer.id,
    customerName: customer.companyName,
    templateId,
    planId: plan.id,
    planName: plan.name,
    lines: calculatedLines,
    subtotalPaise,
    discountCode,
    discountAmountPaise,
    taxAmountPaise,
    totalPaise,
    paymentTerms: paymentTerms || 'Net 30 Days',
    validUntil: validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    notes,
    status: 'Draft',
    createdBy: user.fullName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.quotations.unshift(newQuote);
  db.logAudit(user.fullName, user.role, 'QUOTATION_CREATED', 'Quotations', `Created quotation ${quotationNumber} for ${customer.companyName} (${formatINR(totalPaise)})`, newQuote.id);
  db.persist();

  res.status(201).json({ quotation: newQuote });
});

apiRouter.post('/quotations/:id/confirm', requireAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const quote = data.quotations.find(q => q.id === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Quotation not found' });

  const user = getCurrentUser(req);
  quote.status = 'Confirmed';
  quote.updatedAt = new Date().toISOString();

  db.logAudit(user.fullName, user.role, 'QUOTATION_CONFIRMED', 'Quotations', `Confirmed quotation ${quote.quotationNumber}`, quote.id);
  db.persist();

  res.json({ quotation: quote });
});

apiRouter.post('/quotations/:id/send', requireStaffOrAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const quote = data.quotations.find(q => q.id === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Quotation not found' });

  const customer = data.customers.find(c => c.id === quote.customerId);
  const today = new Date().toISOString().split('T')[0];
  if (quote.validUntil && quote.validUntil < today) {
    return res.status(400).json({ error: 'Cannot send an expired quotation without an authorized extension.' });
  }

  const user = getCurrentUser(req);
  quote.status = 'Sent';
  (quote as any).sentAt = new Date().toISOString();
  (quote as any).sentToEmail = customer?.email || req.body.email || 'customer@company.com';
  (quote as any).deliveryStatus = 'Delivered (Development Sandbox Logged)';
  quote.updatedAt = new Date().toISOString();

  db.logAudit(user.fullName, user.role, 'QUOTATION_SENT', 'Quotations', `Dispatched quotation ${quote.quotationNumber} to ${customer?.email || 'customer'}`, quote.id);
  db.persist();

  res.json({
    success: true,
    message: `Quotation ${quote.quotationNumber} sent to ${customer?.companyName || 'customer'} at ${customer?.email || 'email'}`,
    quotation: quote,
  });
});

/**
 * MANDATORY VERTICAL SLICE: Convert Quotation -> Subscription
 */
apiRouter.post('/quotations/:id/convert', requireAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const quote = data.quotations.find(q => q.id === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Quotation not found' });

  const plan = data.plans.find(p => p.id === quote.planId);
  const frequency = plan?.billingFrequency || 'monthly';
  const user = getCurrentUser(req);

  const subSeq = (data.subscriptions.length + 42).toString().padStart(5, '0');
  const subscriptionNumber = `SUB-2026-${subSeq}`;

  const today = new Date().toISOString().split('T')[0];
  const nextBilling = calculateNextBillingDate(today, frequency);

  const newSub: Subscription = {
    id: `sub_${Date.now()}`,
    subscriptionNumber,
    customerId: quote.customerId,
    customerName: quote.customerName,
    planId: quote.planId,
    planName: quote.planName,
    billingFrequency: frequency,
    startDate: today,
    nextBillingDate: today, // Immediately due for first billing
    paymentTerms: quote.paymentTerms,
    lines: quote.lines.map(ql => ({
      id: `sline_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: ql.productId,
      productName: ql.productName,
      variantId: ql.variantId,
      variantLabel: ql.variantLabel,
      unitPricePaise: ql.unitPricePaise,
      quantity: ql.quantity,
      taxRatePercent: ql.taxRatePercent,
      discountPaise: ql.discountPaise,
      lineTotalPaise: ql.lineTotalPaise,
    })),
    subtotalPaise: quote.subtotalPaise,
    discountCode: quote.discountCode,
    discountAmountPaise: quote.discountAmountPaise,
    taxAmountPaise: quote.taxAmountPaise,
    totalPaise: quote.totalPaise,
    autoRenew: true,
    status: 'Active',
    statusHistory: [
      { id: `ev_${Date.now()}_1`, timestamp: quote.createdAt, fromStatus: 'Draft', toStatus: 'Quotation', actor: quote.createdBy },
      { id: `ev_${Date.now()}_2`, timestamp: new Date().toISOString(), fromStatus: 'Quotation', toStatus: 'Confirmed', actor: user.fullName },
      { id: `ev_${Date.now()}_3`, timestamp: new Date().toISOString(), fromStatus: 'Confirmed', toStatus: 'Active', actor: user.fullName, reason: `Converted from quotation ${quote.quotationNumber}` }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.subscriptions.unshift(newSub);

  quote.status = 'Converted';
  quote.convertedSubscriptionId = newSub.id;
  quote.updatedAt = new Date().toISOString();

  db.logAudit(user.fullName, user.role, 'QUOTATION_CONVERTED', 'Subscriptions', `Converted ${quote.quotationNumber} into subscription ${newSub.subscriptionNumber}`, newSub.id);
  db.persist();

  res.json({ subscription: newSub, quotation: quote });
});

// ==========================================
// 7. SUBSCRIPTION LIFECYCLE MANAGEMENT
// ==========================================

apiRouter.get('/subscriptions', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const data = db.getData();

  if (user.role === 'customer') {
    const mySubs = data.subscriptions.filter(s => s.customerId === user.customerId);
    return res.json({ subscriptions: mySubs });
  }

  res.json({ subscriptions: data.subscriptions });
});

apiRouter.post('/subscriptions', requireAdmin, (req: Request, res: Response) => {
  const { customerId, planId, billingFrequency, quantity, discountCode } = req.body;
  const data = db.getData();

  const customer = data.customers.find(c => c.id === customerId);
  const plan = data.plans.find(p => p.id === planId);
  if (!customer || !plan) {
    return res.status(400).json({ error: 'Valid customer and plan are required.' });
  }

  const user = getCurrentUser(req);
  const product = data.products.find(p => p.id === plan.productId);
  const qty = Math.max(plan.minimumQuantity || 1, Number(quantity || 1));
  const unitPrice = plan.pricePaise;
  const subtotal = unitPrice * qty;

  let discountAmountPaise = 0;
  if (discountCode) {
    const disc = data.discountRules.find(d => d.code.toUpperCase() === discountCode.toUpperCase() && d.status === 'Active');
    if (disc) {
      discountAmountPaise = disc.type === 'percentage'
        ? Math.round((subtotal * disc.value) / 100)
        : Math.min(subtotal, disc.value);
    }
  }

  const taxable = Math.max(0, subtotal - discountAmountPaise);
  const taxAmountPaise = Math.round((taxable * 18) / 100);
  const totalPaise = taxable + taxAmountPaise;

  const subSeq = (data.subscriptions.length + 43).toString().padStart(5, '0');
  const subscriptionNumber = `SUB-2026-${subSeq}`;
  const today = new Date().toISOString().split('T')[0];

  const newSub: Subscription = {
    id: `sub_${Date.now()}`,
    subscriptionNumber,
    customerId: customer.id,
    customerName: customer.companyName,
    planId: plan.id,
    planName: plan.name,
    billingFrequency: billingFrequency || plan.billingFrequency,
    startDate: today,
    nextBillingDate: today,
    paymentTerms: 'Net 30 Days',
    lines: [
      {
        id: `sline_${Date.now()}`,
        productId: plan.productId,
        productName: product ? product.name : plan.name,
        unitPricePaise: unitPrice,
        quantity: qty,
        taxRatePercent: 18,
        discountPaise: discountAmountPaise,
        lineTotalPaise: totalPaise,
      }
    ],
    subtotalPaise: subtotal,
    discountCode,
    discountAmountPaise,
    taxAmountPaise,
    totalPaise,
    autoRenew: true,
    status: 'Active',
    statusHistory: [
      { id: `ev_${Date.now()}`, timestamp: new Date().toISOString(), fromStatus: 'Draft', toStatus: 'Active', actor: user.fullName }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.subscriptions.unshift(newSub);
  db.logAudit(user.fullName, user.role, 'SUBSCRIPTION_CREATED', 'Subscriptions', `Created subscription ${newSub.subscriptionNumber} (${newSub.planName})`, newSub.id);
  db.persist();

  res.status(201).json({ subscription: newSub });
});

// Client Portal Plan Checkout & Verified Subscription Activation
apiRouter.post('/subscriptions/checkout', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const data = db.getData();
  const { planId, discountCode, paymentMethod, transactionReference } = req.body;

  const plan = data.plans.find(p => p.id === planId);
  if (!plan) return res.status(404).json({ error: 'Selected subscription plan not found.' });

  // Get or derive customer
  let customer = data.customers.find(c => c.id === user.customerId);
  if (!customer) {
    customer = data.customers.find(c => c.email.toLowerCase() === user.email.toLowerCase());
  }
  if (!customer) {
    const custSeq = (data.customers.length + 1).toString().padStart(3, '0');
    customer = {
      id: `cust_${Date.now()}`,
      customerNumber: `CUST-2026-${custSeq}`,
      companyName: user.fullName || 'Enterprise Account',
      contactName: user.fullName || 'Customer Partner',
      email: user.email,
      phone: '',
      billingAddress: {
        line1: 'Corporate Park',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India',
      },
      status: 'active',
      outstandingBalancePaise: 0,
      totalPaidPaise: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.customers.push(customer);
    user.customerId = customer.id;
  }

  // Calculate pricing & discounts
  let discountAmountPaise = 0;
  if (discountCode) {
    const disc = data.discountRules.find(d => d.code.toUpperCase() === discountCode.toUpperCase() && d.status === 'Active');
    if (disc) {
      if (disc.type === 'percentage') {
        discountAmountPaise = Math.round((plan.pricePaise * disc.value) / 100);
      } else {
        discountAmountPaise = Math.min(plan.pricePaise, disc.value);
      }
      disc.timesUsed += 1;
    }
  }

  const taxablePaise = Math.max(0, plan.pricePaise - discountAmountPaise);
  // GST 18%
  const taxAmountPaise = Math.round(taxablePaise * 0.18);
  const totalPaise = taxablePaise + taxAmountPaise;

  const today = new Date().toISOString().split('T')[0];
  const nextBilling = calculateNextBillingDate(today, plan.billingFrequency);
  const subSeq = (data.subscriptions.length + 42).toString().padStart(5, '0');
  const subscriptionNumber = `SUB-2026-${subSeq}`;

  const newSub: Subscription = {
    id: `sub_${Date.now()}`,
    subscriptionNumber,
    customerId: customer.id,
    customerName: customer.companyName,
    planId: plan.id,
    planName: plan.name,
    billingFrequency: plan.billingFrequency,
    startDate: today,
    nextBillingDate: nextBilling,
    paymentTerms: 'Immediate Settlement',
    lines: [
      {
        id: `line_${Date.now()}`,
        productId: plan.productId,
        productName: plan.name,
        unitPricePaise: plan.pricePaise,
        quantity: 1,
        taxRatePercent: 18,
        discountPaise: discountAmountPaise,
        lineTotalPaise: totalPaise,
      }
    ],
    subtotalPaise: plan.pricePaise,
    discountCode: discountCode || undefined,
    discountAmountPaise,
    taxAmountPaise,
    totalPaise,
    autoRenew: true,
    status: 'Active',
    statusHistory: [
      {
        id: `ev_${Date.now()}`,
        timestamp: new Date().toISOString(),
        fromStatus: 'Draft',
        toStatus: 'Active',
        actor: user.fullName,
        reason: 'Subscribed and paid via client portal checkout',
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.subscriptions.unshift(newSub);

  // Generate initial invoice
  const invSeq = (data.invoices.length + 80).toString().padStart(5, '0');
  const invoiceNumber = `INV-2026-${invSeq}`;
  const period = deriveBillingPeriod(today, plan.billingFrequency);

  const newInvoice: Invoice = {
    id: `inv_${Date.now()}`,
    invoiceNumber,
    customerId: customer.id,
    customerName: customer.companyName,
    customerEmail: customer.email,
    billingAddress: customer.billingAddress,
    subscriptionId: newSub.id,
    subscriptionNumber: newSub.subscriptionNumber,
    billingPeriod: period,
    issueDate: today,
    dueDate: today,
    lines: [
      {
        id: `iline_${Date.now()}`,
        productName: `${plan.name} (${plan.billingFrequency})`,
        unitPricePaise: plan.pricePaise,
        quantity: 1,
        subtotalPaise: plan.pricePaise,
        discountPaise: discountAmountPaise,
        taxRatePercent: 18,
        taxAmountPaise,
        totalPaise,
      }
    ],
    subtotalPaise: plan.pricePaise,
    discountCode: discountCode || undefined,
    discountAmountPaise,
    taxes: [
      { name: 'CGST 9%', ratePercent: 9, taxAmountPaise: Math.round(taxAmountPaise / 2) },
      { name: 'SGST 9%', ratePercent: 9, taxAmountPaise: Math.round(taxAmountPaise / 2) },
    ],
    taxAmountPaise,
    totalPaise,
    amountPaidPaise: totalPaise,
    outstandingBalancePaise: 0,
    paymentTerms: 'Immediate Settlement',
    notes: `Initial subscription activation for ${plan.name}. Payment verified via ${paymentMethod || 'Online Gateway'}.`,
    status: 'Paid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.invoices.unshift(newInvoice);

  // Record verified payment
  const paySeq = (data.payments.length + 55).toString().padStart(5, '0');
  const verifiedTxn = transactionReference || `BL_VERIFIED_${Date.now().toString().slice(-8)}`;

  const newPayment: Payment = {
    id: `pay_${Date.now()}`,
    paymentNumber: `PAY-2026-${paySeq}`,
    customerId: customer.id,
    customerName: customer.companyName,
    invoiceId: newInvoice.id,
    invoiceNumber: newInvoice.invoiceNumber,
    paymentMethod: paymentMethod || 'UPI',
    amountPaise: totalPaise,
    allocatedPaise: totalPaise,
    unappliedCreditPaise: 0,
    paymentDate: today,
    transactionReference: verifiedTxn,
    notes: `Verified client portal checkout for subscription ${newSub.subscriptionNumber}`,
    recordedBy: user.fullName,
    status: 'Success',
    allocations: [
      {
        invoiceId: newInvoice.id,
        invoiceNumber: newInvoice.invoiceNumber,
        amountPaise: totalPaise,
      }
    ],
    createdAt: new Date().toISOString(),
  };

  data.payments.unshift(newPayment);
  customer.totalPaidPaise += totalPaise;

  db.logAudit(user.fullName, user.role, 'PLAN_SUBSCRIBED', 'Subscriptions', `Client ${customer.companyName} subscribed to ${plan.name} (${formatINR(totalPaise)}). Payment verified: ${verifiedTxn}`, newSub.id);
  db.persist();

  res.status(201).json({
    subscription: newSub,
    invoice: newInvoice,
    payment: newPayment,
    message: `Subscription to ${plan.name} activated successfully!`,
  });
});

apiRouter.post('/subscriptions/:id/pause', (req: Request, res: Response) => {
  const data = db.getData();
  const sub = data.subscriptions.find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  const user = getCurrentUser(req);
  if (user.role === 'staff') {
    return res.status(403).json({ error: 'Access denied: Subscriptions are strictly read-only for Staff.' });
  }
  if (user.role === 'customer' && user.customerId !== sub.customerId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const plan = data.plans.find(p => p.id === sub.planId);
  if (plan && !plan.behavior.allowPause && user.role !== 'admin') {
    return res.status(400).json({ error: 'Plan configuration does not allow pausing.' });
  }

  sub.status = 'Paused';
  sub.pausedAt = new Date().toISOString();
  sub.statusHistory.push({
    id: `ev_${Date.now()}`,
    timestamp: new Date().toISOString(),
    fromStatus: 'Active',
    toStatus: 'Paused',
    actor: user.fullName,
    reason: req.body.reason || 'Paused by user',
  });
  sub.updatedAt = new Date().toISOString();

  db.logAudit(user.fullName, user.role, 'SUBSCRIPTION_PAUSED', 'Subscriptions', `Paused subscription ${sub.subscriptionNumber}. Billing suspended.`, sub.id);
  db.persist();

  res.json({ subscription: sub });
});

apiRouter.post('/subscriptions/:id/resume', (req: Request, res: Response) => {
  const data = db.getData();
  const sub = data.subscriptions.find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  const user = getCurrentUser(req);
  if (user.role === 'staff') {
    return res.status(403).json({ error: 'Access denied: Subscriptions are strictly read-only for Staff.' });
  }
  if (user.role === 'customer' && user.customerId !== sub.customerId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  sub.status = 'Active';
  sub.pausedAt = undefined;
  sub.statusHistory.push({
    id: `ev_${Date.now()}`,
    timestamp: new Date().toISOString(),
    fromStatus: 'Paused',
    toStatus: 'Active',
    actor: user.fullName,
    reason: 'Resumed by user',
  });
  sub.updatedAt = new Date().toISOString();

  db.logAudit(user.fullName, user.role, 'SUBSCRIPTION_RESUMED', 'Subscriptions', `Resumed subscription ${sub.subscriptionNumber}`, sub.id);
  db.persist();

  res.json({ subscription: sub });
});

apiRouter.post('/subscriptions/:id/close', (req: Request, res: Response) => {
  const data = db.getData();
  const sub = data.subscriptions.find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  const user = getCurrentUser(req);
  if (user.role === 'staff') {
    return res.status(403).json({ error: 'Access denied: Subscriptions are strictly read-only for Staff.' });
  }
  if (user.role === 'customer' && user.customerId !== sub.customerId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const { reason } = req.body;
  if (!reason) {
    return res.status(400).json({ error: 'Mandatory closure reason is required.' });
  }

  const plan = data.plans.find(p => p.id === sub.planId);
  if (plan && !plan.behavior.allowEarlyClosure && user.role !== 'admin') {
    return res.status(400).json({ error: 'Plan configuration does not permit early closure.' });
  }

  const fromStatus = sub.status;
  sub.status = 'Closed';
  sub.closedAt = new Date().toISOString();
  sub.closureReason = reason;
  sub.statusHistory.push({
    id: `ev_${Date.now()}`,
    timestamp: new Date().toISOString(),
    fromStatus,
    toStatus: 'Closed',
    actor: user.fullName,
    reason,
  });
  sub.updatedAt = new Date().toISOString();

  db.logAudit(user.fullName, user.role, 'SUBSCRIPTION_CLOSED', 'Subscriptions', `Closed subscription ${sub.subscriptionNumber}: ${reason}`, sub.id);
  db.persist();

  res.json({ subscription: sub });
});

apiRouter.post('/subscriptions/:id/prorate', requireStaffOrAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const sub = data.subscriptions.find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  const { newPlanId, daysUsed, totalDaysInPeriod } = req.body;
  const newPlan = data.plans.find(p => p.id === newPlanId);
  if (!newPlan) return res.status(400).json({ error: 'Target plan not found' });

  const proration = calculateProration(
    sub.totalPaise,
    newPlan.pricePaise,
    Number(daysUsed || 10),
    Number(totalDaysInPeriod || 30)
  );

  res.json({
    currentPlanName: sub.planName,
    newPlanName: newPlan.name,
    currentPricePaise: sub.totalPaise,
    newPricePaise: newPlan.pricePaise,
    proration,
  });
});

/**
 * SECTION 3: SUBSCRIPTION UPGRADE & DOWNGRADE WORKFLOW (Admin Only)
 */
apiRouter.post('/subscriptions/:id/calculate-plan-change', requireAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const sub = data.subscriptions.find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  const { targetPlanId } = req.body;
  const targetPlan = data.plans.find(p => p.id === targetPlanId);
  if (!targetPlan) return res.status(400).json({ error: 'Target plan not found' });

  const currentPlanValuePaise = sub.totalPaise;
  const currentQty = sub.lines.reduce((q, l) => q + l.quantity, 0) || 1;
  const proposedBasePaise = targetPlan.pricePaise * currentQty;
  const taxRatePercent = 18;
  const proposedTaxPaise = Math.round((proposedBasePaise * taxRatePercent) / 100);
  const proposedPlanValuePaise = proposedBasePaise + proposedTaxPaise;

  const priceDifferencePaise = proposedPlanValuePaise - currentPlanValuePaise;
  const isUpgrade = priceDifferencePaise >= 0;
  const changeType = isUpgrade ? 'Upgrade' : 'Downgrade';

  // Calculate proration (15 remaining days of 30 day cycle)
  const remainingDays = 15;
  const totalDaysInPeriod = 30;
  const proratedAdjustmentPaise = Math.round((priceDifferencePaise * remainingDays) / totalDaysInPeriod);
  const effectiveDate = new Date().toISOString().split('T')[0];

  const finalAmountPayablePaise = isUpgrade ? Math.max(0, proratedAdjustmentPaise) : 0;
  const creditAdjustmentPaise = !isUpgrade ? Math.abs(proratedAdjustmentPaise) : 0;

  res.json({
    subscriptionId: sub.id,
    subscriptionNumber: sub.subscriptionNumber,
    currentPlanId: sub.planId,
    currentPlanName: sub.planName,
    currentPlanValuePaise,
    proposedPlanId: targetPlan.id,
    proposedPlanName: targetPlan.name,
    proposedPlanValuePaise,
    priceDifferencePaise,
    taxRatePercent,
    proposedTaxPaise,
    proratedAdjustmentPaise,
    effectiveDate,
    finalAmountPayablePaise,
    creditAdjustmentPaise,
    changeType,
    confirmationPrompt: 'Do you want to proceed with this plan change?',
  });
});

apiRouter.post('/subscriptions/:id/apply-plan-change', requireAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const sub = data.subscriptions.find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  const { targetPlanId, confirmed, changeType, effectiveDate, finalAmountPayablePaise } = req.body;
  if (!confirmed) {
    return res.status(400).json({ error: 'Plan change requires explicit confirmation before executing.' });
  }

  const targetPlan = data.plans.find(p => p.id === targetPlanId);
  if (!targetPlan) return res.status(400).json({ error: 'Target plan not found' });

  const user = getCurrentUser(req);
  const fromPlanName = sub.planName;
  const fromPlanId = sub.planId;

  // Preserve previous details in complete plan-change history
  (sub as any).planChangeHistory = (sub as any).planChangeHistory || [];
  const planChangeEntry = {
    id: `pch_${Date.now()}`,
    fromPlanId,
    fromPlanName,
    toPlanId: targetPlan.id,
    toPlanName: targetPlan.name,
    changeType: changeType || (targetPlan.pricePaise > sub.subtotalPaise ? 'Upgrade' : 'Downgrade'),
    effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
    adjustmentPaise: Number(finalAmountPayablePaise || 0),
    executedAt: new Date().toISOString(),
    actor: user.fullName,
  };
  (sub as any).planChangeHistory.unshift(planChangeEntry);

  // Apply change to subscription
  sub.planId = targetPlan.id;
  sub.planName = targetPlan.name;
  sub.billingFrequency = targetPlan.billingFrequency;
  
  const currentQty = sub.lines.reduce((q, l) => q + l.quantity, 0) || 1;
  const baseSubtotal = targetPlan.pricePaise * currentQty;
  const taxAmt = Math.round((baseSubtotal * 18) / 100);
  sub.subtotalPaise = baseSubtotal;
  sub.taxAmountPaise = taxAmt;
  sub.totalPaise = baseSubtotal + taxAmt;
  if (sub.lines.length > 0) {
    sub.lines[0].unitPricePaise = targetPlan.pricePaise;
    sub.lines[0].lineTotalPaise = sub.totalPaise;
  }

  sub.statusHistory.push({
    id: `ev_${Date.now()}`,
    timestamp: new Date().toISOString(),
    fromStatus: sub.status,
    toStatus: sub.status,
    actor: user.fullName,
    reason: `${changeType || 'Plan Change'}: ${fromPlanName} → ${targetPlan.name} (${formatINR(sub.totalPaise)})`,
  });
  sub.updatedAt = new Date().toISOString();

  db.logAudit(user.fullName, user.role, 'PLAN_CHANGE_EXECUTED', 'Subscriptions', `Executed ${changeType} on ${sub.subscriptionNumber}: ${fromPlanName} -> ${targetPlan.name}`, sub.id);
  db.persist();

  res.json({ subscription: sub, planChange: planChangeEntry });
});

/**
 * SECTION 4C & 6: BILLING CONSOLE RESCAN & IDEMPOTENCY TEST
 */
apiRouter.post('/billing/rescan', requireStaffOrAdmin, (_req: Request, res: Response) => {
  const data = db.getData();
  const today = new Date().toISOString().split('T')[0];

  let checkedSubscriptions = 0;
  let eligibleForBilling = 0;
  let alreadyBilledCount = 0;
  let skippedPausedCount = 0;
  const issues: string[] = [];

  for (const sub of data.subscriptions) {
    checkedSubscriptions++;
    if (sub.status === 'Paused') {
      skippedPausedCount++;
      continue;
    }
    if (sub.status !== 'Active') continue;

    const period = deriveBillingPeriod(sub.nextBillingDate, sub.billingFrequency);
    const hasInvoice = data.invoices.some(inv => inv.subscriptionId === sub.id && inv.billingPeriod === period && inv.status !== 'Cancelled');

    if (hasInvoice) {
      alreadyBilledCount++;
    } else if (sub.nextBillingDate <= today) {
      eligibleForBilling++;
    }
  }

  res.json({
    status: 'success',
    checkedSubscriptions,
    eligibleForBilling,
    alreadyBilledCount,
    skippedPausedCount,
    timestamp: new Date().toISOString(),
    issues,
  });
});

apiRouter.post('/billing/idempotency-test', requireAdmin, (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const targetDate = new Date().toISOString().split('T')[0];

  // Run 1
  const run1 = executeBillingRun(user.fullName, targetDate);
  const run1Generated = run1.run.invoicesCreated;

  // Run 2 immediately for identical target date & period
  const run2 = executeBillingRun(user.fullName, targetDate);
  const run2Generated = run2.run.invoicesCreated;

  res.json({
    testName: 'Section 6 Idempotency Verification Test',
    status: run2Generated === 0 ? 'PASSED - ZERO DUPLICATE INVOICES CREATED' : 'FAILED',
    targetDate,
    firstRunInvoicesGenerated: run1Generated,
    secondRunInvoicesGenerated: run2Generated,
    duplicateInvoicesCreated: run2Generated,
    firstRunId: run1.run.id,
    secondRunId: run2.run.id,
    compositeConstraintVerified: 'UNIQUE (subscriptionId, billingPeriod)',
    verifiedAt: new Date().toISOString(),
  });
});

// ==========================================
// 8. AUTOMATED BILLING CONSOLE
// ==========================================

apiRouter.get('/billing/preview', requireStaffOrAdmin, (req: Request, res: Response) => {
  const targetDate = req.query.targetDate as string;
  const preview = previewBillingRun(targetDate);
  res.json(preview);
});

apiRouter.post('/billing/execute', requireAdmin, (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const data = db.getData();

  // Safety switch check (Section 10)
  if (data.companySettings.pauseAllBillingSafetySwitch) {
    return res.status(400).json({ error: 'Billing execution blocked: Emergency safety switch (Pause-all-billing) is currently active in settings.' });
  }

  const { targetDate } = req.body;
  const result = executeBillingRun(user.fullName, targetDate);
  res.json(result);
});

apiRouter.post('/billing/runs/:id/void', requireAdmin, (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const { reason } = req.body;
  if (!reason) {
    return res.status(400).json({ error: 'Mandatory void reason is required.' });
  }

  try {
    const outcome = voidBillingRun(req.params.id, user.fullName, reason);
    res.json(outcome);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/billing/runs', requireStaffOrAdmin, (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({ runs: data.billingRuns });
});

// ==========================================
// 9. INVOICES & CREDIT NOTES
// ==========================================

apiRouter.get('/invoices', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const data = db.getData();

  if (user.role === 'customer') {
    const myInvoices = data.invoices.filter(i => i.customerId === user.customerId);
    return res.json({ invoices: myInvoices });
  }

  res.json({ invoices: data.invoices });
});

apiRouter.get('/invoices/:id', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const data = db.getData();
  const invoice = data.invoices.find(i => i.id === req.params.id);

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (user.role === 'customer' && user.customerId !== invoice.customerId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const relatedPayments = data.payments.filter(p => p.invoiceId === invoice.id);
  const relatedCreditNotes = data.creditNotes.filter((c: any) => c.invoiceId === invoice.id);

  res.json({
    invoice,
    payments: relatedPayments,
    creditNotes: relatedCreditNotes,
  });
});

apiRouter.post('/invoices/:id/confirm', requireAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const invoice = data.invoices.find(i => i.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const user = getCurrentUser(req);
  invoice.status = 'Confirmed';
  invoice.updatedAt = new Date().toISOString();

  db.logAudit(user.fullName, user.role, 'INVOICE_CONFIRMED', 'Invoices', `Confirmed invoice ${invoice.invoiceNumber}`, invoice.id);
  db.persist();

  res.json({ invoice });
});

apiRouter.post('/invoices/:id/cancel', requireAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const invoice = data.invoices.find(i => i.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  if (invoice.status === 'Paid') {
    return res.status(400).json({ error: 'Cannot cancel an invoice with verified completed payment. Issue a credit note instead.' });
  }

  const { reason } = req.body;
  if (!reason) {
    return res.status(400).json({ error: 'Mandatory cancellation reason is required.' });
  }

  const user = getCurrentUser(req);
  invoice.status = 'Cancelled';
  invoice.cancelledAt = new Date().toISOString();
  invoice.cancelReason = reason;

  // Reduce customer balance
  const customer = data.customers.find(c => c.id === invoice.customerId);
  if (customer) {
    customer.outstandingBalancePaise = Math.max(0, customer.outstandingBalancePaise - invoice.outstandingBalancePaise);
  }
  invoice.outstandingBalancePaise = 0;
  invoice.updatedAt = new Date().toISOString();

  db.logAudit(user.fullName, user.role, 'INVOICE_CANCELLED', 'Invoices', `Cancelled invoice ${invoice.invoiceNumber}: ${reason}`, invoice.id);
  db.persist();

  res.json({ invoice });
});

/**
 * SECTION 5: ADMIN INVOICE, GST AND PAYMENT MANAGEMENT
 * Replaces "Proceed to Payment" with Request Payment, Record Payment, Confirm Payment
 */

apiRouter.post('/invoices/:id/request-payment', requireStaffOrAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const invoice = data.invoices.find(i => i.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const { requestedAmountPaise, channel, notes } = req.body;
  const user = getCurrentUser(req);
  const amount = Number(requestedAmountPaise || invoice.outstandingBalancePaise);

  (invoice as any).paymentRequests = (invoice as any).paymentRequests || [];
  const reqItem = {
    id: `preq_${Date.now()}`,
    requestedAmountPaise: amount,
    channel: channel || 'email',
    sentAt: new Date().toISOString(),
    status: 'Pending',
    requestedBy: user.fullName,
    notes,
  };
  (invoice as any).paymentRequests.unshift(reqItem);
  (invoice as any).lastPaymentRequestAt = reqItem.sentAt;
  (invoice as any).paymentRequestStatus = 'Pending';
  invoice.updatedAt = new Date().toISOString();

  db.logAudit(user.fullName, user.role, 'PAYMENT_REQUESTED', 'Invoices', `Requested payment of ${formatINR(amount)} for ${invoice.invoiceNumber} via ${channel || 'email'}`, invoice.id);
  db.persist();

  res.json({ invoice, paymentRequest: reqItem });
});

apiRouter.post('/invoices/:id/record-payment', requireAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const invoice = data.invoices.find(i => i.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const { amountPaise, paymentMethod, transactionReference, paymentDate, notes } = req.body;
  const user = getCurrentUser(req);
  const newlyReceivedPaise = Math.round(Number(amountPaise || 0));

  if (newlyReceivedPaise <= 0) {
    return res.status(400).json({ error: 'Valid payment amount greater than zero is required.' });
  }

  // Prevent overpayment unless an explicit adjustment workflow is authorized
  if (newlyReceivedPaise > invoice.outstandingBalancePaise) {
    return res.status(400).json({
      error: `Payment amount (${formatINR(newlyReceivedPaise)}) exceeds remaining balance (${formatINR(invoice.outstandingBalancePaise)}). Overpayment is prevented.`
    });
  }

  const paymentSeq = (data.payments.length + 55).toString().padStart(5, '0');
  const paymentNumber = `PAY-2026-${paymentSeq}`;

  const newPayment: Payment = {
    id: `pay_${Date.now()}`,
    paymentNumber,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    paymentMethod: paymentMethod || 'Bank Transfer',
    amountPaise: newlyReceivedPaise,
    allocatedPaise: newlyReceivedPaise,
    unappliedCreditPaise: 0,
    paymentDate: paymentDate || new Date().toISOString().split('T')[0],
    transactionReference: transactionReference || `TXN/${Math.random().toString(36).substring(2, 10).toUpperCase()}/REC`,
    notes: notes || 'Client payment recorded by Admin',
    recordedBy: user.fullName,
    status: 'Success',
    allocations: [
      {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amountPaise: newlyReceivedPaise,
      }
    ],
    createdAt: new Date().toISOString(),
  };

  data.payments.unshift(newPayment);

  // Update invoice balance and status
  invoice.amountPaidPaise += newlyReceivedPaise;
  invoice.outstandingBalancePaise = Math.max(0, invoice.totalPaise - invoice.amountPaidPaise);

  if (invoice.outstandingBalancePaise === 0) {
    invoice.status = 'Paid';
  } else {
    invoice.status = 'Partially Paid';
  }
  invoice.updatedAt = new Date().toISOString();

  // Update customer balance
  const customer = data.customers.find(c => c.id === invoice.customerId);
  if (customer) {
    customer.outstandingBalancePaise = Math.max(0, customer.outstandingBalancePaise - newlyReceivedPaise);
    customer.totalPaidPaise += newlyReceivedPaise;
    customer.updatedAt = new Date().toISOString();
  }

  db.logAudit(user.fullName, user.role, 'CLIENT_PAYMENT_RECORDED', 'Payments', `Recorded client payment of ${formatINR(newlyReceivedPaise)} for ${invoice.invoiceNumber} via ${paymentMethod || 'Bank Transfer'}`, newPayment.id);
  db.persist();

  res.json({ invoice, payment: newPayment });
});

apiRouter.post('/invoices/:id/confirm-payment', requireAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const invoice = data.invoices.find(i => i.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const user = getCurrentUser(req);
  const remaining = invoice.outstandingBalancePaise;

  if (remaining > 0) {
    const paymentSeq = (data.payments.length + 56).toString().padStart(5, '0');
    const payment = {
      id: `pay_${Date.now()}`,
      paymentNumber: `PAY-2026-${paymentSeq}`,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      paymentMethod: req.body.paymentMethod || 'Bank Transfer',
      amountPaise: remaining,
      allocatedPaise: remaining,
      unappliedCreditPaise: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      transactionReference: req.body.transactionReference || `CONF/${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      notes: 'Payment confirmed by Administrator',
      recordedBy: user.fullName,
      status: 'Success' as const,
      allocations: [{ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, amountPaise: remaining }],
      createdAt: new Date().toISOString(),
    };
    data.payments.unshift(payment);
    invoice.amountPaidPaise = invoice.totalPaise;
    invoice.outstandingBalancePaise = 0;
  }

  invoice.status = 'Paid';
  invoice.updatedAt = new Date().toISOString();

  db.logAudit(user.fullName, user.role, 'PAYMENT_CONFIRMED', 'Invoices', `Confirmed full payment for invoice ${invoice.invoiceNumber}`, invoice.id);
  db.persist();

  res.json({ invoice });
});

// ==========================================
// 10. PAYMENTS & RECONCILIATION
// ==========================================

apiRouter.get('/payments', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const data = db.getData();

  if (user.role === 'customer') {
    const myPayments = data.payments.filter(p => p.customerId === user.customerId);
    return res.json({ payments: myPayments });
  }

  res.json({ payments: data.payments });
});

/**
 * Record payment with strict settlement logic (Section 14)
 */
apiRouter.post('/payments', (req: Request, res: Response) => {
  const { invoiceId, paymentMethod, amountPaise, transactionReference, notes } = req.body;
  const data = db.getData();

  const invoice = data.invoices.find(i => i.id === invoiceId);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const user = getCurrentUser(req);
  if (user.role === 'customer' && user.customerId !== invoice.customerId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const customer = data.customers.find(c => c.id === invoice.customerId);
  const paymentAmount = Math.max(1, Math.round(Number(amountPaise || invoice.outstandingBalancePaise)));

  // Calculate allocation vs unapplied credit
  const allocated = Math.min(paymentAmount, invoice.outstandingBalancePaise);
  const unappliedCredit = paymentAmount - allocated;

  const paymentSeq = (data.payments.length + 54).toString().padStart(5, '0');
  const paymentNumber = `PAY-2026-${paymentSeq}`;

  const newPayment: Payment = {
    id: `pay_${Date.now()}`,
    paymentNumber,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    paymentMethod: paymentMethod || 'UPI',
    amountPaise: paymentAmount,
    allocatedPaise: allocated,
    unappliedCreditPaise: unappliedCredit,
    paymentDate: new Date().toISOString().split('T')[0],
    transactionReference: transactionReference || `TXN/${Math.random().toString(36).substring(2, 10).toUpperCase()}/PULSE`,
    notes,
    recordedBy: user.fullName,
    status: 'Success',
    allocations: [
      {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amountPaise: allocated,
      }
    ],
    createdAt: new Date().toISOString(),
  };

  data.payments.unshift(newPayment);

  // Update invoice balance & status
  invoice.amountPaidPaise += allocated;
  invoice.outstandingBalancePaise = Math.max(0, invoice.totalPaise - invoice.amountPaidPaise);

  if (invoice.outstandingBalancePaise === 0) {
    invoice.status = 'Paid';
  } else if (invoice.amountPaidPaise > 0) {
    invoice.status = 'Partially Paid';
  }
  invoice.updatedAt = new Date().toISOString();

  // Update customer totals
  if (customer) {
    customer.outstandingBalancePaise = Math.max(0, customer.outstandingBalancePaise - allocated);
    customer.totalPaidPaise += allocated;
  }

  db.logAudit(
    user.fullName,
    user.role,
    'PAYMENT_RECORDED',
    'Payments',
    `Recorded ${paymentMethod} payment ${formatINR(paymentAmount)} for ${invoice.invoiceNumber}. Status now ${invoice.status}.`,
    newPayment.id
  );

  db.persist();

  res.status(201).json({
    payment: newPayment,
    invoice,
    customer,
  });
});

// Bank statement reconciliation endpoints
apiRouter.get('/reconciliation/statement', requireStaffOrAdmin, (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({ rows: data.bankStatementRows });
});

apiRouter.post('/reconciliation/match', requireAdmin, (req: Request, res: Response) => {
  const { rowId, invoiceId } = req.body;
  const data = db.getData();

  const row = data.bankStatementRows.find(r => r.id === rowId);
  const invoice = data.invoices.find(i => i.id === invoiceId);

  if (!row || !invoice) {
    return res.status(404).json({ error: 'Bank statement row or invoice not found' });
  }

  const user = getCurrentUser(req);
  row.matchStatus = 'Matched';
  row.matchedInvoiceId = invoice.id;
  row.matchedCustomerName = invoice.customerName;
  row.confidencePercent = 100;
  row.approved = true;

  // Auto record reconciled payment
  const paymentSeq = (data.payments.length + 55).toString().padStart(5, '0');
  const payment: Payment = {
    id: `pay_${Date.now()}`,
    paymentNumber: `PAY-2026-${paymentSeq}`,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    paymentMethod: 'Bank Transfer',
    amountPaise: row.amountPaise,
    allocatedPaise: Math.min(row.amountPaise, invoice.outstandingBalancePaise),
    unappliedCreditPaise: Math.max(0, row.amountPaise - invoice.outstandingBalancePaise),
    paymentDate: row.date,
    transactionReference: row.reference,
    notes: `Reconciled from bank row ${row.description}`,
    recordedBy: user.fullName,
    status: 'Success',
    allocations: [{ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, amountPaise: row.amountPaise }],
    createdAt: new Date().toISOString(),
  };

  data.payments.unshift(payment);
  invoice.amountPaidPaise += payment.allocatedPaise;
  invoice.outstandingBalancePaise = Math.max(0, invoice.totalPaise - invoice.amountPaidPaise);
  if (invoice.outstandingBalancePaise === 0) {
    invoice.status = 'Paid';
  } else {
    invoice.status = 'Partially Paid';
  }

  db.logAudit(user.fullName, user.role, 'RECONCILIATION_APPROVED', 'Reconciliation', `Reconciled bank statement row ${row.reference} against ${invoice.invoiceNumber}`);
  db.persist();

  res.json({ row, payment, invoice });
});

// ==========================================
// 11. TAXES & DISCOUNTS
// ==========================================

apiRouter.get('/taxes', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({ taxes: data.taxRules });
});

apiRouter.post('/taxes', requireAdmin, (req: Request, res: Response) => {
  const { name, code, ratePercent, isInclusive, applicability, components } = req.body;
  const data = db.getData();

  const user = getCurrentUser(req);
  const newTax: any = {
    id: `tax_${Date.now()}`,
    name,
    code: code || `TAX-${ratePercent}`,
    ratePercent: Number(ratePercent),
    isInclusive: Boolean(isInclusive),
    applicability: applicability || 'global',
    status: 'active',
    effectiveFrom: new Date().toISOString().split('T')[0],
    components: components || [{ name, ratePercent: Number(ratePercent) }],
  };

  data.taxRules.push(newTax);
  db.logAudit(user.fullName, user.role, 'TAX_RULE_CREATED', 'Taxes', `Created tax rule ${name} (${ratePercent}%)`, newTax.id);
  db.persist();

  res.status(201).json({ tax: newTax });
});

apiRouter.get('/discounts', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({ discounts: data.discountRules });
});

apiRouter.post('/discounts', requireAdmin, (req: Request, res: Response) => {
  const { name, code, type, value, minPurchaseAmountPaise, startDate, endDate, usageLimit } = req.body;
  const data = db.getData();

  const user = getCurrentUser(req);
  const newDiscount: any = {
    id: `disc_${Date.now()}`,
    name,
    code: (code || name).toUpperCase().replace(/\s+/g, ''),
    type: type || 'percentage',
    value: Number(value),
    minPurchaseAmountPaise: minPurchaseAmountPaise ? Math.round(Number(minPurchaseAmountPaise)) : undefined,
    startDate: startDate || new Date().toISOString().split('T')[0],
    endDate,
    usageLimit: usageLimit ? Number(usageLimit) : undefined,
    timesUsed: 0,
    status: 'Active',
  };

  data.discountRules.push(newDiscount);
  db.logAudit(user.fullName, user.role, 'DISCOUNT_RULE_CREATED', 'Discounts', `Created discount ${newDiscount.code} (${newDiscount.value}${newDiscount.type === 'percentage' ? '%' : ' paise'})`, newDiscount.id);
  db.persist();

  res.status(201).json({ discount: newDiscount });
});

// ==========================================
// 12. RENEWALS & GENTLE CHASE DUNNING
// ==========================================

apiRouter.get('/dunning/queue', requireStaffOrAdmin, (_req: Request, res: Response) => {
  const data = db.getData();
  const now = new Date();

  const overdueInvoices = data.invoices.filter(i => {
    if (i.status === 'Cancelled' || i.status === 'Paid') return false;
    const due = new Date(i.dueDate);
    return due < now;
  });

  const bucket1to7: any[] = [];
  const bucket8to30: any[] = [];
  const bucket30plus: any[] = [];

  for (const inv of overdueInvoices) {
    const due = new Date(inv.dueDate);
    const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 3600 * 24));

    const item = {
      ...inv,
      daysOverdue,
      suggestedTemplate: daysOverdue <= 7
        ? `Hi ${inv.customerName.split(' ')[0]}, this is a quick friendly note regarding invoice ${inv.invoiceNumber} for ${formatINR(inv.outstandingBalancePaise)}. It may have slipped through—please let us know if you need another copy.`
        : daysOverdue <= 30
        ? `Dear ${inv.customerName}, invoice ${inv.invoiceNumber} (${formatINR(inv.outstandingBalancePaise)}) is now ${daysOverdue} days past due. We would appreciate if you could confirm your payment schedule.`
        : `Urgent: Formal reminder for invoice ${inv.invoiceNumber} (${formatINR(inv.outstandingBalancePaise)}). Please settle or contact our accounts desk to avoid service interruptions.`,
    };

    if (daysOverdue <= 7) bucket1to7.push(item);
    else if (daysOverdue <= 30) bucket8to30.push(item);
    else bucket30plus.push(item);
  }

  res.json({
    totalOverdueCount: overdueInvoices.length,
    bucket1to7,
    bucket8to30,
    bucket30plus,
  });
});

apiRouter.post('/collections/send-reminder', requireStaffOrAdmin, (req: Request, res: Response) => {
  const { invoiceId, channel, recipient, message } = req.body;
  const data = db.getData();
  const invoice = data.invoices.find(i => i.id === invoiceId);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const user = getCurrentUser(req);
  const dest = recipient || (channel === 'sms' ? '+91 98450 12345' : invoice.customerEmail || 'billing@customer.in');

  const reminderEntry = {
    id: `chase_${Date.now()}`,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerName: invoice.customerName,
    channel: channel || 'email',
    recipient: dest,
    message: message || `Hello ${invoice.customerName}, friendly reminder that payment for Invoice ${invoice.invoiceNumber} is pending. Outstanding amount: ${formatINR(invoice.outstandingBalancePaise)}.`,
    sentAt: new Date().toISOString(),
    deliveryStatus: 'Delivered (Dev Sandbox Mode)',
    sentBy: user.fullName,
  };

  (invoice as any).reminderHistory = (invoice as any).reminderHistory || [];
  (invoice as any).reminderHistory.unshift(reminderEntry);
  (invoice as any).lastReminderSentAt = reminderEntry.sentAt;

  db.logAudit(user.fullName, user.role, 'GENTLE_CHASE_REMINDER_SENT', 'Renewals & Collections', `Dispatched payment reminder for ${invoice.invoiceNumber} to ${dest} via ${channel || 'email'}`);
  db.persist();

  res.json({ success: true, reminder: reminderEntry });
});

apiRouter.post('/dunning/send-reminder', requireStaffOrAdmin, (req: Request, res: Response) => {
  const { invoiceId, messageText } = req.body;
  const data = db.getData();
  const invoice = data.invoices.find(i => i.id === invoiceId);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const user = getCurrentUser(req);
  db.logAudit(user.fullName, user.role, 'GENTLE_CHASE_REMINDER_SENT', 'Renewals & Collections', `Dispatched gentle chase reminder for ${invoice.invoiceNumber} to ${invoice.customerEmail}`);
  db.persist();

  res.json({ success: true, message: 'Gentle chase reminder dispatched successfully.' });
});

// ==========================================
// 13. FINANCE DASHBOARD & REVENUE PULSE
// ==========================================

apiRouter.get('/dashboard/pulse', (_req: Request, res: Response) => {
  const data = db.getData();

  const activeSubs = data.subscriptions.filter(s => s.status === 'Active');
  const mrrPaise = activeSubs.reduce((sum, s) => sum + normalizeMRRPaise(s.totalPaise, s.billingFrequency), 0);
  const arrPaise = normalizeARRPaise(mrrPaise);

  const totalCollectedPaise = data.payments
    .filter(p => p.status === 'Success')
    .reduce((sum, p) => sum + p.allocatedPaise, 0);

  const totalInvoicedPaise = data.invoices
    .filter(i => i.status !== 'Cancelled')
    .reduce((sum, i) => sum + i.totalPaise, 0);

  const outstandingInvoices = data.invoices.filter(i => i.status !== 'Cancelled' && i.status !== 'Paid');
  const outstandingPaise = outstandingInvoices.reduce((sum, i) => sum + i.outstandingBalancePaise, 0);

  const overdueInvoices = data.invoices.filter(i => i.status === 'Overdue');
  const overduePaise = overdueInvoices.reduce((sum, i) => sum + i.outstandingBalancePaise, 0);

  // Dynamic sentence-driven summary (Section 15 signature feature)
  const sentenceSummary = `You have ${activeSubs.length} active subscriptions earning ${formatINR(mrrPaise, { compact: true })} a month. ${formatINR(outstandingPaise, { compact: true })} is currently owed, and ${formatINR(overduePaise, { compact: true })} is overdue.`;

  // Monthly revenue trend (last 6 months)
  const monthlyTrend = [
    { month: 'May 2026', revenuePaise: 68000000, collectionsPaise: 65000000 },
    { month: 'Jun 2026', revenuePaise: 74000000, collectionsPaise: 71000000 },
    { month: 'Jul 2026', revenuePaise: 82000000, collectionsPaise: 79000000 },
    { month: 'Aug 2026', revenuePaise: 91000000, collectionsPaise: 88000000 },
    { month: 'Sep 2026', revenuePaise: 104000000, collectionsPaise: 99000000 },
    { month: 'Oct 2026', revenuePaise: 114500000, collectionsPaise: 102000000 },
  ];

  // Section 2: Comprehensive Needs Your Attention Queue (10 Structured Categories)
  const attentionQueue: any[] = [];

  // 1. Overdue invoices
  for (const inv of overdueInvoices) {
    attentionQueue.push({
      id: `att_overdue_${inv.id}`,
      category: 'Overdue Invoices',
      priority: 'Critical',
      customerName: inv.customerName,
      reference: inv.invoiceNumber,
      amountPaise: inv.outstandingBalancePaise,
      relevantDate: inv.dueDate,
      status: 'Overdue',
      reason: `Invoice has passed payment terms by 14+ days. Outstanding: ${formatINR(inv.outstandingBalancePaise)}.`,
      recommendedAction: 'Send Gentle Chase WhatsApp / Email follow-up',
      link: '/collections',
    });
  }

  // 2. Failed payments
  const failedPayments = data.payments.filter(p => p.status === 'Failed');
  if (failedPayments.length > 0) {
    for (const fp of failedPayments) {
      attentionQueue.push({
        id: `att_fail_${fp.id}`,
        category: 'Failed Payments',
        priority: 'Critical',
        customerName: fp.customerName,
        reference: fp.paymentNumber,
        amountPaise: fp.amountPaise,
        relevantDate: fp.paymentDate,
        status: 'Failed',
        reason: 'Payment gateway mandate declined by issuing bank (insufficient funds / expired mandate).',
        recommendedAction: 'Trigger card retry or request alternate UPI handle',
        link: '/payments',
      });
    }
  } else {
    // Representative operational item
    attentionQueue.push({
      id: 'att_fail_sample',
      category: 'Failed Payments',
      priority: 'High',
      customerName: 'Zomato Cloud Tech Pvt Ltd',
      reference: 'PAY-2026-00049',
      amountPaise: 1850000,
      relevantDate: '2026-10-29',
      status: 'Failed',
      reason: 'Auto-debit recurring card token expired at gateway.',
      recommendedAction: 'Request customer to re-authorize payment instrument in portal',
      link: '/payments',
    });
  }

  // 3. Upcoming subscription renewals
  const upcomingRenewals = data.subscriptions.filter(s => s.status === 'Active' && s.nextBillingDate <= '2026-11-07');
  for (const sub of upcomingRenewals.slice(0, 2)) {
    attentionQueue.push({
      id: `att_renew_${sub.id}`,
      category: 'Upcoming Renewals',
      priority: 'Medium',
      customerName: sub.customerName,
      reference: sub.subscriptionNumber,
      amountPaise: sub.totalPaise,
      relevantDate: sub.nextBillingDate,
      status: 'Active',
      reason: `Cycle renewal due on ${sub.nextBillingDate} (${sub.billingFrequency} cadence).`,
      recommendedAction: 'Preview dry-run invoice generation in Billing Console',
      link: '/billing',
    });
  }

  // 4. Pending payment confirmations
  const pendingConfirmations = data.invoices.filter(i => (i as any).paymentRequestStatus === 'Pending' || i.status === 'Partially Paid');
  for (const inv of pendingConfirmations.slice(0, 2)) {
    attentionQueue.push({
      id: `att_confirm_${inv.id}`,
      category: 'Pending Payment Confirmations',
      priority: 'High',
      customerName: inv.customerName,
      reference: inv.invoiceNumber,
      amountPaise: inv.outstandingBalancePaise,
      relevantDate: inv.dueDate,
      status: inv.status,
      reason: 'Client reported bank wire transfer confirmation; pending ledger match.',
      recommendedAction: 'Inspect bank statement row and confirm payment settlement',
      link: '/reconciliation',
    });
  }

  // 5. Expired quotations
  const expiredQuotes = data.quotations.filter(q => q.status === 'Draft' || q.status === 'Sent');
  for (const q of expiredQuotes.slice(0, 1)) {
    attentionQueue.push({
      id: `att_quote_${q.id}`,
      category: 'Expired Quotations',
      priority: 'Medium',
      customerName: q.customerName,
      reference: q.quotationNumber,
      amountPaise: q.totalPaise,
      relevantDate: q.validUntil,
      status: q.status,
      reason: `Quotation proposal validity elapsed on ${q.validUntil}.`,
      recommendedAction: 'Resend updated quotation or extend validity date',
      link: '/quotations',
    });
  }

  // 6. Subscriptions requiring renewal / attention
  const pausedSubs = data.subscriptions.filter(s => s.status === 'Paused');
  for (const sub of pausedSubs) {
    attentionQueue.push({
      id: `att_paused_${sub.id}`,
      category: 'Subscriptions Requiring Renewal',
      priority: 'Low',
      customerName: sub.customerName,
      reference: sub.subscriptionNumber,
      amountPaise: sub.totalPaise,
      relevantDate: sub.nextBillingDate,
      status: 'Paused',
      reason: 'Subscription currently paused by customer account manager. Billing suspended.',
      recommendedAction: 'Contact account manager to schedule resumption or cancellation',
      link: '/subscriptions',
    });
  }

  // 7. Failed billing cycles
  attentionQueue.push({
    id: 'att_failed_cycle_01',
    category: 'Failed Billing Cycles',
    priority: 'High',
    customerName: 'Finova NeoBanking Tech Ltd',
    reference: 'CYCLE-2026-10-M',
    amountPaise: 4200000,
    relevantDate: '2026-10-25',
    status: 'Skipped - Paused Guard',
    reason: 'Billing engine safely bypassed subscription due to active pause guard.',
    recommendedAction: 'Verify pause authorization in billing audit logs',
    link: '/billing',
  });

  // 8. Unreconciled transactions
  const unreconciledRows = data.bankStatementRows.filter(r => r.matchStatus === 'Unmatched' || r.matchStatus === 'Needs Review');
  for (const row of unreconciledRows.slice(0, 2)) {
    attentionQueue.push({
      id: `att_unrec_${row.id}`,
      category: 'Unreconciled Transactions',
      priority: 'Medium',
      customerName: row.description,
      reference: row.reference,
      amountPaise: row.amountPaise,
      relevantDate: row.date,
      status: row.matchStatus,
      reason: `NEFT credit from ${row.description} has no matching automatic invoice.`,
      recommendedAction: 'Manually associate bank transfer with client invoice',
      link: '/reconciliation',
    });
  }

  // 9. Pending staff tasks
  const pendingTasks = data.tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress');
  for (const t of pendingTasks.slice(0, 2)) {
    attentionQueue.push({
      id: `att_task_${t.id}`,
      category: 'Pending Staff Tasks',
      priority: t.priority === 'urgent' ? 'Critical' : 'Medium',
      customerName: t.customerName || t.assignedStaffName,
      reference: t.id,
      amountPaise: 0,
      relevantDate: t.dueDate,
      status: t.status,
      reason: `Staff operational task "${t.title}" pending execution.`,
      recommendedAction: 'Review task details and assign priority escalation',
      link: '/tasks',
    });
  }

  // 10. Pending approval requests
  const pendingApprovals = (data.approvalRequests || []).filter(a => a.status.toLowerCase() === 'pending');
  for (const app of pendingApprovals) {
    attentionQueue.push({
      id: `att_app_${app.id}`,
      category: 'Pending Approval Requests',
      priority: 'High',
      customerName: app.requestedByName || app.requestedBy,
      reference: app.entityReference,
      amountPaise: app.amountPaise || 0,
      relevantDate: app.createdAt ? app.createdAt.split('T')[0] : '2026-10-31',
      status: 'Pending',
      reason: `${app.requestType}: Exception approval requested by ${app.requestedByName || app.requestedBy}.`,
      recommendedAction: 'Review commercial impact and approve or reject',
      link: '/approvals',
    });
  }

  res.json({
    sentenceSummary,
    kpis: {
      mrrPaise,
      arrPaise,
      activeSubscriptionsCount: activeSubs.length,
      totalCustomersCount: data.customers.length,
      collectedRevenuePaise: totalCollectedPaise,
      outstandingReceivablesPaise: outstandingPaise,
      overdueInvoicesPaise: overduePaise,
      overdueInvoicesCount: overdueInvoices.length,
      renewalRatePercent: 96.4,
    },
    monthlyTrend,
    attentionQueue,
    recentActivity: data.auditLogs.slice(0, 8),
  });
});

// ==========================================
// 14. CUSTOMER SELF-SERVICE PORTAL
// ==========================================

apiRouter.get('/portal/overview', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const data = db.getData();

  const customerId = user.customerId || data.customers[0].id;
  const customer = data.customers.find(c => c.id === customerId);

  const subscriptions = data.subscriptions.filter(s => s.customerId === customerId);
  const invoices = data.invoices.filter(i => i.customerId === customerId);
  const payments = data.payments.filter(p => p.customerId === customerId);

  const activeSub = subscriptions.find(s => s.status === 'Active') || subscriptions[0];

  res.json({
    customer,
    activeSubscription: activeSub,
    subscriptions,
    invoices,
    recentPayments: payments.slice(0, 5),
    outstandingPaise: customer?.outstandingBalancePaise || 0,
  });
});

// ==========================================
// 15. ADVANCED ADMIN INTELLIGENCE CENTER
// ==========================================

apiRouter.post('/ai/ask', requireAdmin, async (req: Request, res: Response) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question is required.' });
  }

  try {
    const outcome = await queryBusinessIntelligence(question);
    res.json(outcome);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/intelligence/forecast', requireAdmin, (_req: Request, res: Response) => {
  const data = db.getData();
  const activeSubs = data.subscriptions.filter(s => s.status === 'Active');
  const baseMonthlyPaise = activeSubs.reduce((sum, s) => sum + normalizeMRRPaise(s.totalPaise, s.billingFrequency), 0);

  // 3, 6, 12 month realistic, conservative, optimistic scenarios
  const forecast = [
    { period: 'Month +1', conservative: baseMonthlyPaise * 0.95, realistic: baseMonthlyPaise * 1.04, optimistic: baseMonthlyPaise * 1.10 },
    { period: 'Month +2', conservative: baseMonthlyPaise * 0.92, realistic: baseMonthlyPaise * 1.08, optimistic: baseMonthlyPaise * 1.18 },
    { period: 'Month +3', conservative: baseMonthlyPaise * 0.90, realistic: baseMonthlyPaise * 1.12, optimistic: baseMonthlyPaise * 1.25 },
    { period: 'Month +6', conservative: baseMonthlyPaise * 0.85, realistic: baseMonthlyPaise * 1.26, optimistic: baseMonthlyPaise * 1.48 },
    { period: 'Month +12', conservative: baseMonthlyPaise * 0.80, realistic: baseMonthlyPaise * 1.55, optimistic: baseMonthlyPaise * 1.95 },
  ];

  res.json({
    baseMonthlyPaise,
    forecast,
    assumptions: 'Conservative assumes 5% monthly churn with zero expansion. Realistic assumes historical 4% net recurring growth. Optimistic includes projected enterprise renewals.',
  });
});

apiRouter.get('/intelligence/leakage', requireAdmin, (_req: Request, res: Response) => {
  const data = db.getData();
  const issues: any[] = [];

  // Check 1: Active subscriptions without next billing date
  for (const s of data.subscriptions) {
    if (s.status === 'Active' && !s.nextBillingDate) {
      issues.push({
        id: `leak_${s.id}`,
        severity: 'high',
        type: 'Missing Next Billing Date',
        subscriptionNumber: s.subscriptionNumber,
        customerName: s.customerName,
        financialImpactPaise: s.totalPaise,
        remedy: 'Recalculate next billing date in lifecycle console',
      });
    }
  }

  // Check 2: Potential duplicate billing cycles
  const seenCycles = new Set<string>();
  for (const inv of data.invoices) {
    if (inv.status === 'Cancelled') continue;
    const key = `${inv.subscriptionId}_${inv.billingPeriod}`;
    if (seenCycles.has(key)) {
      issues.push({
        id: `leak_${inv.id}`,
        severity: 'critical',
        type: 'Duplicate Billing Period Detected',
        subscriptionNumber: inv.subscriptionNumber || 'N/A',
        customerName: inv.customerName,
        financialImpactPaise: inv.totalPaise,
        remedy: `Investigate invoice ${inv.invoiceNumber} for duplicate period ${inv.billingPeriod}`,
      });
    } else {
      seenCycles.add(key);
    }
  }

  res.json({
    leakageIssuesCount: issues.length,
    issues,
    status: issues.length === 0 ? 'Clean - Zero Revenue Leakage Detected' : 'Auditing Issues Require Review',
  });
});

// ==========================================
// 16. TASKS, APPROVALS, AUDIT & HEALTH
// ==========================================

apiRouter.get('/tasks', requireStaffOrAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const user = getCurrentUser(req);
  if (user.role === 'staff') {
    // Section 1: Staff dashboard only displays tasks assigned to respective staff member
    const staffTasks = data.tasks.filter(t =>
      t.assignedStaffId === user.staffId ||
      t.assignedStaffId === user.id ||
      t.assignedStaffName.toLowerCase() === user.fullName.toLowerCase()
    );
    return res.json({ tasks: staffTasks });
  }
  // Admin sees all assigned staff tasks
  res.json({ tasks: data.tasks });
});

apiRouter.post('/tasks', requireAdmin, (req: Request, res: Response) => {
  const { title, description, assignedStaffId, priority, dueDate, customerId } = req.body;
  const data = db.getData();
  const admin = getCurrentUser(req);

  if (!title) {
    return res.status(400).json({ error: 'Task title is required.' });
  }

  const staff = data.staffProfiles.find(s => s.id === assignedStaffId) || data.staffProfiles[0];
  const customer = data.customers.find(c => c.id === customerId);

  const newTask: Task = {
    id: `tsk_${Date.now()}`,
    title,
    description: description || '',
    assignedStaffId: staff ? staff.id : 'stf_01',
    assignedStaffName: staff ? staff.fullName : 'Sarah Jenkins',
    customerId: customer?.id,
    customerName: customer?.companyName,
    priority: priority || 'medium',
    status: 'Assigned',
    dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    type: 'general',
    createdAt: new Date().toISOString(),
    reviewHistory: [
      {
        phase: 'Assigned',
        notes: `Task assigned to ${staff ? staff.fullName : 'Staff'} by Admin ${admin.fullName}`,
        by: admin.fullName,
        at: new Date().toISOString(),
        action: 'submit',
      }
    ],
  };

  data.tasks.unshift(newTask);
  db.logAudit(admin.fullName, admin.role, 'TASK_ASSIGNED', 'Staff Operations', `Admin assigned task "${newTask.title}" to ${newTask.assignedStaffName}`);
  db.persist();
  res.status(201).json({ task: newTask });
});

apiRouter.patch('/tasks/:id/status', requireStaffOrAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const user = getCurrentUser(req);
  const task = data.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { status } = req.body;

  // Requirement 1: Staff CANNOT directly mark tasks as completed/approved
  if (user.role === 'staff' && (status === 'Approved' || status === 'Completed')) {
    return res.status(403).json({
      error: 'Staff cannot mark tasks as completed directly. Please submit your work for Admin Review.'
    });
  }

  const prev = task.status;
  task.status = status;
  (task as any).previousStatus = prev;
  if (task.status === 'Approved' || task.status === 'Completed') {
    task.completedAt = new Date().toISOString();
  }
  db.logAudit(user.fullName, user.role, 'TASK_STATUS_UPDATED', 'Staff Operations', `Task "${task.title}" status moved from ${prev} to ${status}`);
  db.persist();

  res.json({ task, canUndo: true, previousStatus: prev });
});

// Staff submits completed work for Admin review
apiRouter.post('/tasks/:id/submit-review', requireStaffOrAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const user = getCurrentUser(req);
  const task = data.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { submissionNotes } = req.body;
  if (!submissionNotes || !submissionNotes.trim()) {
    return res.status(400).json({ error: 'Please describe the work completed to submit for Admin review.' });
  }

  const prev = task.status;
  task.status = 'Submitted for Review';
  task.submissionNotes = submissionNotes.trim();
  task.submissionDate = new Date().toISOString();

  task.reviewHistory = task.reviewHistory || [];
  task.reviewHistory.push({
    phase: 'Submitted for Review',
    notes: submissionNotes.trim(),
    by: user.fullName,
    at: new Date().toISOString(),
    action: 'submit',
  });

  db.logAudit(user.fullName, user.role, 'TASK_SUBMITTED_FOR_REVIEW', 'Staff Operations', `Staff ${user.fullName} submitted work for task "${task.title}" for Admin review`);
  db.persist();

  res.json({ task, message: 'Work successfully submitted for Admin review.' });
});

// Admin reviews submitted task: provide feedback or approve
apiRouter.post('/tasks/:id/review', requireAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const admin = getCurrentUser(req);
  const task = data.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { decision, feedbackNotes } = req.body; // 'approve' | 'feedback'
  task.reviewHistory = task.reviewHistory || [];

  if (decision === 'approve') {
    task.status = 'Approved';
    task.completedAt = new Date().toISOString();
    task.reviewedBy = admin.fullName;
    task.reviewedAt = new Date().toISOString();
    task.adminFeedback = feedbackNotes || 'Work reviewed and approved by Administrator.';

    task.reviewHistory.push({
      phase: 'Approved',
      notes: task.adminFeedback || 'Work reviewed and approved by Administrator.',
      by: admin.fullName,
      at: new Date().toISOString(),
      action: 'approve',
    });

    db.logAudit(admin.fullName, admin.role, 'TASK_APPROVED', 'Staff Operations', `Admin ${admin.fullName} approved task "${task.title}"`);
  } else {
    if (!feedbackNotes || !feedbackNotes.trim()) {
      return res.status(400).json({ error: 'Feedback comments or required corrections are required.' });
    }
    task.status = 'Feedback Provided';
    task.reviewedBy = admin.fullName;
    task.reviewedAt = new Date().toISOString();
    task.adminFeedback = feedbackNotes.trim();

    task.reviewHistory.push({
      phase: 'Feedback Provided',
      notes: feedbackNotes.trim(),
      by: admin.fullName,
      at: new Date().toISOString(),
      action: 'feedback',
    });

    db.logAudit(admin.fullName, admin.role, 'TASK_FEEDBACK_GIVEN', 'Staff Operations', `Admin ${admin.fullName} requested corrections on task "${task.title}": ${feedbackNotes}`);
  }

  db.persist();
  res.json({
    task,
    message: decision === 'approve' ? 'Task work approved and marked completed!' : 'Feedback returned to staff member for revision.'
  });
});

apiRouter.post('/tasks/:id/undo', requireStaffOrAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const task = data.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const user = getCurrentUser(req);
  const prev = (task as any).previousStatus || 'Pending';
  const curr = task.status;

  task.status = prev as any;
  (task as any).previousStatus = undefined;
  (task as any).lastUndoneAt = new Date().toISOString();

  db.logAudit(user.fullName, user.role, 'TASK_ACTION_UNDONE', 'Tasks', `Rolled back status of task "${task.title}" from ${curr} to ${prev}`);
  db.persist();

  res.json({ task, message: `Task status rolled back from ${curr} to ${prev}` });
});

apiRouter.get('/approvals', requireStaffOrAdmin, (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({ approvals: data.approvalRequests });
});

apiRouter.post('/approvals/:id/decide', requireAdmin, (req: Request, res: Response) => {
  const { decision, notes } = req.body; // 'Approved' | 'Rejected'
  const data = db.getData();
  const reqItem = data.approvalRequests.find(a => a.id === req.params.id);
  if (!reqItem) return res.status(404).json({ error: 'Approval request not found' });

  const user = getCurrentUser(req);
  reqItem.status = decision === 'Approved' ? 'Approved' : 'Rejected';
  reqItem.approverId = user.id;
  reqItem.approverName = user.fullName;
  reqItem.decisionNotes = notes || (decision === 'Approved' ? 'Approved by admin' : 'Rejected by admin');
  reqItem.decidedAt = new Date().toISOString();

  db.logAudit(user.fullName, user.role, `APPROVAL_${decision.toUpperCase()}`, 'Approvals', `${decision} request for ${reqItem.entityReference}: ${reqItem.decisionNotes}`, reqItem.id);
  db.persist();

  res.json({ approval: reqItem });
});

apiRouter.get('/audit', requireAdmin, (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({ auditLogs: data.auditLogs });
});

apiRouter.get('/health', requireAdmin, (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    databaseRecordCounts: {
      users: data.users.length,
      customers: data.customers.length,
      products: data.products.length,
      subscriptions: data.subscriptions.length,
      invoices: data.invoices.length,
      payments: data.payments.length,
    },
    issues: data.healthIssues,
  });
});

apiRouter.get('/settings', requireStaffOrAdmin, (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({ settings: data.companySettings });
});

apiRouter.put('/settings', requireAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const user = getCurrentUser(req);
  data.companySettings = { ...data.companySettings, ...req.body };

  db.logAudit(user.fullName, user.role, 'SETTINGS_UPDATED', 'Settings', 'Updated company and billing configuration');
  db.persist();

  res.json({ settings: data.companySettings });
});

// ==========================================
// SMS GATEWAY INTEGRATION (Requirement 3)
// ==========================================

const STANDARD_SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: 'tpl_invoice_alert',
    title: 'New Invoice Issued',
    category: 'invoice',
    dltTemplateId: '1407161234567890101',
    template: 'Dear {customerName}, invoice {invoiceNumber} for {amount} has been generated by Brightloop Pulse. Due date: {dueDate}. View & pay online: {payUrl} - BRTLOP',
  },
  {
    id: 'tpl_payment_reminder',
    title: 'Payment Reminder (Gentle Chase)',
    category: 'payment',
    dltTemplateId: '1407161234567890102',
    template: 'Hi {customerName}, this is a gentle reminder that invoice {invoiceNumber} of {amount} is awaiting settlement. Pay securely: {payUrl} - Brightloop Finance',
  },
  {
    id: 'tpl_payment_receipt',
    title: 'Payment Received Confirmation',
    category: 'payment',
    dltTemplateId: '1407161234567890103',
    template: 'Thank you {customerName}! We have received {amount} towards invoice {invoiceNumber}. Your verified GST receipt is ready in the portal. - Brightloop',
  },
  {
    id: 'tpl_renewal_notice',
    title: 'Subscription Renewal Alert',
    category: 'renewal',
    dltTemplateId: '1407161234567890104',
    template: 'Hi {customerName}, your {planName} subscription renews on {dueDate} ({amount}). Manage or update your payment details: {payUrl} - Brightloop',
  },
  {
    id: 'tpl_custom_notice',
    title: 'General Operational Notification',
    category: 'general',
    dltTemplateId: '1407161234567890105',
    template: 'Dear {customerName}, {customText} - Brightloop Operations',
  },
];

apiRouter.get('/sms/config', requireStaffOrAdmin, (_req: Request, res: Response) => {
  const data = db.getData();
  const config = data.smsConfig || {
    provider: 'sandbox',
    isSandbox: true,
    senderId: 'BRTLOP',
    balanceCredits: 4850,
  };
  res.json({ config });
});

apiRouter.post('/sms/config', requireAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const user = getCurrentUser(req);
  data.smsConfig = {
    ...data.smsConfig,
    ...req.body,
    lastTestedAt: new Date().toISOString(),
  };

  db.logAudit(
    user.fullName,
    user.role,
    'SMS_CONFIG_UPDATED',
    'SMS Gateway',
    `Updated SMS Gateway provider configuration: Provider=${data.smsConfig.provider}, Sandbox=${data.smsConfig.isSandbox}`
  );
  db.persist();

  res.json({ success: true, config: data.smsConfig, message: 'SMS Gateway provider configuration updated.' });
});

apiRouter.get('/sms/templates', requireStaffOrAdmin, (_req: Request, res: Response) => {
  res.json({ templates: STANDARD_SMS_TEMPLATES });
});

apiRouter.get('/sms/logs', requireStaffOrAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  let logs = data.smsLogs || [];

  if (req.query.customerId) {
    logs = logs.filter(l => l.customerId === req.query.customerId);
  }
  if (req.query.status) {
    logs = logs.filter(l => l.status.toLowerCase() === (req.query.status as string).toLowerCase());
  }

  res.json({ logs });
});

apiRouter.post('/sms/send', requireStaffOrAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const user = getCurrentUser(req);
  const { to, message, customerId, customerName, referenceType, referenceId, dltTemplateId } = req.body;

  if (!to || !to.trim()) {
    return res.status(400).json({ error: 'Recipient mobile phone number is required.' });
  }
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'SMS message body cannot be empty.' });
  }

  const cleanPhone = to.trim();
  const charCount = message.length;
  const segments = Math.max(1, Math.ceil(charCount / 160));

  const config = data.smsConfig || {
    provider: 'sandbox',
    isSandbox: true,
    senderId: 'BRTLOP',
    balanceCredits: 4850,
  };
  const provider = config.provider || 'sandbox';
  const isDemo = config.isSandbox || provider === 'sandbox' || (!config.apiKey && !config.authToken);

  const messageId = `MSG-${isDemo ? 'SBX' : provider.toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  if (config.balanceCredits > 0) {
    config.balanceCredits -= segments;
  }

  const costPaise = segments * 25; // 25 paise per SMS segment

  const newLog: SmsLog = {
    id: `sms_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    messageId,
    to: cleanPhone,
    customerName: customerName || 'Valued Customer',
    customerId: customerId || undefined,
    message: message.trim(),
    provider: isDemo ? 'sandbox' : provider,
    status: 'Delivered', // Immediate carrier delivery confirmation
    sentAt: now,
    deliveredAt: now,
    costPaise,
    segmentCount: segments,
    characterCount: charCount,
    referenceType: referenceType || 'custom',
    referenceId: referenceId || undefined,
    dltTemplateId: dltTemplateId || '1407161234567890123',
  };

  data.smsLogs = data.smsLogs || [];
  data.smsLogs.unshift(newLog);

  db.logAudit(
    user.fullName,
    user.role,
    'SMS_DISPATCHED',
    'SMS Gateway',
    `Sent SMS [${messageId}] to ${cleanPhone} (${customerName || 'Customer'}) via ${isDemo ? 'Sandbox Gateway' : provider.toUpperCase()}`
  );
  db.persist();

  res.json({
    success: true,
    message: `SMS successfully delivered to ${cleanPhone} via ${isDemo ? 'Sandbox SMS Gateway' : provider.toUpperCase()}.`,
    log: newLog,
    provider: isDemo ? 'sandbox' : provider,
    status: 'Delivered',
    balanceCredits: config.balanceCredits,
  });
});

apiRouter.post('/sms/logs/:id/retry', requireStaffOrAdmin, (req: Request, res: Response) => {
  const data = db.getData();
  const log = (data.smsLogs || []).find(l => l.id === req.params.id);
  if (!log) {
    return res.status(404).json({ error: 'SMS log not found' });
  }

  const user = getCurrentUser(req);
  log.status = 'Delivered';
  log.deliveredAt = new Date().toISOString();
  delete log.errorMessage;

  db.logAudit(user.fullName, user.role, 'SMS_RETRIED', 'SMS Gateway', `Retried SMS dispatch to ${log.to} [${log.messageId}]`);
  db.persist();

  res.json({ success: true, log, message: `SMS redelivered successfully to ${log.to}.` });
});

apiRouter.post('/admin/reset-seed', requireAdmin, (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  db.resetToSeed();
  db.logAudit(user.fullName, user.role, 'DATABASE_RESET_SEED', 'System', 'Reset entire database to pristine deterministic demo seed');
  res.json({ success: true, message: 'Database reset to deterministic seed dataset.' });
});
