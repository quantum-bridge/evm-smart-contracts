// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IERC721MintableBurnable is IERC721 {
    function safeMint(address account, uint256 tokenId, string memory uri) external;

    function burnFrom(address account, uint256 tokenId) external;
}
