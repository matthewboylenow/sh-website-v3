/**
 * Global test setup.
 *
 * Two things happen here:
 *
 * 1. The timezone is pinned to America/New_York. The parish is in Westfield,
 *    NJ, Vercel runs in UTC, and several date bugs only appear when those
 *    two disagree. Running the suite in the parish's own zone is the point,
 *    not an accident.
 * 2. `server-only` is stubbed. Several lib modules import it so they can
 *    never be pulled into a client bundle; under Vitest that import throws.
 */
import { vi } from "vitest";

process.env.TZ = "America/New_York";

vi.mock("server-only", () => ({}));
