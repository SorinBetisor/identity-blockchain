// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract IdentityRegistry {
    address public immutable validator =
        0x0000000000000000000000042000000000000000; //represents the trusted off-chain validator address
    struct Identity {
        address userDID;
        CreditTier creditTier;
        IncomeBand incomeBand;
        bytes32 dataPointer; // Hash of off-chain FinancialData JSON file
    }
    error AlreadyRegistered();
    error NotValidator();
    error NotRegistered();
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

    event UserRegistered(address indexed userDID);
    event ProfileUpdated(
        address indexed userDID,
        CreditTier creditTier,
        IncomeBand incomeBand,
        bytes32 dataPointer
    );

    mapping(address => Identity) public identities;

    modifier onlyValidator() {
        if (msg.sender != validator) revert NotValidator();
        _;
    }

    modifier onlyRegistered() {
        if (identities[msg.sender].userDID == address(0)) revert NotRegistered();
        _;
    }

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

    function updateDataPointer(
        bytes32 dataPointer
    ) external onlyRegistered {
        identities[msg.sender].dataPointer = dataPointer;
        emit ProfileUpdated(msg.sender, identities[msg.sender].creditTier, identities[msg.sender].incomeBand, dataPointer);
    }

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

    function getCreditTier(address userDID) external view returns (CreditTier) {
        require(identities[userDID].userDID != address(0), "Not registered");
        return identities[userDID].creditTier;
    }

    function getIncomeBand(address userDID) external view returns (IncomeBand) {
        require(identities[userDID].userDID != address(0), "Not registered");
        return identities[userDID].incomeBand;
    }
}
