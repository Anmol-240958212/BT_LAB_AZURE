export type ProductStatus = 'ACTIVE' | 'INACTIVE';
export type ProductRateType = 'SIMPLE' | 'COMPOUND';
export type ProductFrequency = 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUALLY' | 'AT_MATURITY' | string;
export type ProductDurationUnit = 'DAYS' | 'MONTHS' | 'YEARS';

export interface ProductTermLimit {
  min: number;
  max: number;
}

export interface ProductRateLimit {
  min: number;
  max: number;
}

export interface ProductRateMatrix {
  minAmount: number;
  maxAmount: number;
  durationFrom: number;
  durationTo: number;
  durationUnit: ProductDurationUnit;
  rate: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface ProductCharge {
  chargeCode: string;
  calculationType: 'FLAT' | 'PERCENTAGE' | string;
  amount?: number | null;
  percentage?: number | null;
  currencyCode?: string | null;
  frequency?: ProductFrequency | null;
}

export interface ProductRecord {
  productCode: string;
  productName: string;
  productType: string;
  productTypeName?: string;
  currency: string;
  description?: string | null;
  effectiveDate: string;
  effectiveTo?: string | null;
  status: ProductStatus;
  termLimit: ProductTermLimit;
  rateLimit: ProductRateLimit;
  baseRate?: number | null;
  maxAdditionalPercent?: number | null;
  rateType?: ProductRateType | null;
  frequency?: ProductFrequency | null;
  charges: ProductCharge[];
  allowedCustomerRoles: string[];
  transactionTypes: string[];
  rateMatrix: ProductRateMatrix[];
}

export interface ProductPage {
  content: ProductRecord[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ProductSearch {
  productType?: string;
  startDate?: string;
  endDate?: string;
  status?: ProductStatus;
  page?: number;
  size?: number;
}

export interface ProductCreateRequest {
  productCode: string;
  productName: string;
  productType: string;
  currency: string;
  description?: string;
  effectiveDate: string;
  effectiveTo?: string | null;
  termLimit: ProductTermLimit;
  rateLimit: ProductRateLimit;
  baseRate?: number | null;
  maxAdditionalPercent?: number | null;
  rateType?: ProductRateType | null;
  frequency?: ProductFrequency | null;
  charges?: ProductCharge[];
  allowedCustomerRoles?: string[];
  transactionTypes?: string[];
  rateMatrix?: ProductRateMatrix[];
}

export interface ProductUpdateRequest {
  productName?: string;
  description?: string;
  effectiveDate?: string;
  effectiveTo?: string | null;
  status?: ProductStatus;
  termLimit?: ProductTermLimit;
  rateLimit?: ProductRateLimit;
  baseRate?: number | null;
  rateType?: ProductRateType | null;
  frequency?: ProductFrequency | null;
  transactionTypes?: string[];
  maxAdditionalPercent?: number | null;
}

export interface CategoryRate {
  categoryCode: string;
  displayName: string;
  adjustmentPercent: number;
  minAge?: number | null;
  maxAge?: number | null;
  gender?: 'M' | 'F' | 'X' | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface EffectiveRateQuote {
  productCode: string;
  baseRate: number;
  totalAdjustmentPercent: number;
  effectiveRate: number;
  rateCap: number;
  additionalRateCap: number;
  capped: boolean;
  appliedCategories: string[];
}

export interface EffectiveRateQuery {
  categories?: string[];
  customerAge?: number;
  customerGender?: string;
  date?: string;
  principal?: number;
  term?: number;
  termUnit?: ProductDurationUnit;
}

export interface ProductSummary {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  productCountByType: Record<string, number>;
  minConfiguredRate: number;
  maxConfiguredRate: number;
  averageBaseRate: number;
}

export interface ProductValidation {
  valid: boolean;
  applicableRate: number | null;
  message: string;
}

export interface ProductPenalty {
  penaltyPercent: number | null;
  flatFee: number | null;
  currency: string;
  remarks: string;
}
