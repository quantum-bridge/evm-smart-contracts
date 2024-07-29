// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";

interface IERC721MintableBurnable is IERC721 {
    function safeMint(address account, uint256 tokenId, string memory uri) external;

    function burnFrom(address account, uint tokenId) external;
}