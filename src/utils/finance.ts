/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BRIGHTLOOP PULSE FINANCIAL ENGINE
 * Implements strict Indian Rupee integer paise calculations,
 * Indian numeric grouping (lakhs, crores), and predictable calculation order.
 */

/**
 * Formats integer paise into Indian Rupee format, e.g. ₹18,40,000 or ₹2,560.50
 */
export function formatINR(paise: number, options?: { showDecimals?: boolean; compact?: boolean }): string {
  if (isNaN(paise) || paise === null || paise === undefined) {
    return '₹0';
  }

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = absPaise / 100;

  if (options?.compact) {
    if (rupees >= 10000000) {
      return `${isNegative ? '-' : ''}₹${(rupees / 10000000).toFixed(2)} Cr`;
    }
    if (rupees >= 100000) {
      return `${isNegative ? '-' : ''}₹${(rupees / 100000).toFixed(2)} L`;
    }
    if (rupees >= 1000) {
      return `${isNegative ? '-' : ''}₹${(rupees / 1000).toFixed(1)} K`;
    }
  }

  const integerPart = Math.floor(rupees);
  const decimalPart = Math.round(absPaise % 100);

  // Indian numbering grouping: last 3 digits, then groups of 2 digits
  const intStr = integerPart.toString();
  let result = '';

  if (intStr.length <= 3) {
    result = intStr;
  } else {
    const lastThree = intStr.substring(intStr.length - 3);
    const otherNumbers = intStr.substring(0, intStr.length - 3);
    const withCommas = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    result = `${withCommas},${lastThree}`;
  }

  const formattedDecimals = decimalPart.toString().padStart(2, '0');
  const showDecimals = options?.showDecimals ?? (decimalPart > 0);

  const sign = isNegative ? '-' : '';
  return showDecimals ? `${sign}₹${result}.${formattedDecimals}` : `${sign}₹${result}`;
}

/**
 * Converts Indian Rupee user input float (e.g. 2500.50) safely to integer paise
 */
export function rupeesToPaise(rupees: number | string): number {
  if (typeof rupees === 'string') {
    rupees = parseFloat(rupees.replace(/[^\d.-]/g, '')) || 0;
  }
  return Math.round(rupees * 100);
}

/**
 * Converts integer paise to rupees for form input display
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export interface LineCalculationInput {
  basePricePaise: number;
  variantAdditionalPaise?: number;
  quantity: number;
  discountRule?: {
    type: 'percentage' | 'fixed';
    value: number; // percentage (e.g. 10 = 10%) or fixed paise
  };
  taxRatePercent: number;
  isTaxInclusive?: boolean;
}

export interface LineCalculationResult {
  unitPricePaise: number;
  subtotalPaise: number;
  discountPaise: number;
  netAfterDiscountPaise: number;
  taxAmountPaise: number;
  lineTotalPaise: number;
}

/**
 * Authoritative financial line calculation adhering strictly to Section 9:
 * 1. Base unit price + variant extra
 * 2. Multiply by quantity
 * 3. Apply eligible discount
 * 4. Apply tax
 * 5. Calculate line totals
 * 6. Cap discount so result is never negative
 */
export function calculateLineFinancials(input: LineCalculationInput): LineCalculationResult {
  const basePrice = Math.max(0, Math.round(input.basePricePaise));
  const variantExtra = Math.max(0, Math.round(input.variantAdditionalPaise || 0));
  const unitPricePaise = basePrice + variantExtra;
  const quantity = Math.max(1, Math.round(input.quantity));

  const subtotalPaise = unitPricePaise * quantity;

  let discountPaise = 0;
  if (input.discountRule) {
    if (input.discountRule.type === 'percentage') {
      const pct = Math.min(100, Math.max(0, input.discountRule.value));
      discountPaise = Math.round((subtotalPaise * pct) / 100);
    } else {
      discountPaise = Math.min(subtotalPaise, Math.round(input.discountRule.value));
    }
  }

  // Cap discount so line cannot become negative
  discountPaise = Math.min(subtotalPaise, discountPaise);
  const netAfterDiscountPaise = subtotalPaise - discountPaise;

  const taxRate = Math.max(0, input.taxRatePercent);
  let taxAmountPaise = 0;
  let lineTotalPaise = 0;

  if (input.isTaxInclusive) {
    // Tax is extracted from net total: Net = Base * (1 + rate/100) => Tax = Net - (Net / (1 + rate/100))
    taxAmountPaise = Math.round(netAfterDiscountPaise - (netAfterDiscountPaise / (1 + taxRate / 100)));
    lineTotalPaise = netAfterDiscountPaise;
  } else {
    // Tax is added on top of net amount
    taxAmountPaise = Math.round((netAfterDiscountPaise * taxRate) / 100);
    lineTotalPaise = netAfterDiscountPaise + taxAmountPaise;
  }

  return {
    unitPricePaise,
    subtotalPaise,
    discountPaise,
    netAfterDiscountPaise,
    taxAmountPaise,
    lineTotalPaise,
  };
}

/**
 * Calculates MRR (Monthly Recurring Revenue) normalized value for any subscription billing frequency
 */
export function normalizeMRRPaise(totalPaise: number, frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'): number {
  switch (frequency) {
    case 'daily':
      return Math.round(totalPaise * 30.4167); // standard average days in month
    case 'weekly':
      return Math.round((totalPaise * 52) / 12);
    case 'monthly':
      return totalPaise;
    case 'yearly':
      return Math.round(totalPaise / 12);
    default:
      return totalPaise;
  }
}

/**
 * Calculates ARR from MRR
 */
export function normalizeARRPaise(mrrPaise: number): number {
  return mrrPaise * 12;
}

/**
 * Proration calculator for mid-cycle changes:
 * Calculates fair prorated amount for remaining days in a billing period.
 */
export function calculateProration(
  currentPlanTotalPaise: number,
  newPlanTotalPaise: number,
  daysUsed: number,
  totalDaysInPeriod: number
): {
  daysRemaining: number;
  refundCreditPaise: number;
  chargePaise: number;
  netAdjustmentPaise: number; // positive = customer owes, negative = customer gets credit
} {
  const safeTotalDays = Math.max(1, totalDaysInPeriod);
  const safeDaysUsed = Math.min(safeTotalDays, Math.max(0, daysUsed));
  const daysRemaining = safeTotalDays - safeDaysUsed;

  // Credit for unused portion of old plan
  const refundCreditPaise = Math.round((currentPlanTotalPaise * daysRemaining) / safeTotalDays);
  // Charge for remaining days of new plan
  const chargePaise = Math.round((newPlanTotalPaise * daysRemaining) / safeTotalDays);

  const netAdjustmentPaise = chargePaise - refundCreditPaise;

  return {
    daysRemaining,
    refundCreditPaise,
    chargePaise,
    netAdjustmentPaise,
  };
}
