// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract CryptoDeptoToken is ERC20, ERC20Burnable {
    constructor() ERC20("CryptoDepto", "CD") {
        _mint(msg.sender, 200_000_000 * 10 ** decimals());
    }
}