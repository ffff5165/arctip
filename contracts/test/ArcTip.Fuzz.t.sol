// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ArcTipTestBase} from "./ArcTip.Base.t.sol";
import {ArcTip} from "../ArcTip.sol";

contract ArcTipFuzzTest is ArcTipTestBase {
    function setUp() public override {
        super.setUp();
        _register(alice, "alice");
    }

    function testFuzz_Tip_ExactBalanceDeltas(uint256 amount, uint8 msgLen) public {
        amount = bound(amount, MIN_TIP, 1_000_000e6);
        uint256 len = bound(msgLen, 0, 140);
        string memory m = _rep("x", len);

        uint256 supBefore = usdc.balanceOf(carol);
        uint256 crBefore = usdc.balanceOf(alice);

        vm.prank(carol);
        usdc.approve(address(arcTip), amount);
        vm.expectEmit(true, true, false, true, address(arcTip));
        emit Tipped(alice, carol, amount, m);
        vm.prank(carol);
        arcTip.tip(alice, amount, m);

        assertEq(usdc.balanceOf(carol), supBefore - amount);
        assertEq(usdc.balanceOf(alice), crBefore + amount);
        assertEq(usdc.balanceOf(address(arcTip)), 0);
        assertEq(arcTip.totalReceived(alice), amount);
        assertEq(arcTip.tipCount(alice), 1);
    }

    function testFuzz_Tip_BelowMinReverts(uint256 amount) public {
        amount = bound(amount, 0, MIN_TIP - 1);
        vm.startPrank(carol);
        usdc.approve(address(arcTip), type(uint256).max);
        vm.expectRevert(ArcTip.TipTooSmall.selector);
        arcTip.tip(alice, amount, "");
        vm.stopPrank();
    }

    function testFuzz_Tip_MessageTooLongReverts(uint256 len) public {
        len = bound(len, 141, 1000);
        string memory m = _rep("x", len);
        vm.startPrank(carol);
        usdc.approve(address(arcTip), type(uint256).max);
        vm.expectRevert(ArcTip.MessageTooLong.selector);
        arcTip.tip(alice, MIN_TIP, m);
        vm.stopPrank();
    }

    function testFuzz_Tip_CumulativeTotals(uint256 a, uint256 b) public {
        a = bound(a, MIN_TIP, 100_000e6);
        b = bound(b, MIN_TIP, 100_000e6);
        _tip(carol, alice, a, "");
        _tip(carol, alice, b, "");
        assertEq(arcTip.totalReceived(alice), a + b);
        assertEq(arcTip.tipCount(alice), 2);
        assertEq(usdc.balanceOf(alice), a + b);
        assertEq(usdc.balanceOf(address(arcTip)), 0);
    }

    function testFuzz_Tip_InsufficientBalanceReverts(uint256 bal, uint256 amount) public {
        amount = bound(amount, MIN_TIP, 1_000_000e6);
        bal = bound(bal, 0, amount - 1);
        address poor = makeAddr("poor");
        usdc.mint(poor, bal);
        vm.startPrank(poor);
        usdc.approve(address(arcTip), type(uint256).max);
        vm.expectRevert();
        arcTip.tip(alice, amount, "");
        vm.stopPrank();
        assertEq(arcTip.tipCount(alice), 0);
    }

    function testFuzz_Register_ValidHandlesAccepted(bytes32 seed, uint256 len) public {
        len = bound(len, 3, 32);
        bytes memory alphabet = "abcdefghijklmnopqrstuvwxyz0123456789_";
        bytes memory h = new bytes(len);
        for (uint256 i; i < len; ++i) {
            h[i] = alphabet[uint8(seed[i % 32]) % alphabet.length];
        }
        vm.prank(bob);
        arcTip.registerCreator(string(h), "N", "", "");
        assertEq(arcTip.creatorOfHandle(string(h)), bob);
    }

    function testFuzz_Register_InvalidByteInHandleReverts(uint8 badByte, uint256 pos) public {
        bool allowed = (badByte >= 0x61 && badByte <= 0x7a) || (badByte >= 0x30 && badByte <= 0x39) || badByte == 0x5f;
        vm.assume(!allowed);
        bytes memory h = bytes("abcdefgh");
        h[bound(pos, 0, h.length - 1)] = bytes1(badByte);
        vm.prank(bob);
        vm.expectRevert(ArcTip.InvalidHandle.selector);
        arcTip.registerCreator(string(h), "N", "", "");
    }

    function testFuzz_Register_ArbitraryStringsNeverPanic(string calldata h) public {
        // Either succeeds (valid handle) or reverts with InvalidHandle; never any other error.
        vm.prank(bob);
        try arcTip.registerCreator(h, "N", "", "") {
            assertEq(arcTip.creatorOfHandle(h), bob);
        } catch (bytes memory err) {
            bytes4 sel = bytes4(err);
            // "alice" is already claimed in setUp, so HandleTaken is also legitimate
            assertTrue(sel == ArcTip.InvalidHandle.selector || sel == ArcTip.HandleTaken.selector);
        }
    }
}
