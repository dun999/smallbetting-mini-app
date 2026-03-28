import { NextResponse } from "next/server";
import { APP_NAME, APP_URL } from "../../../lib/config.js";

export async function GET() {
  return NextResponse.json({
    miniapp: {
      version: "1",
      name: APP_NAME,
      homeUrl: APP_URL,
      iconUrl: `${APP_URL}/api/share-image`,
      imageUrl: `${APP_URL}/api/share-image`,
      splashImageUrl: `${APP_URL}/api/share-image`,
      splashBackgroundColor: "#07131c",
      subtitle: "Micro prediction on Base",
      description: "Live BTC and football micro markets for Farcaster users."
    }
  });
}
