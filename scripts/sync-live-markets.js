import "dotenv/config";
import { syncLiveMarkets } from "../lib/server/market-sync.js";

const result = await syncLiveMarkets();
console.log(JSON.stringify(result, null, 2));
