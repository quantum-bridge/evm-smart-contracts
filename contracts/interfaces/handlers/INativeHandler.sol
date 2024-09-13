// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface INativeHandler {
    function depositNative(
        string calldata network_,
        address to_
    ) external payable;

    function getNativeSignHash(
        uint256 amount_,
        address to_,
        bytes32 txHash_,
        uint256 txNonce_,
        uint256 chainId_
    ) external pure returns (bytes32);

    event DepositedNative(
        string network,
        address to,
        uint256 amount
    );
}
