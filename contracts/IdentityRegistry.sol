// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract IdentityRegistry {
  
  struct IdentityOwner 
  {
    address userDID;
    string creditTier;
    string incomeBand;
    bytes32 dataPointer;  // Hash of off-chain FinancialData JSON file
    uint256 registrationDate;
  }

  // Asset and Liability data are stored OFF-CHAIN as JSON files
  // Only summary data (creditTier, incomeBand, netWorth) is stored on-chain
  // The dataPointer hash verifies the integrity of off-chain data

  mapping(address => IdentityOwner) public identityOwners;

  function registerIdentityOwner(address userDID, string memory creditTier) public {
    require(identityOwners[userDID].isActive == false, "IdentityOwner already registered");
    require(userDID != address(0), "Invalid userDID");

    identityOwners[userDID] = IdentityOwner
}