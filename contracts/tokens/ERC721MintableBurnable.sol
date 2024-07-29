// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

import "../interfaces/IERC721MintableBurnable.sol";

contract ERC721MintableBurnable is ERC721, ERC721Enumerable, ERC721Burnable, ERC721URIStorage, Ownable, IERC721MintableBurnable {
    string public baseURI;

    constructor(address initialOwner, string memory name, string memory symbol, string memory baseUri)
    ERC721(name, symbol)
    Ownable(initialOwner) {
        baseURI = baseUri;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function safeMint(address account, uint256 tokenId, string memory uri) public onlyOwner {
        _safeMint(account, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function burnFrom(address account, uint tokenId) external onlyOwner {
        require(ownerOf(tokenId) == account && getApproved(tokenId) == msg.sender, "ERC721MintableBurnable is not approved for burning!");

        _burn(tokenId);
    }

    // The following functions are overrides required by Solidity.

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 amount) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, amount);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721URIStorage, ERC721) returns (string memory){
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable, ERC721, IERC165, ERC721URIStorage)
    returns (bool){
        return super.supportsInterface(interfaceId);
    }
}