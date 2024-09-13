// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20Handler} from "../interfaces/handlers/IERC20Handler.sol";
import {IERC20MintableBurnable} from "../interfaces/IERC20MintableBurnable.sol";
import "../errors/Errors.sol";

abstract contract ERC20Handler is IERC20Handler {
    using SafeERC20 for IERC20MintableBurnable;

    function depositERC20(
        address token_,
        uint256 amount_,
        string calldata to_,
        string calldata network_,
        bool isMintable_
    ) external override {
        if (token_ == address(0)) revert TokenNotSet();
        if (amount_ == 0) revert InvalidAmount();

        IERC20MintableBurnable erc20 = IERC20MintableBurnable(token_);

        if (isMintable_) {
            erc20.burnFrom(msg.sender, amount_);
        } else {
            erc20.safeTransferFrom(msg.sender, address(this), amount_);
        }

        emit DepositedERC20(token_, amount_, to_, network_, isMintable_);
    }

    function _withdrawERC20(
        address token_,
        uint256 amount_,
        address to_,
        bool isMintable_
    ) internal {
        if (token_ == address(0)) revert TokenNotSet();
        if (amount_ == 0) revert InvalidAmount();
        if (to_ == address(0)) revert ReceiverNotSet();

        IERC20MintableBurnable erc20 = IERC20MintableBurnable(token_);

        if (isMintable_) {
            erc20.mint(to_, amount_);
        } else {
            erc20.safeTransfer(to_, amount_);
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
        return
            keccak256(
                abi.encodePacked(token_, amount_, to_, txHash_, txNonce_, chainId_, isMintable_)
            );
    }
}
