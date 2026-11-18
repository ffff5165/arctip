// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ArcTipTestBase} from "./ArcTip.Base.t.sol";
import {ArcTip} from "../ArcTip.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ArcTipRegistrationTest is ArcTipTestBase {
    // ---- constructor ----
    function test_Constructor_StoresArgs() public view {
        assertEq(address(arcTip.usdc()), address(usdc));
        assertEq(arcTip.minTip(), MIN_TIP);
    }

    function test_Constructor_RevertsOnZeroUsdc() public {
        vm.expectRevert(ArcTip.InvalidUsdc.selector);
        new ArcTip(IERC20(address(0)), MIN_TIP);
    }

    function test_Constructor_RevertsOnZeroMinTip() public {
        vm.expectRevert(ArcTip.InvalidMinTip.selector);
        new ArcTip(IERC20(address(usdc)), 0);
    }

    // ---- registerCreator happy path ----
    function test_Register_StoresProfile() public {
        vm.warp(1_700_000_000);
        vm.prank(alice);
        arcTip.registerCreator("alice_01", "Alice", "My bio", "https://x/a.png");

        assertTrue(arcTip.isRegistered(alice));
        assertFalse(arcTip.isRegistered(bob));
        ArcTip.Creator memory c = arcTip.getCreator(alice);
        assertEq(c.handle, "alice_01");
        assertEq(c.displayName, "Alice");
        assertEq(c.bio, "My bio");
        assertEq(c.avatarUrl, "https://x/a.png");
        assertEq(c.registeredAt, 1_700_000_000);
        assertEq(arcTip.creatorOfHandle("alice_01"), alice);
    }

    function test_Register_EmitsCreatorRegistered() public {
        vm.expectEmit(true, false, false, true, address(arcTip));
        emit CreatorRegistered(alice, "alice_01");
        _register(alice, "alice_01");
    }

    function test_Register_AcceptsBoundaryValues() public {
        // handle 3 and 32 chars, name 48, bio 280, avatar 200, empty bio/avatar
        vm.prank(alice);
        arcTip.registerCreator("abc", _rep("n", 48), _rep("b", 280), _rep("u", 200));
        vm.prank(bob);
        arcTip.registerCreator(_rep("z", 32), "N", "", "");
        assertEq(arcTip.creatorOfHandle("abc"), alice);
        assertEq(arcTip.creatorOfHandle(_rep("z", 32)), bob);
    }

    function test_Register_AcceptsAllAllowedCharset() public {
        vm.prank(alice);
        arcTip.registerCreator("az_09", "N", "", "");
        assertTrue(arcTip.isRegistered(alice));
    }

    // ---- registerCreator reverts ----
    function test_Register_RevertsHandleTooShort() public {
        vm.prank(alice);
        vm.expectRevert(ArcTip.InvalidHandle.selector);
        arcTip.registerCreator("ab", "N", "", "");
    }

    function test_Register_RevertsEmptyHandle() public {
        vm.prank(alice);
        vm.expectRevert(ArcTip.InvalidHandle.selector);
        arcTip.registerCreator("", "N", "", "");
    }

    function test_Register_RevertsHandleTooLong() public {
        string memory h = _rep("a", 33);
        vm.prank(alice);
        vm.expectRevert(ArcTip.InvalidHandle.selector);
        arcTip.registerCreator(h, "N", "", "");
    }

    function test_Register_RevertsUppercase() public {
        vm.prank(alice);
        vm.expectRevert(ArcTip.InvalidHandle.selector);
        arcTip.registerCreator("Alice", "N", "", "");
    }

    function test_Register_RevertsBadCharacters() public {
        string[8] memory bad = ["al ice", "al-ice", "alice!", "al.ice", "alice@", unicode"alicé", "ali/ce", "al\nice"];
        for (uint256 i; i < bad.length; ++i) {
            vm.prank(alice);
            vm.expectRevert(ArcTip.InvalidHandle.selector);
            arcTip.registerCreator(bad[i], "N", "", "");
        }
    }

    function test_Register_RevertsBoundaryCharsOutsideSet() public {
        // chars adjacent to the allowed ranges: '/', ':', '`', '{', '@', '['
        bytes1[6] memory chars = [bytes1(0x2f), 0x3a, 0x60, 0x7b, 0x40, 0x5b];
        for (uint256 i; i < chars.length; ++i) {
            bytes memory h = abi.encodePacked("ab", chars[i]);
            vm.prank(alice);
            vm.expectRevert(ArcTip.InvalidHandle.selector);
            arcTip.registerCreator(string(h), "N", "", "");
        }
    }

    function test_Register_RevertsNullByte() public {
        vm.prank(alice);
        vm.expectRevert(ArcTip.InvalidHandle.selector);
        arcTip.registerCreator(string(abi.encodePacked("ab", bytes1(0x00))), "N", "", "");
    }

    function test_Register_RevertsHandleTaken() public {
        _register(alice, "taken");
        vm.prank(bob);
        vm.expectRevert(ArcTip.HandleTaken.selector);
        arcTip.registerCreator("taken", "N", "", "");
    }

    function test_Register_RevertsDoubleRegistration() public {
        _register(alice, "first");
        vm.prank(alice);
        vm.expectRevert(ArcTip.AlreadyRegistered.selector);
        arcTip.registerCreator("second", "N", "", "");
        // second handle was not claimed
        assertEq(arcTip.creatorOfHandle("second"), address(0));
    }

    function test_Register_RevertsEmptyDisplayName() public {
        vm.prank(alice);
        vm.expectRevert(ArcTip.InvalidDisplayName.selector);
        arcTip.registerCreator("alice", "", "", "");
    }

    function test_Register_RevertsDisplayNameTooLong() public {
        string memory n = _rep("n", 49);
        vm.prank(alice);
        vm.expectRevert(ArcTip.InvalidDisplayName.selector);
        arcTip.registerCreator("alice", n, "", "");
    }

    function test_Register_RevertsBioTooLong() public {
        string memory b = _rep("b", 281);
        vm.prank(alice);
        vm.expectRevert(ArcTip.BioTooLong.selector);
        arcTip.registerCreator("alice", "N", b, "");
    }

    function test_Register_RevertsAvatarTooLong() public {
        string memory u = _rep("u", 201);
        vm.prank(alice);
        vm.expectRevert(ArcTip.AvatarUrlTooLong.selector);
        arcTip.registerCreator("alice", "N", "", u);
    }

    function test_Register_FailedAttemptDoesNotClaimHandle() public {
        vm.prank(alice);
        vm.expectRevert(ArcTip.InvalidDisplayName.selector);
        arcTip.registerCreator("alice", "", "", "");
        assertEq(arcTip.creatorOfHandle("alice"), address(0));
        assertFalse(arcTip.isRegistered(alice));
    }

    function test_Register_DisplayNameLimitIsBytesNotChars() public {
        // 25 two-byte chars = 50 bytes > 48
        string memory n = "";
        for (uint256 i; i < 25; ++i) {
            n = string.concat(n, unicode"é");
        }
        vm.prank(alice);
        vm.expectRevert(ArcTip.InvalidDisplayName.selector);
        arcTip.registerCreator("alice", n, "", "");
    }

    // ---- updateProfile ----
    function test_Update_ChangesProfileKeepsHandle() public {
        vm.warp(1000);
        _register(alice, "alice");
        vm.warp(2000);
        vm.prank(alice);
        arcTip.updateProfile("New Name", "New bio", "https://x/new.png");

        ArcTip.Creator memory c = arcTip.getCreator(alice);
        assertEq(c.handle, "alice");
        assertEq(c.displayName, "New Name");
        assertEq(c.bio, "New bio");
        assertEq(c.avatarUrl, "https://x/new.png");
        assertEq(c.registeredAt, 1000);
        assertEq(arcTip.creatorOfHandle("alice"), alice);
    }

    function test_Update_EmitsProfileUpdated() public {
        _register(alice, "alice");
        vm.expectEmit(true, false, false, false, address(arcTip));
        emit ProfileUpdated(alice);
        vm.prank(alice);
        arcTip.updateProfile("N2", "", "");
    }

    function test_Update_AllowsClearingBioAndAvatar() public {
        _register(alice, "alice");
        vm.prank(alice);
        arcTip.updateProfile("N2", "", "");
        ArcTip.Creator memory c = arcTip.getCreator(alice);
        assertEq(c.bio, "");
        assertEq(c.avatarUrl, "");
    }

    function test_Update_DoesNotAffectOthers() public {
        _register(alice, "alice");
        _register(bob, "bobby");
        vm.prank(alice);
        arcTip.updateProfile("Changed", "x", "y");
        ArcTip.Creator memory b = arcTip.getCreator(bob);
        assertEq(b.displayName, "Name");
        assertEq(b.bio, "Bio");
    }

    function test_Update_RevertsForUnregistered() public {
        vm.prank(carol);
        vm.expectRevert(ArcTip.NotRegistered.selector);
        arcTip.updateProfile("N", "", "");
    }

    function test_Update_RevertsEmptyDisplayName() public {
        _register(alice, "alice");
        vm.prank(alice);
        vm.expectRevert(ArcTip.InvalidDisplayName.selector);
        arcTip.updateProfile("", "", "");
    }

    function test_Update_RevertsDisplayNameTooLong() public {
        _register(alice, "alice");
        string memory n = _rep("n", 49);
        vm.prank(alice);
        vm.expectRevert(ArcTip.InvalidDisplayName.selector);
        arcTip.updateProfile(n, "", "");
    }

    function test_Update_RevertsBioTooLong() public {
        _register(alice, "alice");
        string memory b = _rep("b", 281);
        vm.prank(alice);
        vm.expectRevert(ArcTip.BioTooLong.selector);
        arcTip.updateProfile("N", b, "");
    }

    function test_Update_RevertsAvatarTooLong() public {
        _register(alice, "alice");
        string memory u = _rep("u", 201);
        vm.prank(alice);
        vm.expectRevert(ArcTip.AvatarUrlTooLong.selector);
        arcTip.updateProfile("N", "", u);
    }

    function test_Update_BoundaryLengthsAccepted() public {
        _register(alice, "alice");
        vm.prank(alice);
        arcTip.updateProfile(_rep("n", 48), _rep("b", 280), _rep("u", 200));
        assertEq(bytes(arcTip.getCreator(alice).bio).length, 280);
    }

    // ---- views ----
    function test_GetCreator_EmptyForUnregistered() public view {
        ArcTip.Creator memory c = arcTip.getCreator(carol);
        assertEq(c.handle, "");
        assertEq(c.registeredAt, 0);
    }

    function test_CreatorOfHandle_UnknownIsZero() public view {
        assertEq(arcTip.creatorOfHandle("nobody"), address(0));
        assertEq(arcTip.creatorOfHandle(""), address(0));
    }

    function test_CreatorOfHandle_CaseSensitiveNoNormalization() public {
        _register(alice, "alice");
        assertEq(arcTip.creatorOfHandle("ALICE"), address(0));
        assertEq(arcTip.creatorOfHandle("alice"), alice);
    }

    function testFuzz_CreatorOfHandle_NeverRevertsOnArbitraryStrings(string calldata s) public view {
        // must not revert for any input; unregistered strings map to zero
        assertEq(arcTip.creatorOfHandle(s), address(0));
    }

    function testFuzz_CreatorOfHandle_NeverRevertsWithRegisteredCreators(string calldata s) public {
        _register(alice, "alice");
        address r = arcTip.creatorOfHandle(s);
        if (keccak256(bytes(s)) == keccak256("alice")) assertEq(r, alice);
        else assertEq(r, address(0));
    }

    function test_CreatorOfHandle_VeryLongString() public view {
        assertEq(arcTip.creatorOfHandle(_rep("a", 20_000)), address(0));
    }
}
