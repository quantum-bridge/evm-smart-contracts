// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC1155Burnable} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import {ERC1155Supply} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

import {IERC1155MintableBurnable} from "../interfaces/IERC1155MintableBurnable.sol";
import {ERC1155URIStorage} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";

contract ERC1155MintableBurnable is
    IERC1155MintableBurnable,
    ERC1155,
    Ownable,
    ERC1155Burnable,
    ERC1155Supply,
    ERC1155URIStorage
{
    string public name;
    string public symbol;

    constructor(
        address initialOwner,
        string memory name_,
        string memory symbol_,
        string memory uri_
    ) ERC1155(uri_) Ownable(initialOwner) {
        name = name_;
        symbol = symbol_;

        _setBaseURI(uri_);
    }

    function setURI(string memory tokenURI) public onlyOwner {
        _setURI(tokenURI);
    }

    function mint(
        address account,
        uint256 tokenId,
        uint256 amount,
        string calldata tokenURI
    ) public onlyOwner {
        _mint(account, tokenId, amount, "");

        if (bytes(tokenURI).length > 0) {
            _setURI(tokenId, tokenURI);
        }
    }

    function mintBatch(
        address account,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyOwner {
        _mintBatch(account, tokenIds, amounts, data);
    }

    function burn(
        address account,
        uint256 tokenId,
        uint256 amount
    ) public override(ERC1155Burnable, IERC1155MintableBurnable) onlyOwner {
        _burn(account, tokenId, amount);
    }

    function safeTransferFrom(
        address account,
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) public override(ERC1155, IERC1155MintableBurnable) onlyOwner {
        _safeTransferFrom(account, to, tokenId, amount, data);
    }

    // The following functions are overrides required by Solidity.

    function _update(
        address from,
        address account,
        uint256[] memory tokenIds,
        uint256[] memory amounts
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, account, tokenIds, amounts);
    }

    function uri(
        uint256 tokenId
    ) public view override(ERC1155URIStorage, ERC1155) returns (string memory) {
        return super.uri(tokenId);
    }
}
