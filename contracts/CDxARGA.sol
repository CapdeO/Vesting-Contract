// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenExchange {

    IERC20 private tokenCD;
    IERC20 private tokenARGA;
    mapping (address => bool) admin;
    
    constructor(address _CD, address _ARGA) {
        tokenCD = IERC20(_CD);
        tokenARGA = IERC20(_ARGA);
        admin[msg.sender] = true;
    }

    function exchangeTokens(uint256 _amount) external {
        require(_amount > 0, "Amount cannot be zero.");
        uint256 balance = tokenARGA.balanceOf(address(this));
        require(balance >= _amount, "Insufficient contract ARGA token balance.");

        require(tokenCD.transferFrom(msg.sender, address(this), _amount), "CD transfer error.");
        require(tokenARGA.transfer(msg.sender, _amount), "ARGA transfer error.");
    }

    function withdrawRemainingTokens() external {
        require(admin[msg.sender], "Not admin.");
        uint256 balance = tokenARGA.balanceOf(address(this));
        require(tokenARGA.transfer(msg.sender, balance), "ARGA transfer error.");
    }

    function setAdmin(address _newAdmin) external {
        require(admin[msg.sender], "Not admin.");
        admin[_newAdmin] = true;
    }

    function revokeAdmin(address _admin) external {
        require(admin[msg.sender], "Not admin.");
        admin[_admin] = false;
    }
}
