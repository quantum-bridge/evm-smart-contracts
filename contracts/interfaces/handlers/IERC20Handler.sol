// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Handler {
    function depositERC20(address token_, uint256 amount_, string calldata to_, string calldata network_, bool isMintable_) external;

    function getERC20SignHash(address token_, uint256 amount_, address to_, bytes32 txHash_, uint256 txNonce_, uint256 chainId_, bool isMintable_) external pure returns (bytes32);

    event DepositedERC20(address indexed token, uint256 amount, string to, string network, bool isMintable);
}
