import type { ConnectResult, HealthMetrics, HealthProvider } from "../types";

/* ============================================================================
   FITBIT PROVIDER  (stub — real web OAuth path)
   ----------------------------------------------------------------------------
   Unlike Apple HealthKit, Fitbit exposes a cloud REST API with OAuth 2.0, so
   this one CAN be finished in a pure web app — no native shell required.

   To finish this provider:
     1. Register an app at dev.fitbit.com and set NEXT_PUBLIC_FITBIT_CLIENT_ID
        (+ a server-side client secret) in the environment.
     2. Implement `connect()` as an OAuth 2.0 PKCE / Authorization Code flow
        (redirect to Fitbit, handle the callback, store tokens server-side).
     3. Implement `sync()` to call the Activity, Sleep, Heart Rate, and Body
        endpoints and map the responses onto `HealthMetrics`.

   `isAvailable()` returns `false` until a client id is configured, so this
   provider is skipped by the resolver in that case.
   ========================================================================== */

function notWired(): never {
  throw new Error(
    "Fitbit provider is not wired up yet — configure NEXT_PUBLIC_FITBIT_CLIENT_ID " +
      "and implement the OAuth flow. See lib/health/providers/fitbit.ts.",
  );
}

export const fitbitProvider: HealthProvider = {
  id: "fitbit",
  name: "Fitbit",

  isAvailable() {
    // Requires a registered Fitbit app (OAuth client id) to be configured.
    return (
      typeof process !== "undefined" &&
      Boolean(process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID)
    );
  },

  async connect(): Promise<ConnectResult> {
    return notWired();
  },

  async sync(_currentWeight: number): Promise<HealthMetrics> {
    void _currentWeight;
    return notWired();
  },
};
