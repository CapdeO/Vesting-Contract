// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Argatio is ERC20 {

    constructor() ERC20("Argatio", "ARGA") {
        _mint(msg.sender, 200_000_000 * 10 ** decimals());
    }
}

contract DreamJunk is ERC20 {

    constructor() ERC20("Dream Junk", "DRM") {
        _mint(msg.sender, 800_000_000 * 10 ** decimals());
    }
}