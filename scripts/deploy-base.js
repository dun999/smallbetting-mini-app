import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

const artifactPath = path.join(process.cwd(), "artifacts", "SmallBetting.json");
if (!fs.existsSync(artifactPath)) {
  throw new Error("Artifact missing. Run npm run compile first.");
}

const keyPath = path.join(process.cwd(), "key.txt");
if (!fs.existsSync(keyPath)) {
  throw new Error("key.txt not found in workspace root.");
}

const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const usdc = process.env.BASE_USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const treasury = process.env.TREASURY_ADDRESS;

if (!treasury) {
  throw new Error("TREASURY_ADDRESS is required in .env");
}

const privateKey = fs.readFileSync(keyPath, "utf8").trim();
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);

const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
const flatFee = 10_000n;
const winnerFeeBps = 150n;
const maxEntry = 5_000_000n;

console.log(`Deploying from ${wallet.address} to Base mainnet via ${rpcUrl}`);

const contract = await factory.deploy(usdc, treasury, flatFee, winnerFeeBps, maxEntry);
await contract.waitForDeployment();

const deployment = {
  network: "base-mainnet",
  chainId: 8453,
  contract: await contract.getAddress(),
  owner: wallet.address,
  treasury,
  usdc,
  flatFee: flatFee.toString(),
  winnerFeeBps: winnerFeeBps.toString(),
  maxEntry: maxEntry.toString(),
  deployedAt: new Date().toISOString()
};

fs.writeFileSync(path.join(process.cwd(), "artifacts", "deployment-base-mainnet.json"), JSON.stringify(deployment, null, 2));

console.log(JSON.stringify(deployment, null, 2));
