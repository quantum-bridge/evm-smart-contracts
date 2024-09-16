// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {INativeHandler} from "../interfaces/handlers/INativeHandler.sol";

import "../errors/Errors.sol";

abstract contract NativeHandler is INativeHandler {
    function depositNative(
        string calldata network_,
        address to_
    ) external payable {
        if (msg.value == 0) revert InvalidAmount();

        emit DepositedNative(network_, to_, msg.value);
    }

    function _withdrawNative(
        address to_,
        uint256 amount_
    ) internal {
        if (to_ == address(0)) revert ZeroReceiver();
        if (amount_ == 0) revert ZeroAmount();

        payable(to_).transfer(amount_);
    }

    function getNativeSignHash(
        uint256 amount_,
        address to_,
        bytes32 txHash_,
        uint256 txNonce_,
        uint256 chainId_
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(amount_, to_, txHash_, txNonce_, chainId_));
    }
}
