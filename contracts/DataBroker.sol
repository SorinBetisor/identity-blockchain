// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./ConsentManager.sol";
import "./IdentityRegistry.sol";

/**
 * @title DataBroker
 * @notice Gateway contract that enforces consent verification before allowing data access
 */
contract DataBroker {
    /// @notice Reference to the ConsentManager contract for consent verification
    ConsentManager public consentManager;

    /// @notice Reference to the IdentityRegistry contract for user data retrieval
    IdentityRegistry public identityRegistry;

    /**
     * @notice Emitted when data access is granted
     * @param requesterDID Address of the requester
     * @param ownerDID Address of the user whose data was accessed
     * @param dataType Type of data accessed
     * @param timestamp Block timestamp
     */
    event DataAccessGranted(
        address indexed requesterDID,
        address indexed ownerDID,
        string dataType,
        uint256 timestamp
    );

    /**
     * @notice Emitted when data access is denied
     * @param requesterDID Address of the requester
     * @param ownerDID Address of the user whose data was requested
     * @param dataType Type of data requested
     * @param reason Reason for denial
     * @param timestamp Block timestamp
     */
    event DataAccessDenied(
        address indexed requesterDID,
        address indexed ownerDID,
        string dataType,
        string reason,
        uint256 timestamp
    );

    /**
     * @notice Requester information structure
     * @param requesterDID Ethereum address of the requester
     * @param requesterName Human-readable name of the requester
     * @param requesterType Type of requester
     */
    struct Requester {
        address requesterDID;
        string requesterName;
        string requesterType;
    }

    /**
     * @notice Initialize DataBroker with contract addresses
     * @param _consentManagerAddress Address of ConsentManager contract
     * @param _identityRegistryAddress Address of IdentityRegistry contract
     */
    constructor(
        address _consentManagerAddress,
        address _identityRegistryAddress
    ) {
        consentManager = ConsentManager(_consentManagerAddress);
        identityRegistry = IdentityRegistry(_identityRegistryAddress);
    }

    /**
     * @notice Get the credit tier for a user with consent verification
     * @param ownerDID Address of the user whose data is being requested
     * @return Credit tier classification
     */
    function getCreditTier(
        address ownerDID
    ) external returns (IdentityRegistry.CreditTier) {
        try identityRegistry.getCreditTier(ownerDID) returns (
            IdentityRegistry.CreditTier tier
        ) {
            // Check consent
            bool hasConsent = consentManager.isConsentGranted(
                ownerDID,
                msg.sender
            );
            if (!hasConsent) {
                emit DataAccessDenied(
                    msg.sender,
                    ownerDID,
                    "creditTier",
                    "No valid consent",
                    block.timestamp
                );
                revert("No valid consent");
            }
            // Access granted - emit audit log
            emit DataAccessGranted(
                msg.sender,
                ownerDID,
                "creditTier",
                block.timestamp
            );
            return tier;
        } catch Error(string memory reason) {
            // User not registered or other error
            emit DataAccessDenied(
                msg.sender,
                ownerDID,
                "creditTier",
                reason,
                block.timestamp
            );
            revert(reason);
        }
    }

    /**
     * @notice Get the income band for a user with consent verification
     * @param ownerDID Address of the user whose data is being requested
     * @return Income band classification
     */
    function getIncomeBand(
        address ownerDID
    ) external returns (IdentityRegistry.IncomeBand) {
        // Check if user is registered first
        try identityRegistry.getIncomeBand(ownerDID) returns (
            IdentityRegistry.IncomeBand band
        ) {
            // Check consent
            bool hasConsent = consentManager.isConsentGranted(
                ownerDID,
                msg.sender
            );
            if (!hasConsent) {
                emit DataAccessDenied(
                    msg.sender,
                    ownerDID,
                    "incomeBand",
                    "No valid consent",
                    block.timestamp
                );
                revert("No valid consent");
            }
            // Access granted - emit audit log
            emit DataAccessGranted(
                msg.sender,
                ownerDID,
                "incomeBand",
                block.timestamp
            );
            return band;
        } catch Error(string memory reason) {
            // User not registered or other error
            emit DataAccessDenied(
                msg.sender,
                ownerDID,
                "incomeBand",
                reason,
                block.timestamp
            );
            revert(reason);
        }
    }
}