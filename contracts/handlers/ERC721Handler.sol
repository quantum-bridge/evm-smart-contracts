// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

import "../interfaces/handlers/IERC721Handler.sol";
import "../interfaces/IERC721MintableBurnable.sol";

abstract contract ERC721Handler is IERC721Handler, ERC721Holder {
    function depositERC721(address token_, uint256 tokenId_, address to_, string calldata network_, bool isMintable_) external override {
        require(token_ != address(0), "ERC721Handler: token isn't set");
        require(to_ != address(0), "ERC721Handler: receiver isn't set");

        IERC721MintableBurnable erc721 = IERC721MintableBurnable(token_);

        if (isMintable_) {
            erc721.burnFrom(msg.sender, tokenId_);
        } else {
            erc721.safeTransferFrom(msg.sender, address(this), tokenId_);
        }

        emit DepositedERC721(token_, tokenId_, to_, network_, isMintable_);
    }

    function _withdrawERC721(address token_, uint256 tokenId_, address to_, string calldata tokenURI_, bool isMintable_) internal {
        require(token_ != address(0), "ERC721Handler: token isn't set");
        require(to_ != address(0), "ERC721Handler: receiver isn't set");

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
        return keccak256(abi.encodePacked(token_, tokenId_, to_, txHash_, txNonce_, chainId_, tokenURI_, isMintable_));
    }
}
