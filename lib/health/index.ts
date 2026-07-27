/* ============================================================================
   HEALTH PROVIDER REGISTRY
   ----------------------------------------------------------------------------
   One place to register providers and resolve the best one for the current
   environment. The tracker imports `resolveHealthProvider()` and never needs to
   know which concrete source it's talking to.
   ========================================================================== */

import { fitbitProvider } from "./providers/fitbit";
import { healthKitProvider } from "./providers/healthkit";
import { mockProvider } from "./providers/mock";
import type { HealthProvider } from "./types";

export * from "./types";
export { mockProvider, healthKitProvider, fitbitProvider };

/**
 * All known providers, in resolution priority order: real sources first, the
 * always-available mock last.
 */
export const HEALTH_PROVIDERS: readonly HealthProvider[] = [
  healthKitProvider,
  fitbitProvider,
  mockProvider,
];

/**
 * Pick the best available provider for the current environment. Probes each in
 * priority order and returns the first that reports `isAvailable()`; a probe
 * that throws is treated as unavailable. Always falls back to the mock, so this
 * never rejects.
 */
export async function resolveHealthProvider(): Promise<HealthProvider> {
  for (const provider of HEALTH_PROVIDERS) {
    try {
      if (await provider.isAvailable()) return provider;
    } catch {
      /* provider probe failed — try the next one */
    }
  }
  return mockProvider;
}
