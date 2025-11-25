import { spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(
  command: string,
  args: string[],
  cwd: string = rootDir,
  waitForOutput?: RegExp
): Promise<void> {
  return new Promise((resolve, reject) => {
    log(`\n${colors.blue}▶ Running: ${command} ${args.join(" ")}${colors.reset}`);

    const proc = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    if (waitForOutput) {
      // For commands that need to wait for specific output
      proc.stdout?.on("data", (data: Buffer) => {
        const output = data.toString();
        if (waitForOutput.test(output)) {
          resolve();
        }
      });
      proc.stderr?.on("data", (data: Buffer) => {
        const output = data.toString();
        if (waitForOutput.test(output)) {
          resolve();
        }
      });
    } else {
      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });
    }

    proc.on("error", (error) => {
      reject(error);
    });
  });
}

function runCommandInBackground(
  command: string,
  args: string[],
  cwd: string = rootDir
): ChildProcess {
  log(`\n${colors.blue}▶ Starting in background: ${command} ${args.join(" ")}${colors.reset}`);

  const proc = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  proc.on("error", (error) => {
    log(`Error starting ${command}: ${error.message}`, colors.red);
  });

  return proc;
}

function waitForFile(filePath: string, timeout: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkInterval = 500;

    const checkFile = () => {
      if (fs.existsSync(filePath)) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for file: ${filePath}`));
      } else {
        setTimeout(checkFile, checkInterval);
      }
    };

    checkFile();
  });
}

async function main() {
  log(`${colors.bright}${colors.green}Starting Identity Blockchain Development Environment...${colors.reset}\n`);

  const processes: ChildProcess[] = [];

  try {
    // 1. Start Hardhat Node in background
    log(`${colors.yellow}Step 1: Starting Hardhat Node...${colors.reset}`);
    const hardhatNode = runCommandInBackground("npx", ["hardhat", "node"]);
    processes.push(hardhatNode);

    // Wait for Hardhat node to be ready
    log(`${colors.yellow}Waiting for Hardhat node to initialize...${colors.reset}`);
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds for node to start
    log(`${colors.green}✓ Hardhat node should be ready${colors.reset}`);

    // 2. Compile contracts
    log(`\n${colors.yellow}Step 2: Compiling contracts...${colors.reset}`);
    await runCommand("npx", ["hardhat", "compile"]);
    log(`${colors.green}✓ Contracts compiled${colors.reset}`);

    // 3. Deploy contracts
    log(`\n${colors.yellow}Step 3: Deploying contracts to localhost...${colors.reset}`);
    
    // Remove old deployment if exists to force fresh deploy
    const deploymentDir = path.join(rootDir, "ignition/deployments/local-dev");
    if (fs.existsSync(deploymentDir)) {
      log("Removing old deployment...");
      fs.rmSync(deploymentDir, { recursive: true, force: true });
    }

    await runCommand("npx", [
      "hardhat",
      "ignition",
      "deploy",
      "ignition/modules/IdentitySystem.ts",
      "--network",
      "localhost",
      "--deployment-id",
      "local-dev",
    ]);
    log(`${colors.green}✓ Contracts deployed${colors.reset}`);

    // 4. Update frontend config
    log(`\n${colors.yellow}Step 4: Updating frontend configuration...${colors.reset}`);
    await runCommand("npx", ["tsx", "scripts/update_frontend_config.ts"]);
    log(`${colors.green}✓ Frontend configuration updated${colors.reset}`);

    // 5. Start frontend dev server
    log(`\n${colors.yellow}Step 5: Starting frontend dev server...${colors.reset}`);
    const frontendDir = path.join(rootDir, "frontend");
    const frontendDev = runCommandInBackground("npm", ["run", "dev"], frontendDir);
    processes.push(frontendDev);

    // Wait a bit for frontend to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    log(`\n${colors.bright}${colors.green}✓ Development environment started!${colors.reset}`);
    log(`${colors.green}  • Hardhat node: http://127.0.0.1:8545${colors.reset}`);
    log(`${colors.green}  • Frontend: http://localhost:5173${colors.reset}`);
    log(`\n${colors.yellow}Press Ctrl+C to stop all services${colors.reset}\n`);

    // Handle cleanup on exit
    process.on("SIGINT", () => {
      log(`\n${colors.yellow}Shutting down services...${colors.reset}`);
      processes.forEach((proc) => {
        try {
          proc.kill();
        } catch (error) {
          // Ignore errors
        }
      });
      process.exit(0);
    });

    // Keep the script running
    await new Promise(() => {});
  } catch (error) {
    log(`\n${colors.red}✗ Error: ${error}${colors.reset}`, colors.red);
    
    // Cleanup on error
    processes.forEach((proc) => {
      try {
        proc.kill();
      } catch (e) {
        // Ignore errors
      }
    });
    
    process.exit(1);
  }
}

main().catch((error) => {
  log(`\n${colors.red}Fatal error: ${error}${colors.reset}`, colors.red);
  process.exit(1);
});

