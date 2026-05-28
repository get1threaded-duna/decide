export type Plan = "free" | "pro";

export interface PlanDefinition {
  id: Plan;
  label: string;
  priceLabel: string;
  features: string[];
  notFeatures?: string[];
}

export const PLANS: Record<Plan, PlanDefinition> = {
  free: {
    id: "free",
    label: "Free",
    priceLabel: "$0",
    features: [
      "Daily 6-card feed",
      "5 preset contexts (Home, LA, Tokyo, Rainy night, Saturday)",
      "Save what you like — Decide learns from it",
      "Streaming AI reasons on every card",
    ],
    notFeatures: [
      "Tune-me panel (your patterns + confidence + interests)",
      "Custom contexts",
    ],
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceLabel: "$8/mo",
    features: [
      "Everything in Free",
      "Tune-me panel: see your patterns, edit interests, watch confidence climb",
      "Unlimited custom contexts beyond the 5 presets",
      "Reasons that weight your stated interests more aggressively",
    ],
  },
};

export const PRO_PRICE_MONTHLY = process.env.STRIPE_PRICE_PRO_MONTHLY;
export const PRO_PRICE_ANNUAL = process.env.STRIPE_PRICE_PRO_ANNUAL;
