// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DreamJunkStudios is ERC20 {

    constructor() ERC20("Dream Junk Studios", "DRM") {
        _mint(msg.sender, 800_000_000 * 10 ** decimals());
    }
}