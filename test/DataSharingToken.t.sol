// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {DataSharingToken} from "../contracts/DataSharingToken.sol";

contract DataSharingTokenTest is Test {
    DataSharingToken public token;
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public spender = address(0x3);

    function setUp() public {
        token = new DataSharingToken("Credit Data Sharing Token", "CDST");
    }

    function test_MintOnlyMinter() public {
        token.mint(alice, 100 ether);

        assertEq(token.totalSupply(), 100 ether);
        assertEq(token.balanceOf(alice), 100 ether);
    }

    function test_Mint_RevertsForNonMinter() public {
        vm.expectRevert(DataSharingToken.NotMinter.selector);
        vm.prank(alice);
        token.mint(alice, 1 ether);
    }

    function test_OwnerCanManageMinters() public {
        token.addMinter(alice);

        vm.prank(alice);
        token.mint(bob, 5 ether);
        assertEq(token.balanceOf(bob), 5 ether);

        token.removeMinter(alice);
        vm.expectRevert(DataSharingToken.NotMinter.selector);
        vm.prank(alice);
        token.mint(bob, 1 ether);
    }

    function test_TransferAndAllowanceFlow() public {
        token.mint(alice, 20 ether);

        vm.prank(alice);
        token.transfer(bob, 5 ether);
        assertEq(token.balanceOf(alice), 15 ether);
        assertEq(token.balanceOf(bob), 5 ether);

        vm.prank(alice);
        token.approve(spender, 10 ether);

        vm.prank(spender);
        token.transferFrom(alice, bob, 7 ether);

        assertEq(token.balanceOf(alice), 8 ether);
        assertEq(token.balanceOf(bob), 12 ether);
        assertEq(token.allowance(alice, spender), 3 ether);
    }
}
