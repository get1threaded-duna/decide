import type { ConnectResult, HealthMetrics, HealthProvider } from "../types";

/* ============================================================================
   APPLE HEALTHKIT PROVIDER  (stub — requires a native shell)
   ----------------------------------------------------------------------------
   HealthKit has NO web API. It is only reachable when the app runs inside a
   native iOS wrapper (Capacitor / Cordova / React Native) that bridges it to
   the web layer. There is also no Apple server-side REST API, so a pure
   Next.js/Vercel deployment cannot read HealthKit at all.

   To finish this provider:
     1. Wrap the app with Capacitor and add a HealthKit plugin
        (e.g. `@perfood/capacitor-healthkit` or `capacitor-health`).
     2. In Xcode: enable the HealthKit capability/entitlement and add
        `NSHealthShareUsageDescription` to Info.plist.
     3. Implement `connect()` to request read permissions for step count,
        active energy, sleep analysis, resting heart rate, and body mass.
     4. Implement `sync()` to query today's samples and map them onto
        `HealthMetrics` (convert kg → lb for weight).

   `isAvailable()` already guards all of this so it returns `false` — and this
   provider is never selected — in a plain browser.
   ========================================================================== */

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

function nativeIos(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return Boolean(cap?.isNativePlatform?.() && cap.getPlatform?.() === "ios");
}

function notWired(): never {
  throw new Error(
    "HealthKit provider is not wired up yet — it needs a Capacitor iOS shell " +
      "with a HealthKit plugin. See lib/health/providers/healthkit.ts.",
  );
}

export const healthKitProvider: HealthProvider = {
  id: "healthkit",
  name: "Apple Health",

  isAvailable() {
    // Only true inside a Capacitor native iOS runtime (with the plugin present).
    return nativeIos();
  },

  async connect(): Promise<ConnectResult> {
    return notWired();
  },

  async sync(_currentWeight: number): Promise<HealthMetrics> {
    void _currentWeight;
    return notWired();
  },
};
