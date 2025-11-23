// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract DataBroker {

  struct Requester 
  {
    address requesterDID;
    string requesterName;
    string requesterType;
  }

  modifier onlyRequester(address requesterDID) {
    require(msg.sender == requesterDID, "Only requester can perform this action");
    _;
  }

  
}