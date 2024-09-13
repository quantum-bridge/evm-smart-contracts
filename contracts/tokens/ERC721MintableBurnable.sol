// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721MintableBurnable} from "../interfaces/IERC721MintableBurnable.sol";

import "../errors/Errors.sol";

contract ERC721MintableBurnable is
    ERC721,
    ERC721Enumerable,
    ERC721Burnable,
    ERC721URIStorage,
    Ownable,
    IERC721MintableBurnable
{
    string public baseURI;

    constructor(
        address initialOwner,
        string memory name,
        string memory symbol,
        string memory baseUri
    ) ERC721(name, symbol) Ownable(initialOwner) {
        baseURI = baseUri;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function safeMint(address account, uint256 tokenId, string memory uri) public onlyOwner {
        _safeMint(account, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function burnFrom(address account, uint256 tokenId) external onlyOwner {
        if (ownerOf(tokenId) != account || getApproved(tokenId) != msg.sender) {
            revert NotApprovedForBurning();
        }

        _burn(tokenId);
    }

    // The following functions are overrides required by Solidity.

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 amount
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, amount);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721URIStorage, ERC721) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Enumerable, ERC721, IERC165, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
