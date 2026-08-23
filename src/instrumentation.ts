/**
 * Next.js Instrumentation Hook — runs once on server startup.
 * Ensures seed data is loaded exactly once, eliminating the per-request
 * COUNT(*) guard query that previously ran on every API call.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureSeedData } = await import("./lib/seed-data");
    await ensureSeedData();
  }
}
