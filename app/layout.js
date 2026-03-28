import "./globals.css";
import { APP_NAME, APP_URL } from "../lib/config.js";

const embed = {
  version: "1",
  imageUrl: `${APP_URL}/image.png`,
  button: {
    title: "Bet with a $5 cap",
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
  description: "SmallBetting is a Base mini app for BTC and football micro prediction markets."
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
