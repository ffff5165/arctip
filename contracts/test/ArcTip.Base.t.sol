// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ArcTip} from "../ArcTip.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

abstract contract ArcTipTestBase is Test {
    // Mirror events for expectEmit
    event CreatorRegistered(address indexed creator, string handle);
    event ProfileUpdated(address indexed creator);
    event Tipped(address indexed creator, address indexed supporter, uint256 amount, string message);

    ArcTip internal arcTip;
    MockERC20 internal usdc;

    address internal alice = makeAddr("alice"); // creator
    address internal bob = makeAddr("bob"); // creator
    address internal carol = makeAddr("carol"); // supporter

    uint256 internal constant MIN_TIP = 10_000;

    function setUp() public virtual {
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);
        arcTip = new ArcTip(IERC20(address(usdc)), MIN_TIP);
        usdc.mint(carol, 1_000_000e6);
    }

    // ---- helpers ----
    function _register(address who, string memory handle) internal {
        vm.prank(who);
        arcTip.registerCreator(handle, "Name", "Bio", "https://x/a.png");
    }

    function _rep(bytes1 c, uint256 n) internal pure returns (string memory) {
        bytes memory b = new bytes(n);
        for (uint256 i; i < n; ++i) {
            b[i] = c;
        }
        return string(b);
    }

    function _tip(address from, address to, uint256 amount, string memory message) internal {
        vm.startPrank(from);
        usdc.approve(address(arcTip), amount);
        arcTip.tip(to, amount, message);
        vm.stopPrank();
    }
}
