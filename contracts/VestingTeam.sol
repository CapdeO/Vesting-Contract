// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/// @custom:security-contact capde22@gmail.com
contract VestingTeam is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    /**************************** STATE VARIABLES  ****************************/

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    struct Phase {
        uint256 startTime;
        uint256 endTime;
        uint256 duration;
        uint256 cliff;
        uint256 totalReleasedTokens;
    }

    struct Investor {
        uint256 total;
        uint256 balance;
        uint256 released;
    }

    uint256 public vestingEnd;
    uint256 public interval;
    IERC20 public rewardToken;
    mapping(address =>  Investor) private investors;
    Phase public phase;
    address public owner;

    /**************************** EVENTS  ****************************/

    event Release(address indexed _investor, uint256 _tokensReleased);

    /**************************** CONSTRUCTOR  ****************************/

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _token,
        address _owner
    ) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        owner = _owner;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(PAUSER_ROLE, owner);
        _grantRole(UPGRADER_ROLE, owner);

        rewardToken = IERC20(_token);
    }

    /**************************** CHANGE STATE  ****************************/

    function createPhase(
        uint256 _startTime,
        uint256 _endTime,
        uint256 _cliff
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {

        require(vestingEnd != 0, "Set vesting end time first.");
        require(_endTime < vestingEnd, "End time must be lower than vesting end");
        require(interval != 0, "Set interval first.");

        phase.startTime = _startTime;
        phase.endTime = _endTime;
        phase.duration = vestingEnd - _endTime;
        phase.cliff = _endTime + _cliff;
        phase.totalReleasedTokens = 0;
    }

    function allocateTokens(uint256 _tokensAmount, address[] memory _teamMembers) external onlyRole(DEFAULT_ADMIN_ROLE) {

        uint256 numberOfMembers = _teamMembers.length;
        uint256 tokensPerMember = _tokensAmount / numberOfMembers;

        for (uint i = 0; i < numberOfMembers; i++) {
            Investor storage investor = investors[_teamMembers[i]];
            investor.balance += tokensPerMember;
            investor.total += tokensPerMember;
        }

        rewardToken.transferFrom(msg.sender, address(this), _tokensAmount);
    }

    function release() external whenNotPaused {
        require(block.timestamp > phase.endTime, "This action can only be performed during the vesting period.");

        Investor storage investor = investors[msg.sender];
        uint256 unreleased = releasableAmount();

        require(unreleased > 0, "Vesting: No tokens are due for release yet.");

        investor.released += unreleased;
        investor.balance -= unreleased;
        phase.totalReleasedTokens += unreleased;

        require(rewardToken.transfer(msg.sender, unreleased), "Token transfer error.");

        emit Release(msg.sender, unreleased);
    }

    function releasableAmount() public view returns (uint256) {
        Investor memory investor = investors[msg.sender];
        uint256 vested = vestedAmount();

        return vested - investor.released;
    }

    function vestedAmount() public view returns (uint256) {
        Investor memory investor = investors[msg.sender];
        uint256 totalBalance = investor.total;
        uint256 currentTime = block.timestamp;

        if (currentTime <= phase.cliff) {
            return 0;
        } else if (currentTime >= vestingEnd) {
            return totalBalance;
        } else {
            uint256 intervals = (currentTime - phase.cliff) / interval;
            return (investor.total * intervals * interval) / phase.duration;
        }
    }

    function setVestingParams(uint256 _vestingEnd, uint256 _interval) external onlyRole(DEFAULT_ADMIN_ROLE) {
        vestingEnd = _vestingEnd;
        interval = _interval;
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    /**************************** GETTERS  ****************************/

    function getUserInvestment(address _investor) external view returns (Investor memory) {
        return investors[_investor];
    }
}
