// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {IdentityRegistry} from "../contracts/IdentityRegistry.sol";

contract IdentityRegistryTest is Test {
    IdentityRegistry public identityRegistry;
    address public validator = address(0x0000000000000000000000042000000000000000);
    address public user = address(0x1);
    address public otherUser = address(0x2);

    function setUp() public {
        // Deploy contract
        identityRegistry = new IdentityRegistry();
        
        // Label addresses for better error messages
        vm.label(user, "User");
        vm.label(otherUser, "OtherUser");
        vm.label(validator, "Validator");
    }

    // ============ Registration Tests ============
    
    function test_Register_Success() public {
        vm.prank(user);
        identityRegistry.register();
        
        (
            address userDID,
            IdentityRegistry.CreditTier creditTier,
            IdentityRegistry.IncomeBand incomeBand,
            bytes32 dataPointer
        ) = identityRegistry.identities(user);
        
        assertEq(userDID, user);
        assertEq(uint8(creditTier), uint8(IdentityRegistry.CreditTier.None));
        assertEq(uint8(incomeBand), uint8(IdentityRegistry.IncomeBand.None));
        assertEq(dataPointer, bytes32(0));
    }

    function test_Register_EmitsEvent() public {
        vm.expectEmit(true, false, false, false);
        emit IdentityRegistry.UserRegistered(user);
        
        vm.prank(user);
        identityRegistry.register();
    }

    function test_Register_RevertIfAlreadyRegistered() public {
        vm.prank(user);
        identityRegistry.register();
        
        vm.expectRevert(IdentityRegistry.AlreadyRegistered.selector);
        vm.prank(user);
        identityRegistry.register();
    }

    function test_Register_InitializesWithNoneValues() public {
        vm.prank(user);
        identityRegistry.register();
        
        (
            ,
            IdentityRegistry.CreditTier creditTier,
            IdentityRegistry.IncomeBand incomeBand,
        ) = identityRegistry.identities(user);
        
        assertEq(uint8(creditTier), uint8(IdentityRegistry.CreditTier.None));
        assertEq(uint8(incomeBand), uint8(IdentityRegistry.IncomeBand.None));
    }

    // ============ Update Profile Tests ============
    
    function test_UpdateProfile_OnlyValidator() public {
        vm.prank(user);
        identityRegistry.register();
        
        vm.prank(validator);
        identityRegistry.updateProfile(
            IdentityRegistry.CreditTier.MidGold,
            IdentityRegistry.IncomeBand.upto150k,
            user
        );
        
        (
            ,
            IdentityRegistry.CreditTier creditTier,
            IdentityRegistry.IncomeBand incomeBand,
        ) = identityRegistry.identities(user);
        
        assertEq(uint8(creditTier), uint8(IdentityRegistry.CreditTier.MidGold));
        assertEq(uint8(incomeBand), uint8(IdentityRegistry.IncomeBand.upto150k));
    }

    function test_UpdateProfile_EmitsEvent() public {
        vm.prank(user);
        identityRegistry.register();
        
        vm.expectEmit(true, false, false, true);
        emit IdentityRegistry.ProfileUpdated(
            user,
            IdentityRegistry.CreditTier.MidGold,
            IdentityRegistry.IncomeBand.upto150k,
            bytes32(0),
            validator,
            block.timestamp
        );
        
        vm.prank(validator);
        identityRegistry.updateProfile(
            IdentityRegistry.CreditTier.MidGold,
            IdentityRegistry.IncomeBand.upto150k,
            user
        );
    }

    function test_UpdateProfile_PreservesDataPointer() public {
        vm.prank(user);
        identityRegistry.register();
        
        bytes32 dataPointer = keccak256("test-data");
        vm.prank(user);
        identityRegistry.updateDataPointer(dataPointer);
        
        vm.prank(validator);
        identityRegistry.updateProfile(
            IdentityRegistry.CreditTier.MidGold,
            IdentityRegistry.IncomeBand.upto150k,
            user
        );
        
        (
            ,
            ,
            ,
            bytes32 storedDataPointer
        ) = identityRegistry.identities(user);
        
        assertEq(storedDataPointer, dataPointer);
    }

    function test_UpdateProfile_AllCreditTiers() public {
        vm.prank(user);
        identityRegistry.register();
        
        IdentityRegistry.CreditTier[] memory tiers = new IdentityRegistry.CreditTier[](13);
        tiers[0] = IdentityRegistry.CreditTier.LowBronze;
        tiers[1] = IdentityRegistry.CreditTier.MidBronze;
        tiers[2] = IdentityRegistry.CreditTier.HighBronze;
        tiers[3] = IdentityRegistry.CreditTier.LowSilver;
        tiers[4] = IdentityRegistry.CreditTier.MidSilver;
        tiers[5] = IdentityRegistry.CreditTier.HighSilver;
        tiers[6] = IdentityRegistry.CreditTier.LowGold;
        tiers[7] = IdentityRegistry.CreditTier.MidGold;
        tiers[8] = IdentityRegistry.CreditTier.HighGold;
        tiers[9] = IdentityRegistry.CreditTier.LowPlatinum;
        tiers[10] = IdentityRegistry.CreditTier.MidPlatinum;
        tiers[11] = IdentityRegistry.CreditTier.HighPlatinum;
        tiers[12] = IdentityRegistry.CreditTier.None;
        
        for (uint i = 0; i < tiers.length; i++) {
            vm.prank(validator);
            identityRegistry.updateProfile(
                tiers[i],
                IdentityRegistry.IncomeBand.upto150k,
                user
            );
            
            (
                ,
                IdentityRegistry.CreditTier creditTier,
                ,
            ) = identityRegistry.identities(user);
            
            assertEq(uint8(creditTier), uint8(tiers[i]));
        }
    }

    function test_UpdateProfile_RevertIfNotValidator() public {
        vm.prank(user);
        identityRegistry.register();
        
        vm.expectRevert(IdentityRegistry.NotValidator.selector);
        vm.prank(user);
        identityRegistry.updateProfile(
            IdentityRegistry.CreditTier.MidGold,
            IdentityRegistry.IncomeBand.upto150k,
            user
        );
    }

    function test_UpdateProfile_RevertIfNotRegistered() public {
        vm.expectRevert(IdentityRegistry.NotRegistered.selector);
        vm.prank(validator);
        identityRegistry.updateProfile(
            IdentityRegistry.CreditTier.MidGold,
            IdentityRegistry.IncomeBand.upto150k,
            user
        );
    }

    // ============ Update Data Pointer Tests ============
    
    function test_UpdateDataPointer_Success() public {
        vm.prank(user);
        identityRegistry.register();
        
        bytes32 dataPointer = keccak256("test-data");
        vm.prank(user);
        identityRegistry.updateDataPointer(dataPointer);
        
        (
            ,
            ,
            ,
            bytes32 storedDataPointer
        ) = identityRegistry.identities(user);
        
        assertEq(storedDataPointer, dataPointer);
    }

    function test_UpdateDataPointer_EmitsEvent() public {
        vm.prank(user);
        identityRegistry.register();
        
        bytes32 dataPointer = keccak256("test-data");
        vm.expectEmit(true, false, false, true);
        emit IdentityRegistry.ProfileUpdated(
            user,
            IdentityRegistry.CreditTier.None,
            IdentityRegistry.IncomeBand.None,
            dataPointer,
            user,
            block.timestamp
        );
        
        vm.prank(user);
        identityRegistry.updateDataPointer(dataPointer);
    }

    function test_UpdateDataPointer_RevertIfNotRegistered() public {
        bytes32 dataPointer = keccak256("test-data");
        vm.expectRevert(IdentityRegistry.NotRegistered.selector);
        vm.prank(user);
        identityRegistry.updateDataPointer(dataPointer);
    }

    // ============ Get Functions Tests ============
    
    function test_GetCreditTier_Success() public {
        vm.prank(user);
        identityRegistry.register();
        
        vm.prank(validator);
        identityRegistry.updateProfile(
            IdentityRegistry.CreditTier.MidGold,
            IdentityRegistry.IncomeBand.upto150k,
            user
        );
        
        IdentityRegistry.CreditTier tier = identityRegistry.getCreditTier(user);
        assertEq(uint8(tier), uint8(IdentityRegistry.CreditTier.MidGold));
    }

    function test_GetCreditTier_RevertIfNotRegistered() public {
        vm.expectRevert(IdentityRegistry.NotRegistered.selector);
        identityRegistry.getCreditTier(user);
    }

    function test_GetIncomeBand_Success() public {
        vm.prank(user);
        identityRegistry.register();
        
        vm.prank(validator);
        identityRegistry.updateProfile(
            IdentityRegistry.CreditTier.MidGold,
            IdentityRegistry.IncomeBand.upto150k,
            user
        );
        
        IdentityRegistry.IncomeBand band = identityRegistry.getIncomeBand(user);
        assertEq(uint8(band), uint8(IdentityRegistry.IncomeBand.upto150k));
    }

    function test_GetIncomeBand_RevertIfNotRegistered() public {
        vm.expectRevert(IdentityRegistry.NotRegistered.selector);
        identityRegistry.getIncomeBand(user);
    }

    // ============ Verify Address Ownership Tests ============
    
    function test_VerifyAddressOwnership_ValidSignature() public view {
        string memory message = "Test message";
        bytes32 messageHash = keccak256(abi.encodePacked(message));
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(1, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        address signer = vm.addr(1);
        bool isValid = identityRegistry.verifyAddressOwnership(signer, message, signature);
        assertTrue(isValid);
    }

    function test_VerifyAddressOwnership_InvalidSignature() public view {
        string memory message = "Test message";
        bytes memory signature = new bytes(65);
        
        address wrongAddress = address(0x999);
        bool isValid = identityRegistry.verifyAddressOwnership(wrongAddress, message, signature);
        assertFalse(isValid);
    }

    function test_VerifyAddressOwnership_InvalidSignatureLength() public {
        string memory message = "Test message";
        bytes memory signature = new bytes(64); // Wrong length
        
        address signer = address(0x1);
        vm.expectRevert("Invalid signature length");
        identityRegistry.verifyAddressOwnership(signer, message, signature);
    }

    // ============ Gas Measurement ============
    
    function test_Gas_Register() public {
        uint256 gasBefore = gasleft();
        vm.prank(user);
        identityRegistry.register();
        uint256 gasUsed = gasBefore - gasleft();
        
        console2.log("Gas used for register():", gasUsed);
        assertLt(gasUsed, 200000);
    }

    function test_Gas_UpdateProfile() public {
        vm.prank(user);
        identityRegistry.register();
        
        uint256 gasBefore = gasleft();
        vm.prank(validator);
        identityRegistry.updateProfile(
            IdentityRegistry.CreditTier.MidGold,
            IdentityRegistry.IncomeBand.upto150k,
            user
        );
        uint256 gasUsed = gasBefore - gasleft();
        
        console2.log("Gas used for updateProfile():", gasUsed);
    }

    function test_Gas_UpdateDataPointer() public {
        vm.prank(user);
        identityRegistry.register();
        
        bytes32 dataPointer = keccak256("test-data");
        uint256 gasBefore = gasleft();
        vm.prank(user);
        identityRegistry.updateDataPointer(dataPointer);
        uint256 gasUsed = gasBefore - gasleft();
        
        console2.log("Gas used for updateDataPointer():", gasUsed);
    }

    function test_Gas_GetCreditTier() public {
        vm.prank(user);
        identityRegistry.register();
        
        vm.prank(validator);
        identityRegistry.updateProfile(
            IdentityRegistry.CreditTier.MidGold,
            IdentityRegistry.IncomeBand.upto150k,
            user
        );
        
        uint256 gasBefore = gasleft();
        identityRegistry.getCreditTier(user);
        uint256 gasUsed = gasBefore - gasleft();
        
        console2.log("Gas used for getCreditTier():", gasUsed);
    }

    function test_Gas_GetIncomeBand() public {
        vm.prank(user);
        identityRegistry.register();
        
        vm.prank(validator);
        identityRegistry.updateProfile(
            IdentityRegistry.CreditTier.MidGold,
            IdentityRegistry.IncomeBand.upto150k,
            user
        );
        
        uint256 gasBefore = gasleft();
        identityRegistry.getIncomeBand(user);
        uint256 gasUsed = gasBefore - gasleft();
        
        console2.log("Gas used for getIncomeBand():", gasUsed);
    }
}
