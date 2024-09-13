// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {IERC721Handler} from "../interfaces/handlers/IERC721Handler.sol";
import {IERC721MintableBurnable} from "../interfaces/IERC721MintableBurnable.sol";

import "../errors/Errors.sol";

abstract contract ERC721Handler is IERC721Handler, ERC721Holder {
    function depositERC721(
        address token_,
        uint256 tokenId_,
        address to_,
        string calldata network_,
        bool isMintable_
    ) external override {
        if (token_ == address(0)) revert TokenNotSet();
        if (to_ == address(0)) revert ReceiverNotSet();

        IERC721MintableBurnable erc721 = IERC721MintableBurnable(token_);

        if (isMintable_) {
            erc721.burnFrom(msg.sender, tokenId_);
        } else {
            erc721.safeTransferFrom(msg.sender, address(this), tokenId_);
        }

        emit DepositedERC721(token_, tokenId_, to_, network_, isMintable_);
    }

    function _withdrawERC721(
        address token_,
        uint256 tokenId_,
        address to_,
        string calldata tokenURI_,
        bool isMintable_
    ) internal {
        if (token_ == address(0)) revert TokenNotSet();
        if (to_ == address(0)) revert ReceiverNotSet();

        IERC721MintableBurnable erc721 = IERC721MintableBurnable(token_);

        if (isMintable_) {
            erc721.safeMint(to_, tokenId_, tokenURI_);
        } else {
            erc721.safeTransferFrom(address(this), to_, tokenId_);
        }
    }

    function getERC721SignHash(
        address token_,
        uint256 tokenId_,
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
