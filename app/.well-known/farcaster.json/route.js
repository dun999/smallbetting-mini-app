import { NextResponse } from "next/server";
import { APP_URL } from "../../../lib/config.js";

const iconUrl = `${APP_URL}/icon.png`;
const imageUrl = `${APP_URL}/image.png`;
const splashImageUrl = `${APP_URL}/splash.png`;

const miniAppConfig = {
  version: "1",
  name: "SmallBetting",
  homeUrl: APP_URL,
  iconUrl,
  imageUrl,
  buttonTitle: "Bet with a $5 cap",
  splashImageUrl,
  splashBackgroundColor: "#102433",
  subtitle: "Bet mini-app",
  description: "SmallBetting is a Base mini app for BTC and football micro prediction markets. This MVP uses claim-based settlement and a $5 maximum market exposure.",
  primaryCategory: "games",
  canonicalDomain: "smallbetting-mini-app.vercel.app",
  requiredChains: ["eip155:8453"],
  requiredCapabilities: ["wallet.getEthereumProvider"]
};

const accountAssociation = {
  header: "eyJmaWQiOjI0NTA0OCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweGYxYzY4ODM3NjBFODAwZjQ3NENGNmNmNEZjMTZjMDdhYkRmZTQ0N2EifQ",
  payload: "eyJkb21haW4iOiJzbWFsbGJldHRpbmctbWluaS1hcHAudmVyY2VsLmFwcCJ9",
  signature: "eHLvsHJ3eK+ltL28DIjQp3f5J+2Fb/yDZO/rhpbnDwMDSAz0ZuvaVMFq/UJI6J4YG9t9Gp8SrupNEBVxcL56Qxw="
};

export async function GET() {
  return NextResponse.json({
    miniapp: miniAppConfig,
    frame: miniAppConfig,
    accountAssociation
  });
}
