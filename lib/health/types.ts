/* ============================================================================
   HEALTH PROVIDER CONTRACT
   ----------------------------------------------------------------------------
   A single abstraction the tracker talks to, so the data source (Apple Health,
   Fitbit, Garmin, Android Health Connect, or the demo mock) can be swapped
   without touching any UI. Every provider normalizes to `HealthMetrics` — that
   shape is the only contract the app depends on.
   ========================================================================== */

/** Normalized daily health snapshot. All providers return exactly this shape. */
export interface HealthMetrics {
  /** Steps taken today. */
  steps: number;
  /** Active energy burned today, in kcal. */
  activeCal: number;
  /** Last night's sleep duration, in hours. */
  sleepHr: number;
  /** Resting heart rate, in bpm. */
  restingHr: number;
  /** Most recent scale weight, in lb. */
  weight: number;
  /** ISO-8601 timestamp of when this snapshot was read. */
  syncedAt: string;
}

export type HealthProviderId =
  | "mock"
  | "healthkit"
  | "fitbit"
  | "health-connect"
  | "garmin";

/** Result of a connect() attempt. `error` is a human-readable reason on failure. */
export interface ConnectResult {
  ok: boolean;
  error?: string;
}

/**
 * A pluggable source of health data.
 *
 * Lifecycle: `isAvailable()` → `connect()` → `sync()` (repeatable) →
 * optionally `disconnect()`. `isAvailable()` MUST be safe to call in any
 * environment (including SSR and a plain browser) and never throw.
 */
export interface HealthProvider {
  /** Stable identifier, e.g. persisted alongside synced data. */
  readonly id: HealthProviderId;
  /** Human-readable name shown in the UI, e.g. "Apple Health". */
  readonly name: string;

  /**
   * Whether this provider can run in the current environment. Feature-detected
   * (native bridge present, OAuth client configured, etc.). Never throws.
   */
  isAvailable(): boolean | Promise<boolean>;

  /** Request permissions / establish the connection. */
  connect(): Promise<ConnectResult>;

  /**
   * Read today's samples and normalize to `HealthMetrics`.
   * @param currentWeight Last known bodyweight (lb). Providers that don't
   *   surface a scale weight can echo this back as `weight`.
   */
  sync(currentWeight: number): Promise<HealthMetrics>;

  /** Optional teardown / permission revoke. */
  disconnect?(): Promise<void>;
}
