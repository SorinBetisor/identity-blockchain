// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {DataBroker} from "../contracts/DataBroker.sol";
import {ConsentManager} from "../contracts/ConsentManager.sol";
import {IdentityRegistry} from "../contracts/IdentityRegistry.sol";
import {DataSharingToken} from "../contracts/DataSharingToken.sol";

contract DataBrokerTest is Test {
    DataBroker public dataBroker;
    ConsentManager public consentManager;
    IdentityRegistry public identityRegistry;
    DataSharingToken public rewardToken;
    
    address public validator = address(0x0000000000000000000000042000000000000000);
    address public user = address(0x1);
    address public requester = address(0x2);
    address public otherRequester = address(0x3);
    uint256 public rewardAmount = 10 ether;

    function setUp() public {
        identityRegistry = new IdentityRegistry();
        consentManager = new ConsentManager();
        rewardToken = new DataSharingToken("Credit Data Sharing Token", "CDST");
        dataBroker = new DataBroker(
            address(consentManager),
            address(identityRegistry),
            address(rewardToken),
            rewardAmount
        );
        rewardToken.addMinter(address(dataBroker));
        
        // Setup: Register user and set profile
        vm.prank(user);
        identityRegistry.register();
        
        vm.prank(validator);
        identityRegistry.updateProfile(
            IdentityRegistry.CreditTier.MidGold,
            IdentityRegistry.IncomeBand.upto150k,
            user
        );
    }

    function _grantConsent(address requesterAddr) internal returns (bytes32) {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);

        vm.prank(user);
        consentManager.createConsent(requesterAddr, user, startDate, endDate);

        bytes32 consentID = keccak256(abi.encodePacked(requesterAddr, user));
        vm.prank(user);
        consentManager.changeStatus(
            user,
            consentID,
            ConsentManager.ConsentStatus.Granted
        );

        return consentID;
    }

    // ============ Get Credit Tier Tests ============
    
    function test_GetCreditTier_WithConsent() public {
        // Create and grant consent
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
        
        // Access data
        vm.prank(requester);
        IdentityRegistry.CreditTier tier = dataBroker.getCreditTier(user);
        
        assertEq(uint8(tier), uint8(IdentityRegistry.CreditTier.MidGold));
    }

    function test_GetCreditTier_EmitsDataAccessGranted() public {
        // Setup consent
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
        
        // Expect event
        vm.expectEmit(true, true, false, false);
        emit DataBroker.DataAccessGranted(requester, user, "creditTier", block.timestamp);
        
        vm.prank(requester);
        dataBroker.getCreditTier(user);
    }

    function test_GetCreditTier_RevertIfNoConsent() public {
        vm.expectRevert(DataBroker.ConsentMissing.selector);
        vm.prank(requester);
        dataBroker.getCreditTier(user);
    }

    function test_GetCreditTier_EmitsDataAccessDenied_NoConsent() public {
        vm.expectEmit(true, true, false, true);
        emit DataBroker.DataAccessDenied(requester, user, "creditTier", "No valid consent", block.timestamp);
        
        vm.prank(requester);
        vm.expectRevert(DataBroker.ConsentMissing.selector);
        dataBroker.getCreditTier(user);
    }

    function test_GetCreditTier_EmitsDataAccessDenied_NotRegistered() public {
        address unregisteredUser = address(0x999);
        
        vm.expectEmit(true, true, false, true);
        emit DataBroker.DataAccessDenied(requester, unregisteredUser, "creditTier", "Not registered", block.timestamp);
        
        vm.prank(requester);
        vm.expectRevert(DataBroker.UserNotRegistered.selector);
        dataBroker.getCreditTier(unregisteredUser);
    }

    function test_GetCreditTier_RevertIfConsentRevoked() public {
        // Create and grant consent
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
        
        // Revoke consent
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Revoked);
        
        // Should revert
        vm.expectRevert(DataBroker.ConsentMissing.selector);
        vm.prank(requester);
        dataBroker.getCreditTier(user);
    }

    // ============ Get Income Band Tests ============
    
    function test_GetIncomeBand_WithConsent() public {
        // Create and grant consent
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
        
        // Access data
        vm.prank(requester);
        IdentityRegistry.IncomeBand band = dataBroker.getIncomeBand(user);
        
        assertEq(uint8(band), uint8(IdentityRegistry.IncomeBand.upto150k));
    }

    function test_GetIncomeBand_EmitsDataAccessGranted() public {
        // Setup consent
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
        
        // Expect event
        vm.expectEmit(true, true, false, false);
        emit DataBroker.DataAccessGranted(requester, user, "incomeBand", block.timestamp);
        
        vm.prank(requester);
        dataBroker.getIncomeBand(user);
    }

    function test_GetIncomeBand_RevertIfNoConsent() public {
        vm.expectRevert(DataBroker.ConsentMissing.selector);
        vm.prank(requester);
        dataBroker.getIncomeBand(user);
    }

    function test_GetIncomeBand_EmitsDataAccessDenied_NoConsent() public {
        vm.expectEmit(true, true, false, true);
        emit DataBroker.DataAccessDenied(requester, user, "incomeBand", "No valid consent", block.timestamp);
        
        vm.prank(requester);
        vm.expectRevert(DataBroker.ConsentMissing.selector);
        dataBroker.getIncomeBand(user);
    }

    function test_GetIncomeBand_RevertIfNotRegistered() public {
        address unregisteredUser = address(0x999);
        
        vm.expectRevert(DataBroker.UserNotRegistered.selector);
        vm.prank(requester);
        dataBroker.getIncomeBand(unregisteredUser);
    }

    // ============ Multiple Requesters Tests ============
    
    function test_MultipleRequesters_OnlyOneHasConsent() public {
        // User grants consent to requester but not otherRequester
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
        
        // requester can access
        vm.prank(requester);
        IdentityRegistry.CreditTier tier = dataBroker.getCreditTier(user);
        assertEq(uint8(tier), uint8(IdentityRegistry.CreditTier.MidGold));
        
        // otherRequester cannot access
        vm.expectRevert(DataBroker.ConsentMissing.selector);
        vm.prank(otherRequester);
        dataBroker.getCreditTier(user);
    }

    // ============ Reward Token Tests ============

    function test_RewardMintedOnFirstAccess() public {
        _grantConsent(requester);

        vm.prank(requester);
        dataBroker.getCreditTier(user);

        assertEq(rewardToken.balanceOf(user), rewardAmount);
    }

    function test_RewardOnlyOncePerRequesterPair() public {
        _grantConsent(requester);

        vm.prank(requester);
        dataBroker.getCreditTier(user);

        vm.prank(requester);
        dataBroker.getIncomeBand(user);

        bytes32 key = keccak256(abi.encodePacked(user, requester));
        assertTrue(dataBroker.rewardClaimed(key));
        assertEq(rewardToken.balanceOf(user), rewardAmount);
    }

    function test_RewardForDifferentRequesters() public {
        _grantConsent(requester);
        _grantConsent(otherRequester);

        vm.prank(requester);
        dataBroker.getCreditTier(user);

        vm.prank(otherRequester);
        dataBroker.getIncomeBand(user);

        assertEq(rewardToken.balanceOf(user), rewardAmount * 2);
    }

    // ============ Gas Measurement ============
    
    function test_Gas_GetCreditTier() public {
        // Setup consent
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
        
        uint256 gasBefore = gasleft();
        vm.prank(requester);
        dataBroker.getCreditTier(user);
        uint256 gasUsed = gasBefore - gasleft();
        
        console2.log("Gas used for getCreditTier():", gasUsed);
    }

    function test_Gas_GetIncomeBand() public {
        // Setup consent
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
        
        uint256 gasBefore = gasleft();
        vm.prank(requester);
        dataBroker.getIncomeBand(user);
        uint256 gasUsed = gasBefore - gasleft();
        
        console2.log("Gas used for getIncomeBand():", gasUsed);
    }
}

