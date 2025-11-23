// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract ConsentManager {
    struct Consent {
        bytes32 consentID;
        address requesterDID;
        ConsentStatus status;
        uint96 startDate;
        uint96 endDate;
    }

    enum ConsentStatus {
        None,
        Granted,
        Requested,
        Revoked,
        Expired
    }

    error NotOwner();
    error InvalidConsent();

    // userDID => consentID => consent
    mapping(address => mapping(bytes32 => Consent)) public consents;

    // modifier to only allow the owner of the consent (user) to perform actions
    modifier onlyOwner(address userDID) {
        if (msg.sender != userDID) revert NotOwner();
        _;
    }

    function createConsent(
        address requesterDID,
        address userDID,
        uint96 startDate,
        uint96 endDate
    ) external onlyOwner(userDID) {
        require(requesterDID != address(0), "Invalid requesterDID");
        require(startDate < endDate, "Start date must be before end date");
        bytes32 consentID = keccak256(abi.encodePacked(requesterDID, userDID));
        consents[userDID][consentID] = Consent({
            consentID: consentID,
            requesterDID: requesterDID,
            status: ConsentStatus.Requested,
            startDate: startDate,
            endDate: endDate
        });
    }

    function changeStatus(
        address userDID,
        bytes32 consentID,
        ConsentStatus newStatus
    ) external onlyOwner(userDID) {
        require(consentID != bytes32(0), "Invalid consentID");
        Consent storage c = consents[userDID][consentID];
        if (c.status == ConsentStatus.None) revert InvalidConsent();
        c.status = newStatus;
    }

    function isConsentGranted(
        address userDID,
        address requesterDID
    ) external view returns (bool) {
        require(userDID != address(0), "Invalid userDID");
        require(requesterDID != address(0), "Invalid requesterDID");

        return
            consents[userDID][
                keccak256(abi.encodePacked(requesterDID, userDID))
            ].status == ConsentStatus.Granted;
    }
}
