// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/**
 * @title ConsentManager
 * @notice Manages consent agreements between identity owners and data requesters
 * @dev Handles creation, granting, revocation, and validation of consents for data access.
 *      Users grant consent to requesters (e.g., banks) to access their credit data.
 *      Consent grants access to both creditTier and incomeBand data types.
 */
contract ConsentManager {
    /**
     * @notice Consent structure representing an agreement between user and requester
     * @param consentID Unique identifier for the consent (hash of requesterDID + userDID)
     * @param requesterDID Ethereum address of the requester (e.g., bank)
     * @param status Current status of the consent (None, Requested, Granted, Revoked, Expired)
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
     * @dev None: Consent doesn't exist
     *      Requested: Consent created but not yet granted
     *      Granted: Consent is active and can be used for data access
     *      Revoked: Consent was manually revoked by the user
     *      Expired: Consent has passed its endDate
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
     * @notice Mapping from user address to consent ID to consent details
     * @dev Allows multiple consents per user (one per requester)
     *      consentID = keccak256(requesterDID + userDID) ensures one consent per requester
     */
    mapping(address => mapping(bytes32 => Consent)) public consents;

    /**
     * @notice Modifier to restrict function access to the consent owner only
     * @dev Only the user (ownerDID) can create or modify their own consents
     *      Prevents unauthorized consent creation or modification
     * @param userDID The address of the user who owns the consent
     */
    modifier onlyOwner(address userDID) {
        if (msg.sender != userDID) revert NotOwner();
        _;
    }

    /**
     * @notice Create a new consent agreement
     * @dev User creates consent for a requester to access their data
     *      Consent is initially created with status "Requested" and must be granted separately
     *      Consent ID is deterministic: keccak256(requesterDID + userDID)
     *      This ensures one consent per requester-user pair
     * @param requesterDID Ethereum address of the requester (e.g., bank address)
     * @param userDID Ethereum address of the user granting consent (must be msg.sender)
     * @param startDate Unix timestamp when consent becomes active
     * @param endDate Unix timestamp when consent expires (must be after startDate)
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
    }

    /**
     * @notice Change the status of an existing consent
     * @dev Allows user to grant, revoke, or update consent status
     *      Common use: Change status from "Requested" to "Granted" to activate consent
     *      User can revoke active consent by changing status to "Revoked"
     * @param userDID Ethereum address of the user who owns the consent
     * @param consentID Unique identifier of the consent to modify
     * @param newStatus New status to set (Granted, Revoked, etc.)
     * @custom:modifier onlyOwner(userDID) - Only the user can change their consent status
     */
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

    /**
     * @notice Check if a requester has valid granted consent from a user
     * @dev Used by DataBroker to verify consent before allowing data access
     *      Checks if consent exists and status is "Granted"
     *      Note: Does not check expiration dates - that should be done separately if needed
     * @param userDID Ethereum address of the user (data owner)
     * @param requesterDID Ethereum address of the requester (data requester)
     * @return True if consent exists and status is Granted, false otherwise
     * @custom:reverts "Invalid userDID" if userDID is zero address
     * @custom:reverts "Invalid requesterDID" if requesterDID is zero address
     * @custom:note This function is called by DataBroker before returning data
     * @custom:note Returns false if consent doesn't exist, is Requested, Revoked, or Expired
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
