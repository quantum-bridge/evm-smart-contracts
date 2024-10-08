// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {IERC1155Handler} from "../interfaces/handlers/IERC1155Handler.sol";
import {IERC1155MintableBurnable} from "../interfaces/IERC1155MintableBurnable.sol";

import "../errors/Errors.sol";

contract ERC1155Handler is IERC1155Handler, ERC1155Holder {
    function depositERC1155(
        address token_,
        uint256 tokenId_,
        uint256 amount_,
        string calldata to_,
        string calldata network_,
        bool isMintable_
    ) external override {
        if (token_ == address(0)) revert ZeroToken();
        if (amount_ == 0) revert ZeroAmount();

        IERC1155MintableBurnable erc1155 = IERC1155MintableBurnable(token_);

        if (isMintable_) {
            erc1155.burn(msg.sender, tokenId_, amount_);
        } else {
            erc1155.safeTransferFrom(msg.sender, address(this), tokenId_, amount_, "");
        }

        emit DepositedERC1155(token_, tokenId_, amount_, to_, network_, isMintable_);
    }

    function _withdrawERC1155(
        address token_,
        uint256 tokenId_,
        uint256 amount_,
        address to_,
        string calldata tokenURI_,
        bool isMintable_
    ) internal {
        if (token_ == address(0)) revert ZeroToken();
        if (to_ == address(0)) revert ZeroReceiver();
        if (amount_ == 0) revert ZeroAmount();

        IERC1155MintableBurnable erc1155 = IERC1155MintableBurnable(token_);

        if (isMintable_) {
            erc1155.mint(to_, tokenId_, amount_, tokenURI_);
        } else {
            erc1155.safeTransferFrom(address(this), to_, tokenId_, amount_, "");
        }
    }

    function getERC1155SignHash(
        address token_,
        uint256 tokenId_,
        uint256 amount_,
        address to_,
        bytes32 txHash_,
        uint256 txNonce_,
        uint256 chainId_,
        string calldata tokenURI_,
        bool isMintable_
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    token_,
                    tokenId_,
                    amount_,
                    to_,
                    txHash_,
                    txNonce_,
                    chainId_,
                    tokenURI_,
                    isMintable_
                )
            );
    }
}
