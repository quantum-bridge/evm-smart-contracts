// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC1155Handler {
    function depositERC1155(
        address token_,
        uint256 tokenId_,
        uint256 amount_,
        string calldata to_,
        string calldata network_,
        bool isMintable_
    ) external;

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
    ) external pure returns (bytes32);

    event DepositedERC1155(
        address token,
        uint256 tokenId,
        uint256 amount,
        string to,
        string network,
        bool isMintable
    );
}
