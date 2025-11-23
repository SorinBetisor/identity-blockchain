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
  
}