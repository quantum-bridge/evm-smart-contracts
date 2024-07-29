// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC721Handler {
    function depositERC721(address token_, uint256 tokenId_, address to_, string calldata network_, bool isMintable_) external;

    function getERC721SignHash(address token_, uint256 tokenId_, address to_, bytes32 txHash_, uint256 txNonce_, uint256 chainId_, string calldata tokenURI_, bool isMintable_) external pure returns (bytes32);

    event DepositedERC721(address indexed token, uint256 tokenId, address to, string network, bool isMintable);
}
