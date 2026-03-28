import { NextResponse } from "next/server";

const HOSTED_MANIFEST_URL = "https://api.farcaster.xyz/miniapps/hosted-manifest/019d33c8-7939-bbad-6277-a3f3a9426b72";

export async function GET() {
  return NextResponse.redirect(HOSTED_MANIFEST_URL, 307);
}
