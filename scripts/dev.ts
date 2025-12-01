import { spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

// Determine Python executable path
function getPythonExecutable(): string {
  // Check if PYTHON_EXEC is explicitly set
  if (process.env.PYTHON_EXEC) {
    return process.env.PYTHON_EXEC;
  }

  // Check for virtual environment
  const venvDir = path.join(rootDir, ".venv");
  if (fs.existsSync(venvDir)) {
    if (process.platform === "win32") {
      const venvPython = path.join(venvDir, "Scripts", "python.exe");
      if (fs.existsSync(venvPython)) {
        return venvPython;
      }
    } else {
      const venvPython = path.join(venvDir, "bin", "python");
      if (fs.existsSync(venvPython)) {
        return venvPython;
      }
    }
  }

  // Fallback to system Python
  return "python";
}

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

async function ensurePythonEnvironment(): Promise<void> {
  const venvDir = path.join(rootDir, ".venv");
  const requirementsPath = path.join(rootDir, "off-chain", "requirements.txt");
  const systemPython = process.env.PYTHON_EXEC || "python";

  // Check if venv exists
  const venvExists = fs.existsSync(venvDir);

  if (!venvExists) {
    log(`${colors.yellow}Virtual environment not found. Creating .venv...${colors.reset}`);
    await runCommand(systemPython, ["-m", "venv", ".venv"]);
    log(`${colors.green}✅ Virtual environment created${colors.reset}`);
  }

  // Determine Python executable to use
  let venvPython: string;
  if (process.platform === "win32") {
    venvPython = path.join(venvDir, "Scripts", "python.exe");
  } else {
    venvPython = path.join(venvDir, "bin", "python");
  }

  // Check if requirements are installed by checking for fastapi
  const checkFastApi = spawn(venvPython, ["-c", "import fastapi"], {
    cwd: rootDir,
    stdio: "pipe",
    shell: process.platform === "win32",
  });

  const requirementsInstalled = await new Promise<boolean>((resolve) => {
    checkFastApi.on("close", (code) => {
      resolve(code === 0);
    });
    checkFastApi.on("error", () => {
      resolve(false);
    });
  });

  if (!requirementsInstalled) {
    log(`${colors.yellow}Installing Python dependencies...${colors.reset}`);
    await runCommand(venvPython, ["-m", "pip", "install", "-r", requirementsPath]);
    log(`${colors.green}✅ Python dependencies installed${colors.reset}`);
  } else {
    log(`${colors.green}✅ Python dependencies already installed${colors.reset}`);
  }
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
    log(`${colors.yellow}Waiting (10 seconds) for Hardhat node to initialize...${colors.reset}`);
    await new Promise((resolve) => setTimeout(resolve, 10000));
    log(`${colors.green}✅ Hardhat node should be ready${colors.reset}`);

    // 2. Compile contracts
    log(`\n${colors.yellow}Step 2: Compiling contracts...${colors.reset}`);
    await runCommand("npx", ["hardhat", "compile"]);
    log(`${colors.green}✅ Contracts compiled${colors.reset}`);

    // 3. Deploy contracts
    log(`\n${colors.yellow}Step 3: Deploying contracts to localhost...${colors.reset}`);

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
    log(`${colors.green}✅ Contracts deployed${colors.reset}`);

    // 4. Update frontend config
    log(`\n${colors.yellow}Step 4: Updating frontend configuration...${colors.reset}`);
    await runCommand("npx", ["tsx", "scripts/update_frontend_config.ts"]);
    log(`${colors.green}✅ Frontend configuration updated${colors.reset}`);

    // 5. Ensure Python virtual environment is set up
    log(`\n${colors.yellow}Step 5: Setting up Python environment...${colors.reset}`);
    await ensurePythonEnvironment();
    
    // Get the Python executable (will use venv if it exists)
    const pythonExec = getPythonExecutable();

    // 6. Start off-chain API server
    log(`\n${colors.yellow}Step 6: Starting off-chain API server...${colors.reset}`);
    const apiProc = runCommandInBackground(pythonExec, ["off-chain/api/server.py"]);
    processes.push(apiProc);

    // 7. Start frontend dev server
    log(`\n${colors.yellow}Step 7: Starting frontend dev server...${colors.reset}`);
    const frontendDir = path.join(rootDir, "frontend");
    const frontendDev = runCommandInBackground("npm", ["run", "dev"], frontendDir);
    processes.push(frontendDev);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    log(`\n${colors.bright}${colors.green}✅ Development environment started!${colors.reset}`);
    log(`${colors.green}  🌐 Hardhat node: http://127.0.0.1:8545${colors.reset}`);
    log(`${colors.green}  🧩 Off-chain API: http://127.0.0.1:8000${colors.reset}`);
    log(`${colors.green}  🖥️ Frontend: http://localhost:5173${colors.reset}`);
    log(`\n${colors.yellow}Press Ctrl+C to stop all services${colors.reset}\n`);

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

    await new Promise(() => {});
  } catch (error) {
    log(`\n${colors.red}❌ Error: ${error}${colors.reset}`, colors.red);

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

