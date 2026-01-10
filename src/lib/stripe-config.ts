// Stripe Product and Price Configuration
export const STRIPE_PLANS = {
  pro_monthly: {
    name: "Pro Monthly",
    price_id: "price_1SoAhfJjsRVco0hGqutMTfLW",
    product_id: "prod_Tli75tIy2HN2aL",
    tier: "pro",
    billing: "monthly",
  },
  premium_monthly: {
    name: "Premium Monthly",
    price_id: "price_1SoAhqJjsRVco0hGeyMemSS5",
    product_id: "prod_Tli865CQ6mBUD6",
    tier: "premium",
    billing: "monthly",
  },
  pro_annual: {
    name: "Pro Annual",
    price_id: "price_1SoAi1JjsRVco0hGfuI2cIHn",
    product_id: "prod_Tli8UHDBewa47N",
    tier: "pro",
    billing: "annual",
  },
  premium_annual: {
    name: "Premium Annual",
    price_id: "price_1SoAmfJjsRVco0hGCgED3x64",
    product_id: "prod_TliD54QC5BpAwp",
    tier: "premium",
    billing: "annual",
  },
} as const;

export type SubscriptionTier = "free" | "pro" | "premium" | "enterprise";
export type BillingInterval = "monthly" | "annual";

export interface SubscriptionStatus {
  subscribed: boolean;
  tier: SubscriptionTier;
  subscription_end: string | null;
  price_id?: string;
}

// Feature access by tier
export const TIER_FEATURES = {
  free: {
    coverLettersPerMonth: 3,
    fitScore: true,
    interviewPrep: false,
    starGuides: false,
    toneCustomization: false,
    priorityAI: false,
    versionHistory: false,
    pdfExport: true,
    docxExport: false,
  },
  pro: {
    coverLettersPerMonth: -1, // unlimited
    fitScore: true,
    interviewPrep: true,
    starGuides: false,
    toneCustomization: false,
    priorityAI: false,
    versionHistory: true,
    pdfExport: true,
    docxExport: true,
  },
  premium: {
    coverLettersPerMonth: -1, // unlimited
    fitScore: true,
    interviewPrep: true,
    starGuides: true,
    toneCustomization: true,
    priorityAI: true,
    versionHistory: true,
    pdfExport: true,
    docxExport: true,
  },
  enterprise: {
    coverLettersPerMonth: -1, // unlimited
    fitScore: true,
    interviewPrep: true,
    starGuides: true,
    toneCustomization: true,
    priorityAI: true,
    versionHistory: true,
    pdfExport: true,
    docxExport: true,
  },
} as const;
