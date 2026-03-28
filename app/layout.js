import "./globals.css";
import { APP_NAME, APP_URL } from "../lib/config.js";

const embed = {
  version: "1",
  imageUrl: `${APP_URL}/api/share-image`,
  button: {
    title: "Launch Smallbetting",
    action: {
      type: "launch_miniapp",
      name: APP_NAME,
      url: APP_URL
    }
  }
};

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: `${APP_NAME} | Base x Farcaster`,
  description: "Micro prediction mini app for BTC and football on Base."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="fc:miniapp" content={JSON.stringify(embed)} />
        <meta name="theme-color" content="#07131c" />
      </head>
      <body>{children}</body>
    </html>
  );
}
