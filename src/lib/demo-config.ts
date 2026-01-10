// Demo Mode Configuration
// When demo mode is enabled, all users get Pro subscription features

export interface AppSettings {
  stripeEnabled: boolean;
  demoMode: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  stripeEnabled: false,
  demoMode: true,
};

// Demo subscription that simulates Pro tier
export const DEMO_SUBSCRIPTION = {
  subscribed: true,
  tier: "pro" as const,
  subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
  price_id: "demo_price_pro",
};
