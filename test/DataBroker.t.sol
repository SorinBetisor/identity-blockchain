// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {DataBroker} from "../contracts/DataBroker.sol";
import {ConsentManager} from "../contracts/ConsentManager.sol";
import {IdentityRegistry} from "../contracts/IdentityRegistry.sol";

contract DataBrokerTest is Test {
    DataBroker public dataBroker;
    ConsentManager public consentManager;
    IdentityRegistry public identityRegistry;
    
    address public validator = address(0x0000000000000000000000042000000000000000);
    address public user = address(0x1);
    address public requester = address(0x2);
    address public otherRequester = address(0x3);

    function setUp() public {
        identityRegistry = new IdentityRegistry();
        consentManager = new ConsentManager();
        dataBroker = new DataBroker(
            address(consentManager),
            address(identityRegistry)
        );
        
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
        vm.expectRevert("No valid consent");
        vm.prank(requester);
        dataBroker.getCreditTier(user);
    }

    function test_GetCreditTier_EmitsDataAccessDenied_NoConsent() public {
        vm.expectEmit(true, true, false, true);
        emit DataBroker.DataAccessDenied(requester, user, "creditTier", "No valid consent", block.timestamp);
        
        vm.prank(requester);
        vm.expectRevert("No valid consent");
        dataBroker.getCreditTier(user);
    }

    function test_GetCreditTier_EmitsDataAccessDenied_NotRegistered() public {
        address unregisteredUser = address(0x999);
        
        vm.expectEmit(true, true, false, true);
        emit DataBroker.DataAccessDenied(requester, unregisteredUser, "creditTier", "Not registered", block.timestamp);
        
        vm.prank(requester);
        vm.expectRevert("Not registered");
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
        vm.expectRevert("No valid consent");
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
        vm.expectRevert("No valid consent");
        vm.prank(requester);
        dataBroker.getIncomeBand(user);
    }

    function test_GetIncomeBand_EmitsDataAccessDenied_NoConsent() public {
        vm.expectEmit(true, true, false, true);
        emit DataBroker.DataAccessDenied(requester, user, "incomeBand", "No valid consent", block.timestamp);
        
        vm.prank(requester);
        vm.expectRevert("No valid consent");
        dataBroker.getIncomeBand(user);
    }

    function test_GetIncomeBand_RevertIfNotRegistered() public {
        address unregisteredUser = address(0x999);
        
        vm.expectRevert("Not registered");
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
        vm.expectRevert("No valid consent");
        vm.prank(otherRequester);
        dataBroker.getCreditTier(user);
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

