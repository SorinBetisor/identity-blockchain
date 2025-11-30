// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {ConsentManager} from "../contracts/ConsentManager.sol";
import {IdentityRegistry} from "../contracts/IdentityRegistry.sol";
import {DataBroker} from "../contracts/DataBroker.sol";
import {DataSharingToken} from "../contracts/DataSharingToken.sol";

/**
 * @title Integration Tests
 * @notice End-to-end integration tests for the Identity Blockchain platform
 * @dev Tests complete user workflows: registration → consent → data access → revocation
 * 
 * Test Coverage:
 * - Full user workflow from registration to data sharing
 * - Multi-party consent scenarios
 * - Token reward distribution
 * - Access control after consent revocation
 * - Multiple requesters accessing same user's data
 * 
 * Note: All test data uses synthetic addresses and values (no personal data)
 */
contract IntegrationTest is Test {
    // ============ Contract Instances ============
    IdentityRegistry public identityRegistry;
    ConsentManager public consentManager;
    DataSharingToken public rewardToken;
    DataBroker public dataBroker;

    // ============ Test Addresses ============
    address internal constant VALIDATOR = 0x0000000000000000000000042000000000000000;
    
    // Synthetic test users (not real personal data)
    address public borrower = address(0xB0AA0E1); // Borrower/data owner
    address public bank = address(0xBA41C);       // Bank/data requester
    address public lender = address(0x1E11DE2);   // Alternative lender
    address public fintech = address(0xF117EC4);  // Fintech company
    
    uint256 public constant REWARD_AMOUNT = 10 ether;

    // ============ Setup ============
    
    function setUp() public {
        // Deploy all contracts
        identityRegistry = new IdentityRegistry();
        consentManager = new ConsentManager();
        rewardToken = new DataSharingToken("Credit Data Sharing Token", "CDST");
        dataBroker = new DataBroker(
            address(consentManager),
            address(identityRegistry),
            address(rewardToken),
            REWARD_AMOUNT
        );
        
        // Grant minting rights to DataBroker for reward distribution
        rewardToken.addMinter(address(dataBroker));
        
        // Label addresses for better test output
        vm.label(borrower, "Borrower");
        vm.label(bank, "Bank");
        vm.label(lender, "Lender");
        vm.label(fintech, "Fintech");
        vm.label(VALIDATOR, "Validator");
    }

    // ============ Integration Test: Complete User Workflow ============
    
    /**
     * @notice Test complete workflow: registration → profile update → consent → data access
     * @dev Critical for verifying the platform's core data sharing functionality
     * 
     * Why this is critical:
     * - Validates the entire user journey works end-to-end
     * - Ensures consent-based access control functions correctly
     * - Verifies reward token distribution incentivizes data sharing
     */
    function test_Integration_CompleteUserWorkflow() public {
        // ========== STEP 1: User Registration ==========
        // User registers their identity on the platform
        vm.prank(borrower);
        identityRegistry.register();
        
        // Verify registration
        (IdentityRegistry.Identity memory identity, bool isRegistered) = 
            identityRegistry.getIdentity(borrower);
        assertTrue(isRegistered, "User should be registered");
        assertEq(identity.userDID, borrower, "UserDID should match");
        
        console2.log("Step 1: User registered successfully");

        // ========== STEP 2: Validator Updates Profile ==========
        // Off-chain validator verifies user data and updates on-chain profile
        vm.prank(VALIDATOR);
        identityRegistry.updateProfile(
            IdentityRegistry.CreditTier.HighGold,
            IdentityRegistry.IncomeBand.upto150k,
            borrower
        );
        
        // Verify profile update
        (identity, ) = identityRegistry.getIdentity(borrower);
        assertEq(
            uint8(identity.creditTier), 
            uint8(IdentityRegistry.CreditTier.HighGold),
            "Credit tier should be HighGold"
        );
        assertEq(
            uint8(identity.incomeBand),
            uint8(IdentityRegistry.IncomeBand.upto150k),
            "Income band should be upto150k"
        );
        
        console2.log("Step 2: Profile updated by validator");

        // ========== STEP 3: User Grants Consent to Bank ==========
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 365 days);
        
        // User creates consent request for bank
        vm.prank(borrower);
        consentManager.createConsent(bank, borrower, startDate, endDate);
        
        // User grants the consent
        bytes32 consentID = keccak256(abi.encodePacked(bank, borrower));
        vm.prank(borrower);
        consentManager.changeStatus(borrower, consentID, ConsentManager.ConsentStatus.Granted);
        
        // Verify consent is granted
        assertTrue(
            consentManager.isConsentGranted(borrower, bank),
            "Consent should be granted to bank"
        );
        
        console2.log("Step 3: Consent granted to bank");

        // ========== STEP 4: Bank Accesses User Data ==========
        // Bank requests credit tier through DataBroker
        vm.prank(bank);
        IdentityRegistry.CreditTier tier = dataBroker.getCreditTier(borrower);
        assertEq(
            uint8(tier),
            uint8(IdentityRegistry.CreditTier.HighGold),
            "Bank should receive correct credit tier"
        );
        
        // Bank requests income band
        vm.prank(bank);
        IdentityRegistry.IncomeBand band = dataBroker.getIncomeBand(borrower);
        assertEq(
            uint8(band),
            uint8(IdentityRegistry.IncomeBand.upto150k),
            "Bank should receive correct income band"
        );
        
        console2.log("Step 4: Bank accessed user data");

        // ========== STEP 5: Verify Reward Distribution ==========
        // User should have received reward tokens for sharing data
        uint256 userBalance = rewardToken.balanceOf(borrower);
        assertEq(
            userBalance,
            REWARD_AMOUNT,
            "User should receive reward tokens"
        );
        
        console2.log("Step 5: User received reward tokens:", userBalance);
        console2.log("WORKFLOW COMPLETE: Registration -> Consent -> Data Access -> Reward");
    }

    /**
     * @notice Test consent revocation blocks data access
     * @dev Critical for GDPR compliance and user data control
     * 
     * Why this is critical:
     * - Users must be able to revoke consent at any time
     * - Revoked consent must immediately block data access
     * - Ensures compliance with data protection regulations
     */
    function test_Integration_ConsentRevocationBlocksAccess() public {
        // Setup: Register user and grant consent
        _setupUserWithConsent(borrower, bank);
        
        // Verify initial access works
        vm.prank(bank);
        IdentityRegistry.CreditTier tier = dataBroker.getCreditTier(borrower);
        assertEq(uint8(tier), uint8(IdentityRegistry.CreditTier.MidGold));
        
        console2.log("Initial access granted");

        // ========== User Revokes Consent ==========
        bytes32 consentID = keccak256(abi.encodePacked(bank, borrower));
        vm.prank(borrower);
        consentManager.changeStatus(borrower, consentID, ConsentManager.ConsentStatus.Revoked);
        
        // Verify consent is revoked
        assertFalse(
            consentManager.isConsentGranted(borrower, bank),
            "Consent should be revoked"
        );
        
        console2.log("Consent revoked by user");

        // ========== Bank Access Denied ==========
        vm.prank(bank);
        vm.expectRevert(DataBroker.ConsentMissing.selector);
        dataBroker.getCreditTier(borrower);
        
        vm.prank(bank);
        vm.expectRevert(DataBroker.ConsentMissing.selector);
        dataBroker.getIncomeBand(borrower);
        
        console2.log("Access correctly denied after revocation");
    }

    /**
     * @notice Test multiple requesters accessing same user data
     * @dev Critical for multi-party consent management
     * 
     * Why this is critical:
     * - Users may share data with multiple financial institutions
     * - Each requester needs separate consent
     * - Rewards should be distributed for each new requester
     */
    function test_Integration_MultipleRequesters() public {
        // Setup: Register user with profile
        _registerAndSetupProfile(borrower);
        
        // Grant consent to multiple requesters
        _grantConsent(borrower, bank);
        _grantConsent(borrower, lender);
        _grantConsent(borrower, fintech);
        
        console2.log("Consent granted to 3 requesters");

        // Each requester accesses data
        vm.prank(bank);
        dataBroker.getCreditTier(borrower);
        
        vm.prank(lender);
        dataBroker.getCreditTier(borrower);
        
        vm.prank(fintech);
        dataBroker.getCreditTier(borrower);
        
        // User should receive rewards from each requester
        uint256 expectedReward = REWARD_AMOUNT * 3;
        assertEq(
            rewardToken.balanceOf(borrower),
            expectedReward,
            "User should receive rewards from all 3 requesters"
        );
        
        console2.log("User total rewards:", rewardToken.balanceOf(borrower));
    }

    /**
     * @notice Test selective consent - granting to one requester doesn't affect others
     * @dev Critical for granular consent control
     * 
     * Why this is critical:
     * - Users should have fine-grained control over who accesses their data
     * - Consent to one party must not grant access to others
     * - Validates isolation between different consent agreements
     */
    function test_Integration_SelectiveConsent() public {
        // Setup: Register user
        _registerAndSetupProfile(borrower);
        
        // Grant consent ONLY to bank
        _grantConsent(borrower, bank);
        
        // Bank can access
        vm.prank(bank);
        IdentityRegistry.CreditTier tier = dataBroker.getCreditTier(borrower);
        assertEq(uint8(tier), uint8(IdentityRegistry.CreditTier.MidGold));
        
        console2.log("Bank access: GRANTED");

        // Lender cannot access (no consent)
        vm.prank(lender);
        vm.expectRevert(DataBroker.ConsentMissing.selector);
        dataBroker.getCreditTier(borrower);
        
        console2.log("Lender access: DENIED (no consent)");

        // Fintech cannot access (no consent)
        vm.prank(fintech);
        vm.expectRevert(DataBroker.ConsentMissing.selector);
        dataBroker.getIncomeBand(borrower);
        
        console2.log("Fintech access: DENIED (no consent)");
    }

    /**
     * @notice Test re-granting consent after revocation
     * @dev Critical for user flexibility
     * 
     * Why this is critical:
     * - Users may change their mind and want to re-enable data sharing
     * - System should support consent lifecycle management
     * - Validates state transitions work correctly
     */
    function test_Integration_ReGrantConsentAfterRevocation() public {
        // Setup
        _setupUserWithConsent(borrower, bank);
        bytes32 consentID = keccak256(abi.encodePacked(bank, borrower));
        
        // Initial access works
        vm.prank(bank);
        dataBroker.getCreditTier(borrower);
        console2.log("Initial access: OK");

        // Revoke consent
        vm.prank(borrower);
        consentManager.changeStatus(borrower, consentID, ConsentManager.ConsentStatus.Revoked);
        
        // Access denied
        vm.prank(bank);
        vm.expectRevert(DataBroker.ConsentMissing.selector);
        dataBroker.getCreditTier(borrower);
        console2.log("After revocation: DENIED");

        // Re-grant consent
        vm.prank(borrower);
        consentManager.changeStatus(borrower, consentID, ConsentManager.ConsentStatus.Granted);
        
        // Access restored
        vm.prank(bank);
        IdentityRegistry.CreditTier tier = dataBroker.getCreditTier(borrower);
        assertEq(uint8(tier), uint8(IdentityRegistry.CreditTier.MidGold));
        console2.log("After re-grant: OK");
    }

    /**
     * @notice Test unregistered user cannot be accessed
     * @dev Critical for data integrity
     * 
     * Why this is critical:
     * - System must reject requests for non-existent users
     * - Prevents potential data leakage or confusion
     * - Validates proper error handling
     */
    function test_Integration_UnregisteredUserCannotBeAccessed() public {
        address unregisteredUser = address(0xDEAD);
        
        // Even if consent somehow existed, unregistered user cannot be queried
        vm.prank(bank);
        vm.expectRevert(DataBroker.UserNotRegistered.selector);
        dataBroker.getCreditTier(unregisteredUser);
        
        console2.log("Unregistered user access: DENIED");
    }

    /**
     * @notice Test data pointer update workflow
     * @dev Critical for off-chain data integrity verification
     * 
     * Why this is critical:
     * - Data pointers link on-chain identity to off-chain financial data
     * - Only the user should be able to update their data pointer
     * - Enables data integrity verification through hash comparison
     */
    function test_Integration_DataPointerWorkflow() public {
        // Register user
        vm.prank(borrower);
        identityRegistry.register();
        
        // User updates their data pointer (hash of off-chain financial data)
        bytes32 financialDataHash = keccak256("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG");
        
        vm.prank(borrower);
        identityRegistry.updateDataPointer(financialDataHash);
        
        // Verify data pointer is stored
        (IdentityRegistry.Identity memory identity, ) = identityRegistry.getIdentity(borrower);
        assertEq(identity.dataPointer, financialDataHash);
        
        console2.log("Data pointer updated successfully");
        
        // Update data pointer again (new financial data version)
        bytes32 newDataHash = keccak256("QmNewFinancialDataHash123456789");
        vm.prank(borrower);
        identityRegistry.updateDataPointer(newDataHash);
        
        (identity, ) = identityRegistry.getIdentity(borrower);
        assertEq(identity.dataPointer, newDataHash);
        
        console2.log("Data pointer updated to new version");
    }

    /**
     * @notice Test reward is only distributed once per requester-user pair
     * @dev Critical for economic model integrity
     * 
     * Why this is critical:
     * - Prevents reward farming through repeated access
     * - Ensures fair token distribution
     * - Maintains sustainable incentive model
     */
    function test_Integration_RewardOnlyOncePerPair() public {
        _setupUserWithConsent(borrower, bank);
        
        // First access - should receive reward
        vm.prank(bank);
        dataBroker.getCreditTier(borrower);
        assertEq(rewardToken.balanceOf(borrower), REWARD_AMOUNT);
        console2.log("First access reward:", REWARD_AMOUNT);

        // Second access by same requester - no additional reward
        vm.prank(bank);
        dataBroker.getCreditTier(borrower);
        assertEq(rewardToken.balanceOf(borrower), REWARD_AMOUNT);
        console2.log("Second access reward: 0 (already claimed)");

        // Third access (different function) - still no additional reward
        vm.prank(bank);
        dataBroker.getIncomeBand(borrower);
        assertEq(rewardToken.balanceOf(borrower), REWARD_AMOUNT);
        console2.log("Third access reward: 0 (already claimed)");
    }

    // ============ Gas Measurement Integration Tests ============

    /**
     * @notice Measure gas for complete user onboarding workflow
     */
    function test_Gas_CompleteOnboardingWorkflow() public {
        uint256 gasStart = gasleft();
        
        // Register
        vm.prank(borrower);
        identityRegistry.register();
        
        // Update profile
        vm.prank(VALIDATOR);
        identityRegistry.updateProfile(
            IdentityRegistry.CreditTier.MidGold,
            IdentityRegistry.IncomeBand.upto100k,
            borrower
        );
        
        // Update data pointer
        vm.prank(borrower);
        identityRegistry.updateDataPointer(keccak256("test-data"));
        
        uint256 totalGas = gasStart - gasleft();
        console2.log("Gas for complete onboarding:", totalGas);
    }

    /**
     * @notice Measure gas for consent grant and data access workflow
     */
    function test_Gas_ConsentAndAccessWorkflow() public {
        // Pre-setup
        _registerAndSetupProfile(borrower);
        
        uint256 gasStart = gasleft();
        
        // Create consent
        vm.prank(borrower);
        consentManager.createConsent(
            bank, 
            borrower, 
            uint96(block.timestamp), 
            uint96(block.timestamp + 30 days)
        );
        
        // Grant consent
        bytes32 consentID = keccak256(abi.encodePacked(bank, borrower));
        vm.prank(borrower);
        consentManager.changeStatus(borrower, consentID, ConsentManager.ConsentStatus.Granted);
        
        // Access data
        vm.prank(bank);
        dataBroker.getCreditTier(borrower);
        
        uint256 totalGas = gasStart - gasleft();
        console2.log("Gas for consent + access workflow:", totalGas);
    }

    // ============ Helper Functions ============
    
    function _registerAndSetupProfile(address user) internal {
        vm.prank(user);
        identityRegistry.register();
        
        vm.prank(VALIDATOR);
        identityRegistry.updateProfile(
            IdentityRegistry.CreditTier.MidGold,
            IdentityRegistry.IncomeBand.upto100k,
            user
        );
    }
    
    function _grantConsent(address user, address requester) internal {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 365 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
    }
    
    function _setupUserWithConsent(address user, address requester) internal {
        _registerAndSetupProfile(user);
        _grantConsent(user, requester);
    }
}

