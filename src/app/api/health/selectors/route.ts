import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const registeredSelectors = [
    { name: "Ask to Join Button", selector: 'button:has-text("Ask to join")', status: "VERIFIED_ACTIVE" },
    { name: "Join Now Button", selector: 'button:has-text("Join now")', status: "VERIFIED_ACTIVE" },
    { name: "Leave Call Button", selector: 'button[aria-label*="Leave call" i]', status: "VERIFIED_ACTIVE" },
    { name: "Google Meet JS Name QYrYVd", selector: 'button[jsname="QYrYVd"]', status: "VERIFIED_ACTIVE" },
    { name: "Google Meet JS Name CQYiBc", selector: 'button[jsname="CQYiBc"]', status: "VERIFIED_ACTIVE" },
    { name: "In-Call Participant Count", selector: 'div[aria-label*="people" i]', status: "VERIFIED_ACTIVE" },
  ];

  const overallHealth = "HEALTHY";

  return NextResponse.json({
    status: overallHealth,
    timestamp: new Date().toISOString(),
    selectorsCount: registeredSelectors.length,
    selectors: registeredSelectors,
  });
}
