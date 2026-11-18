// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ArcTip
/// @notice Permanent creator profiles and direct, fee-free USDC tips on Arc Testnet.
/// @dev Configure with Circle's Arc Testnet USDC. Tips never route through this
/// contract's balance. Unsolicited ERC-20 transfers cannot be prevented or recovered.
contract ArcTip is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Public profile; a nonempty handle indicates registration.
    struct Creator {
        string handle;
        string displayName;
        string bio;
        string avatarUrl;
        uint64 registeredAt;
    }

    /// @notice The configured token address cannot be zero.
    error InvalidUsdc();
    /// @notice The minimum tip must be nonzero.
    error InvalidMinTip();
    /// @notice A wallet may register only once.
    error AlreadyRegistered();
    /// @notice The requested action requires a registered creator.
    error NotRegistered();
    /// @notice Handles must contain 3-32 lowercase ASCII letters, digits or underscores.
    error InvalidHandle();
    /// @notice Another creator has already claimed this handle.
    error HandleTaken();
    /// @notice Display names must contain 1-48 bytes.
    error InvalidDisplayName();
    /// @notice Bios may contain at most 280 bytes.
    error BioTooLong();
    /// @notice Avatar URLs may contain at most 200 bytes.
    error AvatarUrlTooLong();
    /// @notice The tip amount is below the configured minimum.
    error TipTooSmall();
    /// @notice Tip messages may contain at most 140 bytes.
    error MessageTooLong();
    /// @notice Creators cannot tip themselves.
    error SelfTip();

    /// @notice Emitted when a wallet permanently claims a handle.
    event CreatorRegistered(address indexed creator, string handle);
    /// @notice Emitted when a creator edits their profile.
    event ProfileUpdated(address indexed creator);
    /// @notice Emitted after a successful direct transfer to a creator.
    event Tipped(address indexed creator, address indexed supporter, uint256 amount, string message);

    /// @notice Fixed USDC token used for every tip.
    IERC20 public immutable usdc;
    /// @notice Minimum tip in raw token units (USDC has six decimals).
    uint256 public immutable minTip;

    mapping(address => Creator) private creators;
    mapping(bytes32 => address) private handleOwner;

    /// @notice Lifetime USDC tipped through this contract, in raw token units.
    mapping(address => uint256) public totalReceived;
    /// @notice Number of successful tips received through this contract.
    mapping(address => uint256) public tipCount;

    /// @param usdc_ Circle's USDC ERC-20 address on Arc Testnet.
    /// @param minTip_ Nonzero minimum amount in raw USDC units (10000 is 0.01 USDC).
    constructor(IERC20 usdc_, uint256 minTip_) {
        if (address(usdc_) == address(0)) revert InvalidUsdc();
        if (minTip_ == 0) revert InvalidMinTip();
        usdc = usdc_;
        minTip = minTip_;
    }

    /// @notice Register the caller's permanent handle and initial public profile.
    /// @param handle Unique, lowercase ASCII handle of 3-32 characters.
    /// @param displayName Public display name of 1-48 bytes.
    /// @param bio Public biography of at most 280 bytes.
    /// @param avatarUrl Public avatar URL string of at most 200 bytes.
    function registerCreator(
        string calldata handle,
        string calldata displayName,
        string calldata bio,
        string calldata avatarUrl
    ) external {
        if (isRegistered(msg.sender)) revert AlreadyRegistered();
        _validateHandle(handle);
        bytes32 handleHash = keccak256(bytes(handle));
        if (handleOwner[handleHash] != address(0)) revert HandleTaken();
        _validateProfile(displayName, bio, avatarUrl);

        creators[msg.sender] = Creator({
            handle: handle,
            displayName: displayName,
            bio: bio,
            avatarUrl: avatarUrl,
            registeredAt: uint64(block.timestamp)
        });
        handleOwner[handleHash] = msg.sender;

        emit CreatorRegistered(msg.sender, handle);
    }

    /// @notice Edit the caller's profile without changing the handle or payout wallet.
    /// @param displayName Public display name of 1-48 bytes.
    /// @param bio Public biography of at most 280 bytes.
    /// @param avatarUrl Public avatar URL string of at most 200 bytes.
    function updateProfile(
        string calldata displayName,
        string calldata bio,
        string calldata avatarUrl
    ) external {
        if (!isRegistered(msg.sender)) revert NotRegistered();
        _validateProfile(displayName, bio, avatarUrl);

        Creator storage profile = creators[msg.sender];
        profile.displayName = displayName;
        profile.bio = bio;
        profile.avatarUrl = avatarUrl;

        emit ProfileUpdated(msg.sender);
    }

    /// @notice Transfer approved USDC directly from the caller to a registered creator.
    /// @dev Updates counters before the only external interaction. A failed transfer
    /// reverts all state changes. The caller must first approve this contract in USDC.
    /// @param creator Registered recipient, distinct from the caller.
    /// @param amount Tip amount in raw USDC units, at least minTip.
    /// @param message Public message of at most 140 bytes; may be empty.
    function tip(address creator, uint256 amount, string calldata message) external nonReentrant {
        if (!isRegistered(creator)) revert NotRegistered();
        if (amount < minTip) revert TipTooSmall();
        if (bytes(message).length > 140) revert MessageTooLong();
        if (creator == msg.sender) revert SelfTip();

        totalReceived[creator] += amount;
        tipCount[creator] += 1;
        usdc.safeTransferFrom(msg.sender, creator, amount);

        emit Tipped(creator, msg.sender, amount, message);
    }

    /// @notice Return the creator's profile, or an empty profile if unregistered.
    /// @param creator Wallet whose profile to retrieve.
    /// @return The profile, including its permanent handle and registration timestamp.
    function getCreator(address creator) external view returns (Creator memory) {
        return creators[creator];
    }

    /// @notice Look up any string without handle validation or normalization.
    /// @param handle Exact case-sensitive handle to look up; any string is accepted.
    /// @return The registered wallet, or address(0) if unclaimed.
    function creatorOfHandle(string calldata handle) external view returns (address) {
        return handleOwner[keccak256(bytes(handle))];
    }

    /// @notice Check whether a wallet has registered a permanent handle.
    /// @param creator Wallet to check.
    /// @return Whether the wallet is registered.
    function isRegistered(address creator) public view returns (bool) {
        return bytes(creators[creator].handle).length != 0;
    }

    /// @dev Validate byte length and the exact allowed ASCII character set.
    function _validateHandle(string calldata handle) private pure {
        bytes calldata value = bytes(handle);
        if (value.length < 3 || value.length > 32) revert InvalidHandle();
        for (uint256 i = 0; i < value.length; ++i) {
            bytes1 character = value[i];
            if (
                !(character >= 0x61 && character <= 0x7a)
                    && !(character >= 0x30 && character <= 0x39)
                    && character != 0x5f
            ) revert InvalidHandle();
        }
    }

    /// @dev Profile text limits are measured in bytes, not Unicode characters.
    function _validateProfile(
        string calldata displayName,
        string calldata bio,
        string calldata avatarUrl
    ) private pure {
        uint256 nameLength = bytes(displayName).length;
        if (nameLength == 0 || nameLength > 48) revert InvalidDisplayName();
        if (bytes(bio).length > 280) revert BioTooLong();
        if (bytes(avatarUrl).length > 200) revert AvatarUrlTooLong();
    }
}
