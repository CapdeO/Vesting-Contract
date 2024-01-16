// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Vesting is Initializable, ERC20Upgradeable, ERC20PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {



    constructor()  {

    }

    function buyTokens(address _stableAddress, uint256 _stableAmount) public {
        
        uint256 time = block.timestamp;




    }
}
