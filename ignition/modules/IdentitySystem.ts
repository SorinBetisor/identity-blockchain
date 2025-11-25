import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deployment module for the Identity Blockchain system
 * 
 * Deploys all contracts in the correct order:
 * 1. IdentityRegistry - manages user identity registration
 * 2. ConsentManager - manages consent agreements
 * 3. DataSharingToken - ERC20 token for rewarding data sharing
 * 4. DataBroker - gateway contract that enforces consent verification
 */
export default buildModule("IdentitySystem", (m) => {
  // Configuration parameters
  const tokenName = m.getParameter("tokenName", "Data Sharing Token");
  const tokenSymbol = m.getParameter("tokenSymbol", "DST");
  const rewardPerAccess = m.getParameter("rewardPerAccess", "1000000000000000000"); // 1 token (18 decimals)

  // Step 1: Deploy IdentityRegistry (no constructor parameters)
  const identityRegistry = m.contract("IdentityRegistry");

  // Step 2: Deploy ConsentManager (no constructor parameters)
  const consentManager = m.contract("ConsentManager");

  // Step 3: Deploy DataSharingToken (requires name and symbol)
  const dataSharingToken = m.contract("DataSharingToken", [tokenName, tokenSymbol]);

  // Step 4: Deploy DataBroker (requires addresses of the other three contracts + reward amount)
  const dataBroker = m.contract("DataBroker", [
    consentManager,
    identityRegistry,
    dataSharingToken,
    rewardPerAccess,
  ]);

  // Grant DataBroker minter role on the token so it can mint rewards
  m.call(dataSharingToken, "addMinter", [dataBroker]);

  return {
    identityRegistry,
    consentManager,
    dataSharingToken,
    dataBroker,
  };
});

