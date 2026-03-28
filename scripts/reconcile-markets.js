import "dotenv/config";
import { reconcileMarkets } from "../lib/server/market-sync.js";

const result = await reconcileMarkets();
console.log(JSON.stringify(result, null, 2));
