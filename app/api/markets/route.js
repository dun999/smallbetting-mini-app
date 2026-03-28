import { NextResponse } from "next/server";
import { getMarketDashboard } from "../../../lib/server/market-view.js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getMarketDashboard();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to load markets." }, { status: 500 });
  }
}
