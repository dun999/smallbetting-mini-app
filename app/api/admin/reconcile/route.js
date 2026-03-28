import { NextResponse } from "next/server";
import { ADMIN_SECRET } from "../../../../lib/config.js";
import { reconcileMarkets } from "../../../../lib/server/market-sync.js";

export const dynamic = "force-dynamic";

function isAuthorized(request) {
  const secret = request.headers.get("x-admin-secret") || new URL(request.url).searchParams.get("secret");
  const userAgent = request.headers.get("user-agent") || "";
  const isVercelCron = userAgent.toLowerCase().includes("vercel-cron");
  return isVercelCron || (ADMIN_SECRET && secret === ADMIN_SECRET);
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await reconcileMarkets();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to reconcile markets." }, { status: 500 });
  }
}
