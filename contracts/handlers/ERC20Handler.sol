// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/handlers/IERC20Handler.sol";
import "../interfaces/IERC20MintableBurnable.sol";

abstract contract ERC20Handler is IERC20Handler {
    using SafeERC20 for IERC20MintableBurnable;

    function depositERC20(
        address token_,
        uint256 amount_,
        string calldata to_,
        string calldata network_,
        bool isMintable_
    ) external override {
        require(token_ != address(0), "ERC20Handler: token isn't set");
        require(amount_ > 0, "ERC20Handler: amount must be greater than zero");

        IERC20MintableBurnable erc20 = IERC20MintableBurnable(token_);

        if (isMintable_) {
            erc20.burnFrom(msg.sender, amount_);
        } else {
            erc20.transferFrom(msg.sender, address(this), amount_);
        }

        emit DepositedERC20(token_, amount_, to_, network_, isMintable_);
    }

    function _withdrawERC20(
        address token_,
        uint256 amount_,
        address to_,
        bool isMintable_
    ) internal {
        require(token_ != address(0), "ERC20Handler: token isn't set");
        require(amount_ > 0, "ERC20Handler: amount must be greater than zero");
        require(to_ != address(0), "ERC20Handler: receiver isn't set");

        IERC20MintableBurnable erc20 = IERC20MintableBurnable(token_);

        if (isMintable_) {
            erc20.mint(to_, amount_);
        } else {
            erc20.transferFrom(msg.sender, to_, amount_);
        }
    }

    function getERC20SignHash(
        address token_,
        uint256 amount_,
        address to_,
        bytes32 txHash_,
        uint256 txNonce_,
        uint256 chainId_,
        bool isMintable_
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(token_, amount_, to_, txHash_, txNonce_, chainId_, isMintable_));
    }
}
