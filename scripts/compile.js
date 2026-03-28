import fs from "fs";
import path from "path";
import solc from "solc";

const contractPath = path.join(process.cwd(), "contracts", "SmallBetting.sol");
const source = fs.readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "SmallBetting.sol": {
      content: source
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"]
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const fatal = output.errors.filter((entry) => entry.severity === "error");
  for (const entry of output.errors) {
    console.log(`${entry.severity.toUpperCase()}: ${entry.formattedMessage}`);
  }
  if (fatal.length > 0) {
    process.exit(1);
  }
}

const artifact = output.contracts["SmallBetting.sol"]["SmallBetting"];
fs.mkdirSync(path.join(process.cwd(), "artifacts"), { recursive: true });
fs.writeFileSync(
  path.join(process.cwd(), "artifacts", "SmallBetting.json"),
  JSON.stringify(
    {
      contractName: "SmallBetting",
      abi: artifact.abi,
      bytecode: artifact.evm.bytecode.object
    },
    null,
    2
  )
);

console.log("Compiled SmallBetting to artifacts/SmallBetting.json");
