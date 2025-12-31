// SoloWipe Pro Subscription Tiers
export const SUBSCRIPTION_TIERS = {
  monthly: {
    price_id: "price_1SjwvU4hy5D3Fg1bxwaOEPJt",
    product_id: "prod_Tb5gxc2at1xv9q",
    name: "Monthly",
    price: 25,
    currency: "£",
    interval: "month",
  },
  annual: {
    price_id: "price_1SjwvU4hy5D3Fg1bfIEAV8aj",
    product_id: "prod_Tb5gDMeCzU9gNN",
    name: "Annual",
    price: 250,
    currency: "£",
    interval: "year",
    savings: 50,
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

export interface SubscriptionStatus {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  tier: SubscriptionTier | null;
}

// Helper to get tier from product ID
export function getTierFromProductId(productId: string | null): SubscriptionTier | null {
  if (!productId) return null;
  
  for (const [tier, config] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (config.product_id === productId) {
      return tier as SubscriptionTier;
    }
  }
  return null;
}
