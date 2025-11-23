// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/**
 * @title ConsentManager
 * @notice Manages consent agreements between identity owners and data requesters
 */
contract ConsentManager {
    /**
     * @notice Consent structure
     * @param consentID Unique identifier (hash of requesterDID + userDID)
     * @param requesterDID Address of the requester
     * @param status Current status
     * @param startDate Unix timestamp when consent becomes active
     * @param endDate Unix timestamp when consent expires
     */
    struct Consent {
        bytes32 consentID;
        address requesterDID;
        ConsentStatus status;
        uint96 startDate;
        uint96 endDate;
    }

    /**
     * @notice Consent status enumeration
     */
    enum ConsentStatus {
        None,
        Granted,
        Requested,
        Revoked,
        Expired
    }

    error NotOwner();
    error InvalidConsent();

    /**
     * @notice Emitted when a new consent is created
     * @param userDID Address of the user
     * @param requesterDID Address of the requester
     * @param consentID Unique identifier
     * @param startDate Unix timestamp
     * @param endDate Unix timestamp
     * @param timestamp Block timestamp
     */
    event ConsentCreated(
        address indexed userDID,
        address indexed requesterDID,
        bytes32 indexed consentID,
        uint96 startDate,
        uint96 endDate,
        uint256 timestamp
    );

    /**
     * @notice Emitted when consent status is changed
     * @param userDID Address of the user
     * @param requesterDID Address of the requester
     * @param consentID Unique identifier
     * @param oldStatus Previous status
     * @param newStatus New status
     * @param timestamp Block timestamp
     */
    event ConsentStatusChanged(
        address indexed userDID,
        address indexed requesterDID,
        bytes32 indexed consentID,
        ConsentStatus oldStatus,
        ConsentStatus newStatus,
        uint256 timestamp
    );

    /**
     * @notice Mapping from user address to consent ID to consent details
     */
    mapping(address => mapping(bytes32 => Consent)) public consents;

    /**
     * @notice Modifier to restrict function access to the consent owner only
     * @param userDID Address of the user who owns the consent
     */
    modifier onlyOwner(address userDID) {
        if (msg.sender != userDID) revert NotOwner();
        _;
    }

    /**
     * @notice Create a new consent agreement
     * @param requesterDID Address of the requester
     * @param userDID Address of the user granting consent
     * @param startDate Unix timestamp when consent becomes active
     * @param endDate Unix timestamp when consent expires
     */
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
        emit ConsentCreated(
            userDID,
            requesterDID,
            consentID,
            startDate,
            endDate,
            block.timestamp
        );
    }

    /**
     * @notice Change the status of an existing consent
     * @param userDID Address of the user who owns the consent
     * @param consentID Unique identifier of the consent
     * @param newStatus New status to set
     */
    function changeStatus(
        address userDID,
        bytes32 consentID,
        ConsentStatus newStatus
    ) external onlyOwner(userDID) {
        require(consentID != bytes32(0), "Invalid consentID");
        Consent storage c = consents[userDID][consentID];
        if (c.status == ConsentStatus.None) revert InvalidConsent();
        ConsentStatus oldStatus = c.status;
        c.status = newStatus;
        emit ConsentStatusChanged(
            userDID,
            c.requesterDID,
            consentID,
            oldStatus,
            newStatus,
            block.timestamp
        );
    }

    /**
     * @notice Check if a requester has valid granted consent from a user
     * @param userDID Address of the user
     * @param requesterDID Address of the requester
     * @return True if consent exists and status is Granted
     */
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
