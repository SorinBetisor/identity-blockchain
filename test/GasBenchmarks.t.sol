// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {ConsentManager} from "../contracts/ConsentManager.sol";
import {IdentityRegistry} from "../contracts/IdentityRegistry.sol";
import {DataBroker} from "../contracts/DataBroker.sol";
import {DataSharingToken} from "../contracts/DataSharingToken.sol";

contract GasBenchmarks is Test {
    struct Stat {
        string label;
        uint256 gasUsed;
    }

    address internal constant VALIDATOR =
        0x0000000000000000000000042000000000000000;
    uint256 internal constant RUNS = 5;
    uint256 internal addrSalt;

    function test_GasReport() public {
        Stat[] memory deployments = new Stat[](4);
        deployments[0] = Stat({
            label: "IdentityRegistry deploy",
            gasUsed: _measureIdentityRegistryDeploy()
        });
        deployments[1] = Stat({
            label: "ConsentManager deploy",
            gasUsed: _measureConsentManagerDeploy()
        });
        deployments[2] = Stat({
            label: "DataSharingToken deploy",
            gasUsed: _measureDataSharingTokenDeploy()
        });
        deployments[3] = Stat({
            label: "DataBroker deploy",
            gasUsed: _measureDataBrokerDeploy()
        });

        Stat[] memory calls = new Stat[](7);
        calls[0] = Stat({
            label: "IdentityRegistry.register",
            gasUsed: _average(RUNS, _measureRegister)
        });
        calls[1] = Stat({
            label: "IdentityRegistry.updateProfile",
            gasUsed: _average(RUNS, _measureUpdateProfile)
        });
        calls[2] = Stat({
            label: "IdentityRegistry.updateDataPointer",
            gasUsed: _average(RUNS, _measureUpdateDataPointer)
        });
        calls[3] = Stat({
            label: "ConsentManager.createConsent",
            gasUsed: _average(RUNS, _measureCreateConsent)
        });
        calls[4] = Stat({
            label: "ConsentManager.changeStatus",
            gasUsed: _average(RUNS, _measureChangeConsentStatus)
        });
        calls[5] = Stat({
            label: "DataBroker.getCreditTier (steady)",
            gasUsed: _average(RUNS, _measureGetCreditTierSteadyState)
        });
        calls[6] = Stat({
            label: "DataBroker.getIncomeBand (steady)",
            gasUsed: _average(RUNS, _measureGetIncomeBandSteadyState)
        });

        _logDeployments(deployments);
        _logCalls(calls);

        // Basic sanity check to ensure we actually collected numbers
        assertGt(calls[5].gasUsed, 0);
        assertGt(calls[6].gasUsed, 0);
    }

    function _measureIdentityRegistryDeploy() internal returns (uint256) {
        uint256 gasBefore = gasleft();
        new IdentityRegistry();
        return gasBefore - gasleft();
    }

    function _measureConsentManagerDeploy() internal returns (uint256) {
        uint256 gasBefore = gasleft();
        new ConsentManager();
        return gasBefore - gasleft();
    }

    function _measureDataSharingTokenDeploy() internal returns (uint256) {
        uint256 gasBefore = gasleft();
        new DataSharingToken("Credit Data Sharing Token", "CDST");
        return gasBefore - gasleft();
    }

    function _measureDataBrokerDeploy() internal returns (uint256) {
        vm.pauseGasMetering();
        ConsentManager consentManager = new ConsentManager();
        IdentityRegistry identityRegistry = new IdentityRegistry();
        DataSharingToken token = new DataSharingToken(
            "Credit Data Sharing Token",
            "CDST"
        );
        vm.resumeGasMetering();

        uint256 gasBefore = gasleft();
        new DataBroker(
            address(consentManager),
            address(identityRegistry),
            address(token),
            10 ether
        );
        return gasBefore - gasleft();
    }

    function _measureRegister() internal returns (uint256) {
        vm.pauseGasMetering();
        IdentityRegistry identityRegistry = new IdentityRegistry();
        address user = _nextAddress("register");
        vm.resumeGasMetering();

        vm.prank(user);
        uint256 gasBefore = gasleft();
        identityRegistry.register();
        uint256 gasUsed = gasBefore - gasleft();
        vm.pauseGasMetering();
        return gasUsed;
    }

    function _measureUpdateProfile() internal returns (uint256) {
        vm.pauseGasMetering();
        IdentityRegistry identityRegistry = new IdentityRegistry();
        address user = _nextAddress("profile");
        vm.prank(user);
        identityRegistry.register();
        vm.resumeGasMetering();

        vm.prank(VALIDATOR);
        uint256 gasBefore = gasleft();
        identityRegistry.updateProfile(
            IdentityRegistry.CreditTier.MidGold,
            IdentityRegistry.IncomeBand.upto150k,
            user
        );
        uint256 gasUsed = gasBefore - gasleft();
        vm.pauseGasMetering();
        return gasUsed;
    }

    function _measureUpdateDataPointer() internal returns (uint256) {
        vm.pauseGasMetering();
        IdentityRegistry identityRegistry = new IdentityRegistry();
        address user = _nextAddress("pointer");
        vm.prank(user);
        identityRegistry.register();
        bytes32 pointer = keccak256(abi.encodePacked(user, block.timestamp));
        vm.resumeGasMetering();

        vm.prank(user);
        uint256 gasBefore = gasleft();
        identityRegistry.updateDataPointer(pointer);
        uint256 gasUsed = gasBefore - gasleft();
        vm.pauseGasMetering();
        return gasUsed;
    }

    function _measureCreateConsent() internal returns (uint256) {
        vm.pauseGasMetering();
        ConsentManager consentManager = new ConsentManager();
        address user = _nextAddress("consent-user");
        address requester = _nextAddress("consent-requester");
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = startDate + uint96(30 days);
        vm.resumeGasMetering();

        vm.prank(user);
        uint256 gasBefore = gasleft();
        consentManager.createConsent(requester, user, startDate, endDate);
        uint256 gasUsed = gasBefore - gasleft();
        vm.pauseGasMetering();
        return gasUsed;
    }

    function _measureChangeConsentStatus() internal returns (uint256) {
        vm.pauseGasMetering();
        ConsentManager consentManager = new ConsentManager();
        address user = _nextAddress("status-user");
        address requester = _nextAddress("status-requester");
        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = startDate + uint96(30 days);
        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);
        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        vm.resumeGasMetering();

        vm.prank(user);
        uint256 gasBefore = gasleft();
        consentManager.changeStatus(
            user,
            consentID,
            ConsentManager.ConsentStatus.Granted
        );
        uint256 gasUsed = gasBefore - gasleft();
        vm.pauseGasMetering();
        return gasUsed;
    }

    function _measureGetCreditTierSteadyState() internal returns (uint256) {
        vm.pauseGasMetering();
        (DataBroker dataBroker, address user, address requester) = _prepareBrokerStack();
        vm.prank(requester);
        dataBroker.getCreditTier(user); // warm-up to avoid counting reward minting cost
        vm.resumeGasMetering();

        vm.prank(requester);
        uint256 gasBefore = gasleft();
        dataBroker.getCreditTier(user);
        uint256 gasUsed = gasBefore - gasleft();
        vm.pauseGasMetering();
        return gasUsed;
    }

    function _measureGetIncomeBandSteadyState() internal returns (uint256) {
        vm.pauseGasMetering();
        (DataBroker dataBroker, address user, address requester) = _prepareBrokerStack();
        vm.prank(requester);
        dataBroker.getCreditTier(user); // warm-up reward and consent path
        vm.resumeGasMetering();

        vm.prank(requester);
        uint256 gasBefore = gasleft();
        dataBroker.getIncomeBand(user);
        uint256 gasUsed = gasBefore - gasleft();
        vm.pauseGasMetering();
        return gasUsed;
    }

    function _prepareBrokerStack()
        internal
        returns (DataBroker dataBroker, address user, address requester)
    {
        ConsentManager consentManager = new ConsentManager();
        IdentityRegistry identityRegistry = new IdentityRegistry();
        DataSharingToken rewardToken = new DataSharingToken(
            "Credit Data Sharing Token",
            "CDST"
        );
        dataBroker = new DataBroker(
            address(consentManager),
            address(identityRegistry),
            address(rewardToken),
            10 ether
        );
        rewardToken.addMinter(address(dataBroker));

        user = _nextAddress("broker-user");
        requester = _nextAddress("broker-requester");

        vm.prank(user);
        identityRegistry.register();

        vm.prank(VALIDATOR);
        identityRegistry.updateProfile(
            IdentityRegistry.CreditTier.MidGold,
            IdentityRegistry.IncomeBand.upto150k,
            user
        );

        uint96 startDate = uint96(block.timestamp);
        uint96 endDate = startDate + uint96(30 days);

        vm.prank(user);
        consentManager.createConsent(requester, user, startDate, endDate);

        bytes32 consentID = keccak256(abi.encodePacked(requester, user));
        vm.prank(user);
        consentManager.changeStatus(
            user,
            consentID,
            ConsentManager.ConsentStatus.Granted
        );
    }

    function _logDeployments(Stat[] memory deployments) internal pure {
        console2.log("\nDeployment gas summary:");
        for (uint256 i = 0; i < deployments.length; i++) {
            console2.log(deployments[i].label, deployments[i].gasUsed);
        }
    }

    function _logCalls(Stat[] memory calls) internal pure {
        console2.log("\nFunction call gas averages:");
        console2.log("Runs", RUNS);
        for (uint256 i = 0; i < calls.length; i++) {
            console2.log(calls[i].label, calls[i].gasUsed);
        }
    }

    function _average(
        uint256 runs,
        function() internal returns (uint256) measureFn
    ) internal returns (uint256) {
        uint256 total;
        for (uint256 i = 0; i < runs; i++) {
            total += measureFn();
        }
        return total / runs;
    }

    function _nextAddress(string memory tag) internal returns (address) {
        addrSalt++;
        return
            address(
                uint160(uint256(keccak256(abi.encodePacked(tag, addrSalt))))
            );
    }
}
