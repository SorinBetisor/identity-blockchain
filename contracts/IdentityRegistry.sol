// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/**
 * @title IdentityRegistry
 * @notice Manages user identity registration and credit profile data on-chain
 * @dev Stores minimal on-chain data (creditTier, incomeBand) while keeping detailed
 *      financial data off-chain. Only trusted validator can update credit scores.
 */
contract IdentityRegistry {
    /// @notice Address of the trusted off-chain validator service
    /// @dev This service validates documents and calculates credit scores off-chain
    address public immutable validator =
        0x0000000000000000000000042000000000000000;

    /**
     * @notice User identity structure containing creditworthiness data
     * @param userDID Ethereum address of the user (decentralized identifier)
     * @param creditTier Credit tier classification (Bronze/Silver/Gold/Platinum)
     * @param incomeBand Income range classification
     * @param dataPointer Hash of off-chain FinancialData JSON file for integrity verification
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
     * @dev Ranges from None (not set) to moreThan500k
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
     * @dev Ranges from None (not set) to HighPlatinum
     *      Each tier has Low/Mid/High sub-classifications
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
     * @param userDID Address of the user whose profile was updated
     * @param creditTier New credit tier value
     * @param incomeBand New income band value
     * @param dataPointer Hash of the off-chain financial data
     */
    event ProfileUpdated(
        address indexed userDID,
        CreditTier creditTier,
        IncomeBand incomeBand,
        bytes32 dataPointer
    );

    /// @notice Mapping from user address to their identity data
    mapping(address => Identity) public identities;

    /**
     * @notice Modifier to restrict function access to trusted validator only
     * @dev Reverts with NotValidator error if caller is not the validator
     */
    modifier onlyValidator() {
        if (msg.sender != validator) revert NotValidator();
        _;
    }

    /**
     * @notice Modifier to ensure user is registered before performing action
     * @dev Reverts with NotRegistered error if user hasn't registered
     */
    modifier onlyRegistered() {
        if (identities[msg.sender].userDID == address(0)) revert NotRegistered();
        _;
    }

    /**
     * @notice Register a new user identity on-chain
     * @dev Self-registration: msg.sender becomes the userDID
     *      Initializes identity with None values for creditTier and incomeBand
     *      User must be registered before validator can update their profile
     * @custom:emits UserRegistered
     * @custom:reverts AlreadyRegistered if user is already registered
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
     * @dev Uses EIP-191 message signing standard. This function does NOT store any data - it's a pure verification.
     *      Only the owner of the private key can create a valid signature, proving address ownership.
     * 
     * @param userAddress The Ethereum address to verify ownership of
     * @param message The message that was signed by the user (e.g., a challenge from the verifier)
     * @param signature The cryptographic signature (65 bytes: r, s, v) created by signing the message
     * @return True if the signature is valid and matches the userAddress, false otherwise
     * 
     * @custom:security This proves ownership because:
     *    - Only the private key owner can create a valid signature
     *    - Signature is mathematically linked to the private key
     *    - Cannot be forged without the private key
     *    - Standard Web3 pattern for address verification
     * 
     * @custom:note Nothing is stored on-chain - this is a pure verification function
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
     * @dev Users can update their dataPointer when they update their off-chain financial data
     *      The dataPointer is the hash of the off-chain FinancialData JSON file
     *      This allows users to update their data without validator intervention
     * @param dataPointer SHA-256 hash of the off-chain financial data JSON file
     * @custom:modifier onlyRegistered
     * @custom:emits ProfileUpdated
     */
    function updateDataPointer(
        bytes32 dataPointer
    ) external onlyRegistered {
        identities[msg.sender].dataPointer = dataPointer;
        emit ProfileUpdated(msg.sender, identities[msg.sender].creditTier, identities[msg.sender].incomeBand, dataPointer);
    }

    /**
     * @notice Update user's credit profile (creditTier and incomeBand)
     * @dev Only callable by the trusted validator service
     *      Validator calculates creditTier and incomeBand off-chain from validated documents
     *      This function is called after validator processes user's encrypted payslips
     * @param creditTier Calculated credit tier classification
     * @param incomeBand Calculated income band classification
     * @param userDID Address of the user whose profile is being updated
     * @custom:modifier onlyValidator
     * @custom:emits ProfileUpdated
     * @custom:reverts NotRegistered if user hasn't registered yet
     */
    function updateProfile(
        CreditTier creditTier,
        IncomeBand incomeBand,
        address userDID
    ) external onlyValidator {
        if (identities[userDID].userDID == address(0)) revert NotRegistered();
        identities[userDID].creditTier = creditTier;
        identities[userDID].incomeBand = incomeBand;
        emit ProfileUpdated(userDID, creditTier, incomeBand, identities[userDID].dataPointer);
    }

    /**
     * @notice Get the credit tier for a registered user
     * @param userDID Address of the user to query
     * @return Credit tier classification (None if not set)
     * @custom:reverts "Not registered" if user hasn't registered
     */
    function getCreditTier(address userDID) external view returns (CreditTier) {
        require(identities[userDID].userDID != address(0), "Not registered");
        return identities[userDID].creditTier;
    }

    /**
     * @notice Get the income band for a registered user
     * @param userDID Address of the user to query
     * @return Income band classification (None if not set)
     * @custom:reverts "Not registered" if user hasn't registered
     */
    function getIncomeBand(address userDID) external view returns (IncomeBand) {
        require(identities[userDID].userDID != address(0), "Not registered");
        return identities[userDID].incomeBand;
    }
}
