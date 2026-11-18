// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ArcTipTestBase} from "./ArcTip.Base.t.sol";
import {ArcTip} from "../ArcTip.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

contract ArcTipTipTest is ArcTipTestBase {
    function setUp() public override {
        super.setUp();
        _register(alice, "alice");
        _register(bob, "bobby");
    }

    function test_Tip_ExactBalanceChanges() public {
        uint256 amount = 2_500_000; // 2.5 USDC
        uint256 supBefore = usdc.balanceOf(carol);
        uint256 crBefore = usdc.balanceOf(alice);

        _tip(carol, alice, amount, "great work");

        assertEq(usdc.balanceOf(carol), supBefore - amount);
        assertEq(usdc.balanceOf(alice), crBefore + amount);
        assertEq(usdc.balanceOf(address(arcTip)), 0);
        assertEq(usdc.balanceOf(bob), 0);
    }

    function test_Tip_UpdatesCountersAndConsumesAllowance() public {
        _tip(carol, alice, 20_000, "a");
        _tip(carol, alice, 30_000, "b");
        _tip(carol, bob, 10_000, "");
        assertEq(arcTip.totalReceived(alice), 50_000);
        assertEq(arcTip.tipCount(alice), 2);
        assertEq(arcTip.totalReceived(bob), 10_000);
        assertEq(arcTip.tipCount(bob), 1);
        assertEq(usdc.allowance(carol, address(arcTip)), 0);
        assertEq(usdc.balanceOf(address(arcTip)), 0);
    }

    function test_Tip_EmitsTipped() public {
        vm.prank(carol);
        usdc.approve(address(arcTip), 123_456);
        vm.expectEmit(true, true, false, true, address(arcTip));
        emit Tipped(alice, carol, 123_456, "hello alice");
        vm.prank(carol);
        arcTip.tip(alice, 123_456, "hello alice");
    }

    function test_Tip_EmitsTippedWithEmptyMessage() public {
        vm.prank(carol);
        usdc.approve(address(arcTip), MIN_TIP);
        vm.expectEmit(true, true, false, true, address(arcTip));
        emit Tipped(alice, carol, MIN_TIP, "");
        vm.prank(carol);
        arcTip.tip(alice, MIN_TIP, "");
    }

    function test_Tip_ExactlyMinTipSucceeds() public {
        _tip(carol, alice, MIN_TIP, "");
        assertEq(usdc.balanceOf(alice), MIN_TIP);
    }

    function test_Tip_RevertsBelowMinTip() public {
        vm.startPrank(carol);
        usdc.approve(address(arcTip), MIN_TIP);
        vm.expectRevert(ArcTip.TipTooSmall.selector);
        arcTip.tip(alice, MIN_TIP - 1, "");
        vm.stopPrank();
    }

    function test_Tip_RevertsZeroAmount() public {
        vm.prank(carol);
        vm.expectRevert(ArcTip.TipTooSmall.selector);
        arcTip.tip(alice, 0, "");
    }

    function test_Tip_Message140BytesOk() public {
        string memory m = _rep("m", 140);
        _tip(carol, alice, MIN_TIP, m);
        assertEq(arcTip.tipCount(alice), 1);
    }

    function test_Tip_Message141BytesReverts() public {
        string memory m = _rep("m", 141);
        vm.startPrank(carol);
        usdc.approve(address(arcTip), MIN_TIP);
        vm.expectRevert(ArcTip.MessageTooLong.selector);
        arcTip.tip(alice, MIN_TIP, m);
        vm.stopPrank();
    }

    function test_Tip_MessageLimitIsBytesNotChars() public {
        // 71 two-byte chars = 142 bytes
        string memory m = "";
        for (uint256 i; i < 71; ++i) {
            m = string.concat(m, unicode"é");
        }
        vm.startPrank(carol);
        usdc.approve(address(arcTip), MIN_TIP);
        vm.expectRevert(ArcTip.MessageTooLong.selector);
        arcTip.tip(alice, MIN_TIP, m);
        vm.stopPrank();
    }

    function test_Tip_RevertsUnregisteredCreator() public {
        address nobody = makeAddr("nobody");
        vm.startPrank(carol);
        usdc.approve(address(arcTip), MIN_TIP);
        vm.expectRevert(ArcTip.NotRegistered.selector);
        arcTip.tip(nobody, MIN_TIP, "");
        vm.stopPrank();
    }

    function test_Tip_RevertsZeroAddressCreator() public {
        vm.prank(carol);
        vm.expectRevert(ArcTip.NotRegistered.selector);
        arcTip.tip(address(0), MIN_TIP, "");
    }

    function test_Tip_RevertsSelfTip() public {
        usdc.mint(alice, 1_000_000);
        vm.startPrank(alice);
        usdc.approve(address(arcTip), MIN_TIP);
        vm.expectRevert(ArcTip.SelfTip.selector);
        arcTip.tip(alice, MIN_TIP, "");
        vm.stopPrank();
        assertEq(arcTip.totalReceived(alice), 0);
        assertEq(arcTip.tipCount(alice), 0);
    }

    function test_Tip_RevertsInsufficientAllowance() public {
        vm.startPrank(carol);
        usdc.approve(address(arcTip), MIN_TIP - 1);
        vm.expectRevert(
            abi.encodeWithSelector(
                IERC20Errors.ERC20InsufficientAllowance.selector, address(arcTip), MIN_TIP - 1, MIN_TIP
            )
        );
        arcTip.tip(alice, MIN_TIP, "");
        vm.stopPrank();
        assertEq(arcTip.totalReceived(alice), 0);
        assertEq(arcTip.tipCount(alice), 0);
    }

    function test_Tip_RevertsNoAllowance() public {
        vm.prank(carol);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(arcTip), 0, MIN_TIP)
        );
        arcTip.tip(alice, MIN_TIP, "");
    }

    function test_Tip_RevertsInsufficientBalance() public {
        address poor = makeAddr("poor");
        usdc.mint(poor, MIN_TIP - 1);
        vm.startPrank(poor);
        usdc.approve(address(arcTip), type(uint256).max);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, poor, MIN_TIP - 1, MIN_TIP)
        );
        arcTip.tip(alice, MIN_TIP, "");
        vm.stopPrank();
        assertEq(arcTip.totalReceived(alice), 0);
        assertEq(arcTip.tipCount(alice), 0);
        assertEq(usdc.balanceOf(poor), MIN_TIP - 1);
    }

    function test_Tip_FailedTipRollsBackCounters() public {
        // allowance too small: counters incremented before transfer must be rolled back
        vm.prank(carol);
        vm.expectRevert();
        arcTip.tip(alice, MIN_TIP, "");
        assertEq(arcTip.totalReceived(alice), 0);
        assertEq(arcTip.tipCount(alice), 0);
    }

    function test_Tip_AnyoneCanTipAnotherCreatorIncludingCreators() public {
        usdc.mint(bob, 1_000_000);
        _tip(bob, alice, MIN_TIP, "from bob");
        assertEq(usdc.balanceOf(alice), MIN_TIP);
        assertEq(usdc.balanceOf(address(arcTip)), 0);
    }

    function test_Tip_WorksAfterProfileUpdate() public {
        vm.prank(alice);
        arcTip.updateProfile("New", "", "");
        _tip(carol, alice, MIN_TIP, "");
        assertEq(arcTip.tipCount(alice), 1);
    }
}
