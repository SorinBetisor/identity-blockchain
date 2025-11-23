// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./ConsentManager.sol";
import "./IdentityRegistry.sol";


contract DataBroker {

  ConsentManager public consentManager;
  IdentityRegistry public identityRegistry;
  struct Requester 
  {
    address requesterDID;
    string requesterName;
    string requesterType;
  }

  constructor(address _consentManagerAddress, address _identityRegistryAddress) {
    consentManager = ConsentManager(_consentManagerAddress);
    identityRegistry = IdentityRegistry(_identityRegistryAddress);
  }

  function getCreditTier(address ownerDID) external view returns (IdentityRegistry.CreditTier) {
    require(
        consentManager.isConsentGranted(ownerDID, msg.sender),
        "No valid consent"
    );
    return identityRegistry.getCreditTier(ownerDID);
}

function getIncomeBand(address ownerDID) external view returns (IdentityRegistry.IncomeBand) {
    require(
        consentManager.isConsentGranted(ownerDID, msg.sender),
        "No valid consent"
    );
    return identityRegistry.getIncomeBand(ownerDID);
}
  
}