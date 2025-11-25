Write-Host "Starting Identity Blockchain Development Environment..."

# 1. Start Hardhat Node in a new window
Write-Host "Starting Hardhat Node..."
Start-Process "npx" -ArgumentList "hardhat node" -WindowStyle Normal

# 2. Wait for node to initialize
Write-Host "Waiting 10 seconds for node to initialize..."
Start-Sleep -Seconds 10

# 3. Deploy Contracts (using Ignition with deployment-id)
Write-Host "Deploying contracts to localhost..."
# Remove old deployment if exists to force fresh deploy
if (Test-Path "ignition/deployments/local-dev") {
    Remove-Item -Path "ignition/deployments/local-dev" -Recurse -Force
}
npx hardhat ignition deploy ignition/modules/IdentitySystem.ts --network localhost --deployment-id local-dev

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment successful!"
} else {
    Write-Host "Deployment failed. Please check the logs."
    exit
}

# 4. Update Frontend Config
Write-Host "Updating frontend configuration..."
npx tsx scripts/update_frontend_config.ts

# 5. Start Frontend
Write-Host "Starting Frontend..."
Set-Location frontend
Start-Process "npm" -ArgumentList "run dev" -WindowStyle Normal

Write-Host "Development environment started!"
Write-Host "Frontend running at http://localhost:5173"
