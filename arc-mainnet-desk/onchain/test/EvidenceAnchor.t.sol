// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {EvidenceAnchor} from "../src/EvidenceAnchor.sol";

contract EvidenceAnchorTest is Test {
    EvidenceAnchor internal evidenceAnchor;

    address internal constant ALICE = address(0xA11CE);
    bytes32 internal constant DIGEST =
        0x8a7e4d6b0f926bf2b7145f6f4f0364e45d0f411cdfe13b85d09e4701e741bbd8;

    function setUp() public {
        evidenceAnchor = new EvidenceAnchor();
    }

    function testAnchorStoresDigestAndEmitsEvent() public {
        vm.warp(1_800_000_000);
        vm.expectEmit(true, true, false, true, address(evidenceAnchor));
        emit EvidenceAnchor.EvidenceAnchored(DIGEST, ALICE, uint64(block.timestamp));

        vm.prank(ALICE);
        uint64 anchoredAt = evidenceAnchor.anchor(DIGEST);

        assertEq(anchoredAt, uint64(block.timestamp));
        (bool exists, address submitter, uint64 observedAt) = evidenceAnchor.getAnchor(DIGEST);
        assertTrue(exists);
        assertEq(submitter, ALICE);
        assertEq(observedAt, anchoredAt);
        assertTrue(evidenceAnchor.isAnchored(DIGEST));
    }

    function testAnchorRejectsDuplicateDigest() public {
        vm.prank(ALICE);
        evidenceAnchor.anchor(DIGEST);

        vm.expectRevert(
            abi.encodeWithSelector(EvidenceAnchor.EvidenceAlreadyAnchored.selector, DIGEST)
        );
        vm.prank(address(0xB0B));
        evidenceAnchor.anchor(DIGEST);
    }

    function testAnchorRejectsEmptyDigest() public {
        vm.expectRevert(EvidenceAnchor.EmptyDigest.selector);
        evidenceAnchor.anchor(bytes32(0));
    }

    function testDirectValueTransferReverts() public {
        vm.deal(ALICE, 1 ether);
        vm.prank(ALICE);
        (bool success, bytes memory revertData) = address(evidenceAnchor).call{value: 1 wei}("");
        assertFalse(success);
        assertEq(revertData, abi.encodeWithSelector(EvidenceAnchor.ValueNotAccepted.selector));
        assertEq(ALICE.balance, 1 ether);
        assertEq(address(evidenceAnchor).balance, 0);
    }

    function testUnknownCallReverts() public {
        (bool success, bytes memory revertData) = address(evidenceAnchor).call(hex"12345678");
        assertFalse(success);
        assertEq(revertData, abi.encodeWithSelector(EvidenceAnchor.UnknownCall.selector));
    }
}
