// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC1155MintableBurnable {
    function setURI(string memory tokenURI) external;

    function mint(
        address account,
        uint256 tokenId,
        uint256 amount,
        string calldata tokenURI
    ) external;

    function mintBatch(
        address account,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) external;

    function burn(address account, uint256 tokenId, uint256 amount) external;

    function safeTransferFrom(
        address account,
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) external;
}
