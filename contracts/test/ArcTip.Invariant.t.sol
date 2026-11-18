// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ArcTipTestBase} from "./ArcTip.Base.t.sol";
import {ArcTip} from "../ArcTip.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

/// Drives register / update / tip with bounded inputs and tracks ghost totals.
contract ArcTipHandler is Test {
    ArcTip public arcTip;
    MockERC20 public usdc;

    address[] public actors;
    uint256 public ghostTipped;
    uint256 public ghostTipCount;
    uint256 public okTips;

    constructor(ArcTip _arcTip, MockERC20 _usdc) {
        arcTip = _arcTip;
        usdc = _usdc;
        for (uint256 i; i < 5; ++i) {
            address a = makeAddr(string.concat("actor", vm.toString(i)));
            actors.push(a);
            usdc.mint(a, 1_000_000e6);
            vm.prank(a);
            usdc.approve(address(arcTip), type(uint256).max);
        }
    }

    function actorsLength() external view returns (uint256) {
        return actors.length;
    }

    function register(uint256 actorSeed) external {
        address a = actors[actorSeed % actors.length];
        if (arcTip.isRegistered(a)) return;
        vm.prank(a);
        arcTip.registerCreator(string.concat("handle_", vm.toString(actorSeed % actors.length)), "N", "", "");
    }

    function update(uint256 actorSeed) external {
        address a = actors[actorSeed % actors.length];
        if (!arcTip.isRegistered(a)) return;
        vm.prank(a);
        arcTip.updateProfile("Upd", "bio", "url");
    }

    function tip(uint256 fromSeed, uint256 toSeed, uint256 amount) external {
        address from = actors[fromSeed % actors.length];
        address to = actors[toSeed % actors.length];
        if (from == to || !arcTip.isRegistered(to)) return;
        amount = bound(amount, arcTip.minTip(), 1_000e6);
        if (usdc.balanceOf(from) < amount) return;
        vm.prank(from);
        arcTip.tip(to, amount, "hi");
        ghostTipped += amount;
        ghostTipCount += 1;
    }
}

contract ArcTipInvariantTest is ArcTipTestBase {
    ArcTipHandler internal handler;

    function setUp() public override {
        super.setUp();
        handler = new ArcTipHandler(arcTip, usdc);
        targetContract(address(handler));
    }

    /// The contract never custodies USDC.
    function invariant_ArcTipUsdcBalanceIsZero() public view {
        assertEq(usdc.balanceOf(address(arcTip)), 0);
    }

    /// Per-creator counters sum to exactly what was tipped through the handler.
    function invariant_CountersMatchGhostTotals() public view {
        uint256 sumReceived;
        uint256 sumCount;
        for (uint256 i; i < handler.actorsLength(); ++i) {
            address a = handler.actors(i);
            sumReceived += arcTip.totalReceived(a);
            sumCount += arcTip.tipCount(a);
        }
        assertEq(sumReceived, handler.ghostTipped());
        assertEq(sumCount, handler.ghostTipCount());
    }
}
