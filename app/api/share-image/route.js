const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" fill="none">
  <rect width="1200" height="800" fill="#07131c"/>
  <circle cx="140" cy="120" r="180" fill="#7ef0c626"/>
  <circle cx="1030" cy="730" r="220" fill="#ff8f5a26"/>
  <rect x="64" y="64" width="1072" height="672" rx="32" fill="#0c2230" stroke="#24404f"/>
  <text x="108" y="220" fill="#eef7fb" font-size="88" font-family="Segoe UI, Arial" font-weight="700">Smallbetting</text>
  <text x="108" y="305" fill="#8ba6b5" font-size="34" font-family="Segoe UI, Arial">Bitcoin and football micro markets on Base</text>
  <text x="108" y="370" fill="#8ba6b5" font-size="34" font-family="Segoe UI, Arial">BTC 10m, EPL, LaLiga, UCL</text>
  <rect x="108" y="448" width="286" height="96" rx="18" fill="#ff8f5a"/>
  <text x="146" y="508" fill="#07131c" font-size="40" font-family="Segoe UI, Arial" font-weight="700">Launch Mini App</text>
  <text x="108" y="612" fill="#eef7fb" font-size="48" font-family="Segoe UI, Arial" font-weight="700">Max $5 entry</text>
  <text x="108" y="666" fill="#7ef0c6" font-size="30" font-family="Segoe UI, Arial">Live data only. Auto-void when one side is empty.</text>
</svg>`;

export async function GET() {
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
