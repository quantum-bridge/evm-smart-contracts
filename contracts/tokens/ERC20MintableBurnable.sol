// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

import "../interfaces/IERC20MintableBurnable.sol";

contract ERC20MintableBurnable is IERC20MintableBurnable, ERC20, ERC20Burnable, Ownable, ERC20Permit {
    constructor(address initialOwner, string memory name, string memory symbol)
    ERC20(name, symbol)
    Ownable(initialOwner)
    ERC20Permit("ERC20MintableBurnable") {}

    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }

    function burnFrom(address payer_, uint256 amount_) public override(ERC20Burnable, IERC20MintableBurnable) onlyOwner {
        _spendAllowance(payer_, msg.sender, amount_);
        _burn(payer_, amount_);
    }
}
