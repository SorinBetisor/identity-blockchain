// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {ConsentManager} from "../contracts/ConsentManager.sol";

contract ConsentManagerTest is Test {
    ConsentManager public consentManager;
    address public user = address(0x1);
    address public requester = address(0x2);
    address public otherUser = address(0x3);

    function setUp() public {
        consentManager = new ConsentManager();
        vm.label(user, "User");
        vm.label(requester, "Requester");
        vm.label(otherUser, "OtherUser");
    }

    // ============ Create Consent Tests ============
    
    function test_CreateConsent_Success() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        (
            bytes32 storedConsentID,
            address requesterDID,
            ConsentManager.ConsentStatus status,
            uint96 storedStartDate,
            uint96 storedEndDate
        ) = consentManager.consents(user, consentID);
        
        assertEq(storedConsentID, consentID);
        assertEq(requesterDID, requester);
        assertEq(uint8(status), uint8(ConsentManager.ConsentStatus.Requested));
        assertEq(storedStartDate, startDate);
        assertEq(storedEndDate, endDate);
    }

    function test_CreateConsent_EmitsEvent() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        
        vm.expectEmit(true, true, true, true);
        emit ConsentManager.ConsentCreated(
            user,
            requester,
            consentID,
            startDate,
            endDate,
            block.timestamp
        );
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
    }

    function test_CreateConsent_DeterministicConsentID() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 expectedConsentID = keccak256(abi.encodePacked(requester, user));
        (
            bytes32 storedConsentID,
            ,
            ,
            ,
        ) = consentManager.consents(user, expectedConsentID);
        
        assertEq(storedConsentID, expectedConsentID);
    }

    function test_CreateConsent_InitialStatusIsRequested() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        (
            ,
            ,
            ConsentManager.ConsentStatus status,
            ,
        ) = consentManager.consents(user, consentID);
        
        assertEq(uint8(status), uint8(ConsentManager.ConsentStatus.Requested));
    }

    function test_CreateConsent_RevertIfNotOwner() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.expectRevert(ConsentManager.NotOwner.selector);
        vm.prank(otherUser);
        consentManager.createConsent(requester, user, startDate, endDate);
    }

    function test_CreateConsent_RevertIfInvalidRequesterDID() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.expectRevert("Invalid requesterDID");
        vm.prank(user);
        consentManager.createConsent(address(0), user, startDate, endDate);
    }

    function test_CreateConsent_RevertIfInvalidDates() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp - 1); // End before start
        
        vm.expectRevert("Start date must be before end date");
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
    }

    function test_CreateConsent_CanCreateMultipleConsents() public {
        address requester2 = address(0x4);
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        vm.prank(user);
        consentManager.createConsent(requester2, user, startDate, endDate);
        
        bytes32 consentID1 = keccak256(abi.encodePacked(requester, user));
        bytes32 consentID2 = keccak256(abi.encodePacked(requester2, user));
        
        (
            ,
            address requesterDID1,
            ,
            ,
        ) = consentManager.consents(user, consentID1);
        
        (
            ,
            address requesterDID2,
            ,
            ,
        ) = consentManager.consents(user, consentID2);
        
        assertEq(requesterDID1, requester);
        assertEq(requesterDID2, requester2);
    }

    // ============ Change Status Tests ============
    
    function test_ChangeStatus_Grant() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        
        vm.prank(user);
        consentManager.changeStatus(
            user,
            consentID,
            ConsentManager.ConsentStatus.Granted
        );
        
        (
            ,
            ,
            ConsentManager.ConsentStatus status,
            ,
        ) = consentManager.consents(user, consentID);
        
        assertEq(uint8(status), uint8(ConsentManager.ConsentStatus.Granted));
        assertTrue(consentManager.isConsentGranted(user, requester));
    }

    function test_ChangeStatus_Revoke() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
        
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Revoked);
        
        assertFalse(consentManager.isConsentGranted(user, requester));
    }

    function test_ChangeStatus_EmitsEvent() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        
        vm.expectEmit(true, true, true, true);
        emit ConsentManager.ConsentStatusChanged(
            user,
            requester,
            consentID,
            ConsentManager.ConsentStatus.Requested,
            ConsentManager.ConsentStatus.Granted,
            block.timestamp
        );
        
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
    }

    function test_ChangeStatus_AllStatusTransitions() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        
        // Requested -> Granted
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
        (
            ,
            ,
            ConsentManager.ConsentStatus status1,
            ,
        ) = consentManager.consents(user, consentID);
        assertEq(uint8(status1), uint8(ConsentManager.ConsentStatus.Granted));
        
        // Granted -> Revoked
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Revoked);
        (
            ,
            ,
            ConsentManager.ConsentStatus status2,
            ,
        ) = consentManager.consents(user, consentID);
        assertEq(uint8(status2), uint8(ConsentManager.ConsentStatus.Revoked));
        
        // Revoked -> Granted
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
        (
            ,
            ,
            ConsentManager.ConsentStatus status3,
            ,
        ) = consentManager.consents(user, consentID);
        assertEq(uint8(status3), uint8(ConsentManager.ConsentStatus.Granted));
    }

    function test_ChangeStatus_RevertIfNotOwner() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        
        vm.expectRevert(ConsentManager.NotOwner.selector);
        vm.prank(otherUser);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
    }

    function test_ChangeStatus_RevertIfInvalidConsentID() public {
        vm.expectRevert("Invalid consentID");
        vm.prank(user);
        consentManager.changeStatus(user, bytes32(0), ConsentManager.ConsentStatus.Granted);
    }

    function test_ChangeStatus_RevertIfConsentDoesNotExist() public {
        bytes32 fakeConsentID = keccak256("fake");
        
        vm.expectRevert(ConsentManager.InvalidConsent.selector);
        vm.prank(user);
        consentManager.changeStatus(user, fakeConsentID, ConsentManager.ConsentStatus.Granted);
    }

    // ============ Is Consent Granted Tests ============
    
    function test_IsConsentGranted_ReturnsTrue() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
        
        assertTrue(consentManager.isConsentGranted(user, requester));
    }

    function test_IsConsentGranted_ReturnsFalseIfRequested() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        assertFalse(consentManager.isConsentGranted(user, requester));
    }

    function test_IsConsentGranted_ReturnsFalseIfRevoked() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Revoked);
        
        assertFalse(consentManager.isConsentGranted(user, requester));
    }

    function test_IsConsentGranted_ReturnsFalseIfNotExists() public view {
        assertFalse(consentManager.isConsentGranted(user, requester));
    }

    function test_IsConsentGranted_RevertIfInvalidUserDID() public {
        vm.expectRevert("Invalid userDID");
        consentManager.isConsentGranted(address(0), requester);
    }

    function test_IsConsentGranted_RevertIfInvalidRequesterDID() public {
        vm.expectRevert("Invalid requesterDID");
        consentManager.isConsentGranted(user, address(0));
    }

    // ============ Gas Measurement ============
    
    function test_Gas_CreateConsent() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        uint256 gasBefore = gasleft();
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        uint256 gasUsed = gasBefore - gasleft();
        
        console2.log("Gas used for createConsent():", gasUsed);
    }

    function test_Gas_ChangeStatus() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        
        uint256 gasBefore = gasleft();
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
        uint256 gasUsed = gasBefore - gasleft();
        
        console2.log("Gas used for changeStatus():", gasUsed);
    }

    function test_Gas_IsConsentGranted() public {
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = uint96(block.timestamp + 30 days);
        
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        vm.prank(user);
        consentManager.changeStatus(user, consentID, ConsentManager.ConsentStatus.Granted);
        
        uint256 gasBefore = gasleft();
        consentManager.isConsentGranted(user, requester);
        uint256 gasUsed = gasBefore - gasleft();
        
        console2.log("Gas used for isConsentGranted():", gasUsed);
    }
}

