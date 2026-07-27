import type { ConnectResult, HealthMetrics, HealthProvider } from "../types";

/* ============================================================================
   MOCK PROVIDER
   ----------------------------------------------------------------------------
   The always-available fallback. Returns plausible demo data so the Sync UI is
   fully wired without any device. Real providers (HealthKit, Fitbit, …) take
   priority over this whenever they report `isAvailable()`.
   ========================================================================== */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (base: number, spread: number) =>
  Math.round(base + (Math.random() - 0.5) * spread);

export const mockProvider: HealthProvider = {
  id: "mock",
  name: "Demo device",

  isAvailable() {
    return true;
  },

  async connect(): Promise<ConnectResult> {
    await delay(500);
    return { ok: true };
  },

  async sync(currentWeight: number): Promise<HealthMetrics> {
    await delay(600);
    return {
      steps: jitter(8200, 3000),
      activeCal: jitter(430, 160),
      sleepHr: +(6.8 + Math.random() * 1.6).toFixed(1),
      restingHr: jitter(58, 6),
      weight: +(currentWeight + (Math.random() - 0.4) * 0.4).toFixed(1),
      syncedAt: new Date().toISOString(),
    };
  },
};
