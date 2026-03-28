import { NextResponse } from "next/server";
import { formatUnits } from "ethers";
import { getPosition, getPreviewClaim } from "../../../lib/server/contract.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = Number(searchParams.get("marketId"));
    const address = searchParams.get("address");
    if (!marketId || !address) {
      return NextResponse.json({ error: "marketId and address are required." }, { status: 400 });
    }

    const [position, claim] = await Promise.all([
      getPosition(marketId, address),
      getPreviewClaim(marketId, address).catch(() => ({ payout: 0n, fee: 0n }))
    ]);

    return NextResponse.json({
      amountA: Number(formatUnits(position.amountA, 6)),
      amountB: Number(formatUnits(position.amountB, 6)),
      claimed: position.claimed,
      claimable: Number(formatUnits(claim.payout, 6)),
      claimFee: Number(formatUnits(claim.fee, 6))
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to load position." }, { status: 500 });
  }
}
