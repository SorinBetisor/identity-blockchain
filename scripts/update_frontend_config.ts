import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const deploymentPath = path.join(
    __dirname,
    "../ignition/deployments/local-dev/deployed_addresses.json"
  );
  const contractsPath = path.join(__dirname, "../frontend/src/contracts.ts");

  if (!fs.existsSync(deploymentPath)) {
    console.error(`Deployment file not found at ${deploymentPath}`);
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("Found addresses:", addresses);

  if (fs.existsSync(contractsPath)) {
    let content = fs.readFileSync(contractsPath, "utf8");

    content = content.replace(
      /IdentityRegistry: ["']0x[a-fA-F0-9]{40}["']/,
      `IdentityRegistry: "${addresses["IdentitySystem#IdentityRegistry"]}"`
    );
    content = content.replace(
      /ConsentManager: ["']0x[a-fA-F0-9]{40}["']/,
      `ConsentManager: "${addresses["IdentitySystem#ConsentManager"]}"`
    );
    content = content.replace(
      /DataBroker: ["']0x[a-fA-F0-9]{40}["']/,
      `DataBroker: "${addresses["IdentitySystem#DataBroker"]}"`
    );
    content = content.replace(
      /DataSharingToken: ["']0x[a-fA-F0-9]{40}["']/,
      `DataSharingToken: "${addresses["IdentitySystem#DataSharingToken"]}"`
    );

    fs.writeFileSync(contractsPath, content);
    console.log(`Updated ${contractsPath} with new addresses.`);
  } else {
    console.error(`Could not find ${contractsPath}`);
    process.exit(1);
  }
}

main().catch(console.error);
