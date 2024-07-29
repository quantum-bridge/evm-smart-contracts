// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBridge {
    function withdrawERC20(
        address token_,
        uint256 amount_,
        address ,
        bytes32 txHash_,
        uint256 txNonce_,
        bool isMintable_,
        bytes[] calldata signatures_
    ) external;

    function withdrawERC721(
        address token_,
        uint256 tokenId_,
        address to_,
        bytes32 txHash_,
        uint256 txNonce_,
        string calldata tokenURI_,
        bool isMintable_,
        bytes[] calldata signatures_
    ) external;

    function withdrawERC1155(
        address token_,
        uint256 tokenId_,
        uint256 amount_,
        address to_,
        bytes32 txHash_,
        uint256 txNonce_,
        string calldata tokenURI_,
        bool isMintable_,
        bytes[] calldata signatures_
    ) external;
}
