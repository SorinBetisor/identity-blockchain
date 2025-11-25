// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/**
 * @title IdentityRegistry
 * @notice Manages user identity registration and credit profile data on-chain
 */
contract IdentityRegistry {
    /// @notice Address of the trusted off-chain validator service
    address public immutable validator =
        0x0000000000000000000000042000000000000000;

    /**
     * @notice User identity structure
     * @param userDID Ethereum address of the user
     * @param creditTier Credit tier classification
     * @param incomeBand Income range classification
     * @param dataPointer Hash of off-chain FinancialData JSON file
     */
    struct Identity {
        address userDID;
        CreditTier creditTier;
        IncomeBand incomeBand;
        bytes32 dataPointer; // Hash of off-chain FinancialData JSON file
    }

    error AlreadyRegistered();
    error NotValidator();
    error NotRegistered();

    /**
     * @notice Income band classifications
     */
    enum IncomeBand {
        None,
        upto25k,
        upto50k,
        upto75k,
        upto100k,
        upto150k,
        upto200k,
        upto250k,
        upto300k,
        upto350k,
        upto400k,
        upto450k,
        upto500k,
        moreThan500k
    }

    /**
     * @notice Credit tier classifications
     */
    enum CreditTier {
        None,
        LowBronze,
        MidBronze,
        HighBronze,
        LowSilver,
        MidSilver,
        HighSilver,
        LowGold,
        MidGold,
        HighGold,
        LowPlatinum,
        MidPlatinum,
        HighPlatinum
    }

    /**
     * @notice Emitted when a new user registers
     * @param userDID Address of the registered user
     */
    event UserRegistered(address indexed userDID);

    /**
     * @notice Emitted when a user's profile is updated
     * @param userDID Address of the user
     * @param creditTier New credit tier value
     * @param incomeBand New income band value
     * @param dataPointer Hash of the off-chain financial data
     * @param updatedBy Address that performed the update
     * @param timestamp Block timestamp
     */
    event ProfileUpdated(
        address indexed userDID,
        CreditTier creditTier,
        IncomeBand incomeBand,
        bytes32 dataPointer,
        address indexed updatedBy,
        uint256 timestamp
    );

    /// @notice Mapping from user address to their identity data
    mapping(address => Identity) public identities;

    /**
     * @notice Modifier to restrict function access to trusted validator only
     */
    modifier onlyValidator() {
        if (msg.sender != validator) revert NotValidator();
        _;
    }

    /**
     * @notice Modifier to ensure user is registered before performing action
     */
    modifier onlyRegistered() {
        if (identities[msg.sender].userDID == address(0)) revert NotRegistered();
        _;
    }

    /**
     * @notice Register a new user identity on-chain
     */
    function register() external {
        if (identities[msg.sender].userDID != address(0))
            revert AlreadyRegistered();
        identities[msg.sender] = Identity({
            userDID: msg.sender,
            creditTier: CreditTier.None,
            incomeBand: IncomeBand.None,
            dataPointer: bytes32(0)
        });
        emit UserRegistered(msg.sender);
    }

    /**
     * @notice Verify that a user owns an address by checking a cryptographic signature
     * @param userAddress The Ethereum address to verify ownership of
     * @param message The message that was signed by the user
     * @param signature The cryptographic signature (65 bytes: r, s, v)
     * @return True if the signature is valid and matches the userAddress
     */
    function verifyAddressOwnership(
        address userAddress,
        string memory message,
        bytes memory signature
    ) external pure returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(message));
        // apply EIP-191 prefix: "\x19Ethereum Signed Message:\n32"
        // this prevents signatures from being used in other contexts
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        require(signature.length == 65, "Invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        // Recover the address that created this signature
        // ecrecover() uses elliptic curve cryptography to recover the public key
        // from the signature, which maps to the Ethereum address
        address recovered = ecrecover(ethSignedMessageHash, v, r, s);
        return recovered == userAddress && recovered != address(0);
    }

    /**
     * @notice Update the data pointer hash for the caller's identity
     * @param dataPointer SHA-256 hash of the off-chain financial data JSON file
     */
    function updateDataPointer(
        bytes32 dataPointer
    ) external onlyRegistered {
        Identity storage identity = identities[msg.sender];
        if (identity.dataPointer != dataPointer) {
            identity.dataPointer = dataPointer;
        }
        emit ProfileUpdated(
            msg.sender,
            identity.creditTier,
            identity.incomeBand,
            dataPointer,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Update user's credit profile (creditTier and incomeBand)
     * @param creditTier Calculated credit tier classification
     * @param incomeBand Calculated income band classification
     * @param userDID Address of the user whose profile is being updated
     */
    function updateProfile(
        CreditTier creditTier,
        IncomeBand incomeBand,
        address userDID
    ) external onlyValidator {
        Identity storage identity = identities[userDID];
        if (identity.userDID == address(0)) revert NotRegistered();
        if (identity.creditTier != creditTier) {
            identity.creditTier = creditTier;
        }
        if (identity.incomeBand != incomeBand) {
            identity.incomeBand = incomeBand;
        }
        emit ProfileUpdated(
            userDID,
            creditTier,
            incomeBand,
            identity.dataPointer,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Get the credit tier for a registered user
     * @param userDID Address of the user to query
     * @return Credit tier classification
     */
    function getCreditTier(address userDID) external view returns (CreditTier) {
        Identity storage identity = identities[userDID];
        if (identity.userDID == address(0)) revert NotRegistered();
        return identity.creditTier;
    }

    /**
     * @notice Get the income band for a registered user
     * @param userDID Address of the user to query
     * @return Income band classification
     */
    function getIncomeBand(address userDID) external view returns (IncomeBand) {
        Identity storage identity = identities[userDID];
        if (identity.userDID == address(0)) revert NotRegistered();
        return identity.incomeBand;
    }
}
