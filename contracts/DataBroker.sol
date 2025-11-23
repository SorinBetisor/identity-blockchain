// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./ConsentManager.sol";
import "./IdentityRegistry.sol";

/**
 * @title DataBroker
 * @notice Gateway contract that enforces consent verification before allowing data access
 * @dev Acts as the connection point between requesters, consents, and users.
 *      Requesters (e.g., banks) must have valid consent before accessing user data.
 *      This contract verifies consent and then retrieves data from IdentityRegistry.
 */
contract DataBroker {
    /// @notice Reference to the ConsentManager contract for consent verification
    ConsentManager public consentManager;

    /// @notice Reference to the IdentityRegistry contract for user data retrieval
    IdentityRegistry public identityRegistry;

    /**
     * @notice Requester information structure
     * @dev Currently defined but not actively used - reserved for future requester registration
     * @param requesterDID Ethereum address of the requester
     * @param requesterName Human-readable name of the requester (e.g., "Bank XYZ")
     * @param requesterType Type of requester (e.g., "bank", "lender", "fintech")
     */
    struct Requester {
        address requesterDID;
        string requesterName;
        string requesterType;
    }

    /**
     * @notice Initialize DataBroker with contract addresses
     * @dev Sets up references to ConsentManager and IdentityRegistry contracts
     * @param _consentManagerAddress Address of the deployed ConsentManager contract
     * @param _identityRegistryAddress Address of the deployed IdentityRegistry contract
     */
    constructor(
        address _consentManagerAddress,
        address _identityRegistryAddress
    ) {
        consentManager = ConsentManager(_consentManagerAddress);
        identityRegistry = IdentityRegistry(_identityRegistryAddress);
    }

    /**
     * @notice Get the credit tier for a user (with consent verification)
     * @dev Verifies that msg.sender (requester) has valid granted consent from the user
     *      before returning the credit tier. This is the main access point for requesters.
     * @param ownerDID Ethereum address of the user whose data is being requested
     * @return Credit tier classification (None, LowBronze, MidGold, etc.)
     * @custom:security Only requesters with valid granted consent can access data
     */
    function getCreditTier(
        address ownerDID
    ) external view returns (IdentityRegistry.CreditTier) {
        require(
            consentManager.isConsentGranted(ownerDID, msg.sender),
            "No valid consent"
        );
        return identityRegistry.getCreditTier(ownerDID);
    }

    /**
     * @notice Get the income band for a user (with consent verification)
     * @dev Verifies that msg.sender (requester) has valid granted consent from the user
     *      before returning the income band. This is the main access point for requesters.
     * @param ownerDID Ethereum address of the user whose data is being requested
     * @return Income band classification (None, upto25k, upto150k, etc.)
     * @custom:security Only requesters with valid granted consent can access data
     */
    function getIncomeBand(
        address ownerDID
    ) external view returns (IdentityRegistry.IncomeBand) {
        require(
            consentManager.isConsentGranted(ownerDID, msg.sender),
            "No valid consent"
        );
        return identityRegistry.getIncomeBand(ownerDID);
    }
}