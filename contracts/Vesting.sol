// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/// @custom:security-contact capde22@gmail.com
contract Vesting is
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
        uint256 tokenPrice;
        uint256 initialBalance;
        uint256 balance;
        uint256 maxTokensPerInvestor;
        uint256 accumulatedCapital;
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
    mapping(address => bool) public tokensSupported;
    mapping(address => mapping(uint8 => Investor)) private investors;
    Phase[] private phases;
    address[] private tokensSupportedList;
    address public owner;

    /**************************** EVENTS  ****************************/

    event BuyTokens(
        uint8 _phase,
        address indexed _investor,
        uint256 _stableAmount,
        uint256 _rewardAmount
    );

    event Release(address indexed _investor, uint256 _tokensReleased, uint8 _phaseNumber);

    /**************************** CONSTRUCTOR  ****************************/

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _token,
        address[] memory _stableTokenAddresses,
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

        for (uint256 i = 0; i < _stableTokenAddresses.length; i++) {
            tokensSupported[_stableTokenAddresses[i]] = true;
            tokensSupportedList.push(_stableTokenAddresses[i]);
        }
    }

    /**************************** CHANGE STATE  ****************************/

    function createPhase(
        uint256 _startTime,
        uint256 _endTime,
        uint256 _cliff,
        uint256 _tokenPrice,
        uint256 _initialBalance,
        uint256 _maxTokensPerInvestor
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {

        require(vestingEnd != 0, "Set vesting end time first.");
        require(_endTime < vestingEnd, "End time must be lower than vesting end");
        require(interval != 0, "Set interval first.");

        Phase memory newPhase = Phase({
            startTime: _startTime,
            endTime: _endTime,
            duration: vestingEnd - _endTime,
            cliff: _endTime +_cliff,
            tokenPrice: _tokenPrice,
            initialBalance: _initialBalance,
            balance: _initialBalance,
            maxTokensPerInvestor: _maxTokensPerInvestor,
            accumulatedCapital: 0,
            totalReleasedTokens: 0
        });

        phases.push(newPhase);

        rewardToken.transferFrom(msg.sender, address(this), _initialBalance);
    }

    function invest(address _stableAddress, uint256 _stableAmount) external whenNotPaused onlyExisting {
        require(tokensSupported[_stableAddress], "Stable token not supported for purchase.");

        uint8 phaseNumber = getCurrentPhaseNumber();
        Phase storage currentPhase = phases[phaseNumber];

        uint256 adjustedAmount = _stableAmount * 10 ** (18 - IERC20Metadata(_stableAddress).decimals());
        uint256 tokens = (adjustedAmount * 1 ether) / currentPhase.tokenPrice;

        require(tokens <= currentPhase.balance, "There are not enough tokens to buy.");

        Investor storage investor = investors[msg.sender][phaseNumber];

        require(investor.balance + tokens <= currentPhase.maxTokensPerInvestor,"The purchase of tokens exceeds the maximum limit per user.");

        investor.balance += tokens;
        investor.total += tokens;
        currentPhase.balance -= tokens;
        currentPhase.accumulatedCapital += _stableAmount;

        require(IERC20(_stableAddress).transferFrom(msg.sender, owner, _stableAmount), "Stable transfer error.");

        emit BuyTokens(phaseNumber, _msgSender(), adjustedAmount, tokens);
    }

    function release(uint8 _phaseNumber) external whenNotPaused onlyExisting onlyValid(_phaseNumber) {
        require(block.timestamp > phases[_phaseNumber].endTime, "This action can only be performed during the vesting period.");

        Investor storage investor = investors[msg.sender][_phaseNumber];
        uint256 unreleased = releasableAmount(_phaseNumber);
        require(unreleased > 0, "Vesting: No tokens are due for release yet.");

        investor.released += unreleased;
        investor.balance -= unreleased;
        phases[_phaseNumber].totalReleasedTokens += unreleased;

        require(rewardToken.transfer(msg.sender, unreleased), "Token transfer error.");

        emit Release(msg.sender, unreleased, _phaseNumber);
    }

    function releasableAmount(uint8 _phaseNumber) public view returns (uint256) {
        Investor memory investor = investors[msg.sender][_phaseNumber];
        uint256 vested = vestedAmount(_phaseNumber);

        return vested - investor.released;
    }

    function vestedAmount(uint8 _phaseNumber) public view returns (uint256) {
        Investor memory investor = investors[msg.sender][_phaseNumber];
        uint256 totalBalance = investor.total;
        uint256 currentTime = block.timestamp;

        if (currentTime <= phases[_phaseNumber].cliff) {
            return 0;
        } else if (currentTime >= vestingEnd) {
            return totalBalance;
        } else {
            uint256 intervals = (currentTime - phases[_phaseNumber].cliff) / interval;
            return (investor.total * intervals * interval) / phases[_phaseNumber].duration;
        }
    }

    function withdrawRemainingTokens(uint8 _phaseNumber) external onlyRole(DEFAULT_ADMIN_ROLE) onlyExisting onlyValid(_phaseNumber) {
        require(block.timestamp > phases[_phaseNumber].endTime, "This phase is not over yet.");
        require(phases[_phaseNumber].balance > 0, "There are no tokens in this phase.");

        require(rewardToken.transfer(owner, phases[_phaseNumber].balance), "Token transfer error.");
        phases[_phaseNumber].balance = 0;
    }

    function setVestingParams(uint256 _vestingEnd, uint256 _interval) external onlyRole(DEFAULT_ADMIN_ROLE) {
        vestingEnd = _vestingEnd;
        interval = _interval;
    }

    function addSupportedToken(address _stableTokenAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_stableTokenAddress != address(0), "Token address cannot be the zero address.");
        require(!tokensSupported[_stableTokenAddress], "Token already supported.");

        tokensSupported[_stableTokenAddress] = true;
        tokensSupportedList.push(_stableTokenAddress);
    }

    function removeSupportedToken(address _stableTokenAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_stableTokenAddress != address(0), "Token address cannot be the zero address.");
        require(tokensSupported[_stableTokenAddress],"Stable token not supported.");

        delete tokensSupported[_stableTokenAddress];
        uint indexToBeDeleted;
        for (uint i = 0; i < tokensSupportedList.length; i++) {
            if (tokensSupportedList[i] == _stableTokenAddress) {
                indexToBeDeleted = i;
                break;
            }
        }
        tokensSupportedList[indexToBeDeleted] = tokensSupportedList[
            tokensSupportedList.length - 1
        ];
        tokensSupportedList.pop();
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

    function getCurrentPhaseNumber() public view onlyExisting returns (uint8) {
        uint256 time = block.timestamp;

        for (uint8 i = 0; i < phases.length; i++) {
            if (time >= phases[i].startTime && time <= phases[i].endTime) {
                return i;
            }
        }

        revert("No active vesting phase for the current time.");
    }

    function getPhase(uint8 _phaseNumber) public view onlyExisting onlyValid(_phaseNumber) returns (Phase memory) {
        return phases[_phaseNumber];
    }

    function getPhasesCount() public view returns (uint256) {
        return phases.length;
    }

    function getTokensSupportedList() external view returns(address[] memory) {
        return tokensSupportedList;
    }

    function getPhases() external view onlyExisting returns(Phase[] memory) {
        return phases;
    }

    function getUserInvestment(address _investor, uint8 _phaseNumber) external view onlyExisting onlyValid(_phaseNumber) returns (Investor memory) {
        return investors[_investor][_phaseNumber];
    }

    function getUserInvestments(address _investor) external view onlyExisting returns (Investor[] memory) {

        Investor[] memory userInvestments = new Investor[](phases.length);

        for (uint8 i = 0; i < phases.length; i++) {
            userInvestments[i] = investors[_investor][i];
        }

        return userInvestments;
    }

    function getUserReleasableAmounts() external view onlyExisting returns (uint256[] memory) {
        uint256[] memory userReleasableAmounts = new uint256[](phases.length);

        for (uint8 i = 0; i < phases.length; i++) {
            userReleasableAmounts[i] = releasableAmount(i);
        }

        return userReleasableAmounts;
    }


    /**************************** MODIFIERS  ****************************/

    modifier onlyExisting() {
        require(phases.length > 0, "No vesting phases available.");
        _;
    }

    modifier onlyValid(uint8 _phaseNumber) {
        require(_phaseNumber < phases.length, "Invalid phase number.");
        _;
    }
}
