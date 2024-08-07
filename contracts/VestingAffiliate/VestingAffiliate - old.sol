// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/// @custom:security-contact capde22@gmail.com
contract VestingAffiliate is
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
    address public addressUSDT;
    address public addressUSDC;
    address public addressBUSD;
    address public owner;
    address public receiverUSDT;
    address public receiverUSDC;
    address public receiverBUSD;
    address public donationAddress;

    mapping(address => bool) public hasReferralCode;
    mapping(string => address) public referralAddress;
    mapping(address => string) public referralCode;
    mapping(address => mapping(address => uint8)) public affiliateInvestmentCount;
    string[] public referralCodes;

    /**************************** EVENTS  ****************************/

    event BuyTokens(
        uint8 _phase,
        address indexed _investor,
        uint256 _stableAmount,
        uint256 _rewardAmount
    );

    event ReferralCodeUsed(
        string indexed _referralCode,
        address _investor,
        uint8 _investmentCount,
        uint256 _investmentAmount
    );

    event Donation(
        address indexed _investor,
        uint256 _stableamount
    );

    event Release(address indexed _investor, uint256 _tokensReleased, uint8 _phaseNumber);

    /**************************** CONSTRUCTOR  ****************************/

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _token,
        address _addressUSDT,
        address _addressUSDC,
        address _addressBUSD,
        address _owner,
        address _receiverUSDT,
        address _receiverUSDC,
        address _receiverBUSD,
        address _donationAddress
    ) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        owner = _owner;
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(PAUSER_ROLE, _msgSender());
        _grantRole(UPGRADER_ROLE, _msgSender());
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(PAUSER_ROLE, owner);
        _grantRole(UPGRADER_ROLE, owner);

        rewardToken = IERC20(_token);

        addressUSDT = _addressUSDT;
        tokensSupported[addressUSDT] = true;
        addressUSDC = _addressUSDC;
        tokensSupported[addressUSDC] = true;
        addressBUSD = _addressBUSD;
        tokensSupported[addressBUSD] = true;

        receiverUSDT = _receiverUSDT;
        receiverUSDC = _receiverUSDC;
        receiverBUSD = _receiverBUSD;
        donationAddress = _donationAddress;
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

        rewardToken.transferFrom(_msgSender(), address(this), _initialBalance);
    }

    function invest(address _stableAddress, uint256 _stableAmount, string memory _referralCode, uint8 _donationPercent) external whenNotPaused onlyExisting {
        require(tokensSupported[_stableAddress], "Stable token not supported for purchase.");

        address stableReceiver = getStableReceiver(_stableAddress);

        uint8 phaseNumber = getCurrentPhaseNumber();
        Phase storage currentPhase = phases[phaseNumber];

        uint256 adjustedAmount = _stableAmount * 10 ** (18 - IERC20Metadata(_stableAddress).decimals());
        uint256 tokens = (adjustedAmount * 1 ether) / currentPhase.tokenPrice;

        require(tokens <= currentPhase.balance, "There are not enough tokens to buy.");

        Investor storage investor = investors[_msgSender()][phaseNumber];

        require(investor.balance + tokens <= currentPhase.maxTokensPerInvestor,"The purchase of tokens exceeds the maximum limit per user.");

        investor.balance += tokens;
        investor.total += tokens;
        currentPhase.balance -= tokens;
        currentPhase.accumulatedCapital += _stableAmount;

        if (keccak256(abi.encodePacked(_referralCode)) == keccak256(abi.encodePacked(""))) {
            require(IERC20(_stableAddress).transferFrom(_msgSender(), stableReceiver, _stableAmount), "Stable transfer error.");
        } else {
            require(referralAddress[_referralCode] != address(0), "Invalid referral code.");

            uint8 affiliateCount = affiliateInvestmentCount[referralAddress[_referralCode]][_msgSender()];
            uint8 commissionPercentage = getCommissionPercentage(affiliateCount);

            uint256 influencerAmount = _stableAmount * commissionPercentage / 100;
            require(IERC20(_stableAddress).transferFrom(_msgSender(), stableReceiver, _stableAmount - influencerAmount), "Stable transfer error.");
            if (influencerAmount > 0) {
                require(IERC20(_stableAddress).transferFrom(_msgSender(), referralAddress[_referralCode], influencerAmount), "Stable transfer error.");
            }

            affiliateInvestmentCount[referralAddress[_referralCode]][_msgSender()]++;

            emit ReferralCodeUsed(
                _referralCode, 
                _msgSender(), 
                affiliateInvestmentCount[referralAddress[_referralCode]][_msgSender()],
                influencerAmount
            );
        }

        emit BuyTokens(phaseNumber, _msgSender(), adjustedAmount, tokens);

        if (_donationPercent > 0) {
            uint256 donationAmount = _stableAmount * _donationPercent / 100;
            require(IERC20(_stableAddress).transferFrom(_msgSender(), donationAddress, donationAmount), "Stable transfer error.");
            emit Donation(_msgSender(), donationAmount);
        }
    }

    function release(uint8 _phaseNumber) external whenNotPaused onlyExisting onlyValid(_phaseNumber) {
        require(block.timestamp > phases[_phaseNumber].endTime, "This action can only be performed during the vesting period.");

        Investor storage investor = investors[_msgSender()][_phaseNumber];
        uint256 unreleased = releasableAmount(_phaseNumber);
        require(unreleased > 0, "Vesting: No tokens are due for release yet.");

        investor.released += unreleased;
        investor.balance -= unreleased;
        phases[_phaseNumber].totalReleasedTokens += unreleased;

        require(rewardToken.transfer(_msgSender(), unreleased), "Token transfer error.");

        emit Release(_msgSender(), unreleased, _phaseNumber);
    }

    function releasableAmount(uint8 _phaseNumber) public view returns (uint256) {
        Investor memory investor = investors[_msgSender()][_phaseNumber];
        uint256 vested = vestedAmount(_phaseNumber);

        return vested - investor.released;
    }

    function vestedAmount(uint8 _phaseNumber) public view returns (uint256) {
        Investor memory investor = investors[_msgSender()][_phaseNumber];
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

        require(rewardToken.transfer(_msgSender(), phases[_phaseNumber].balance), "Token transfer error.");
        phases[_phaseNumber].balance = 0;
    }

    function setVestingParams(uint256 _vestingEnd, uint256 _interval) external onlyRole(DEFAULT_ADMIN_ROLE) {
        vestingEnd = _vestingEnd;
        interval = _interval;
    }

    function setPhaseDates(uint8 _phaseNumber, uint256 _startTime, uint256 _endTime) external onlyRole(DEFAULT_ADMIN_ROLE) {
        phases[_phaseNumber].startTime = _startTime;
        phases[_phaseNumber].endTime = _endTime;
    }

    function setReceiverAddress(string memory _stable, address _newAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (keccak256(abi.encodePacked(_stable)) == keccak256(abi.encodePacked("USDT"))) {
            receiverUSDT = _newAddress;
        } else if (keccak256(abi.encodePacked(_stable)) == keccak256(abi.encodePacked("USDC"))) {
            receiverUSDC = _newAddress;
        } else if (keccak256(abi.encodePacked(_stable)) == keccak256(abi.encodePacked("BUSD"))) {
            receiverBUSD = _newAddress;
        } else {
            revert("Invalid stable name");
        }
    }

    function setReferralCode(string memory _referralCode) external whenNotPaused {
        require(referralAddress[_referralCode] == address(0), "Referral code already used.");
        require(!hasReferralCode[_msgSender()], "This address already has a referral code.");
        referralAddress[_referralCode] = _msgSender();
        referralCode[_msgSender()] = _referralCode;
        referralCodes.push(_referralCode);
        hasReferralCode[_msgSender()] = true;
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

    function getStableReceiver(address _stableAddress) internal view returns(address) {
        if (_stableAddress == addressUSDT) {
            return receiverUSDT;
        } else if (_stableAddress == addressUSDC) {
            return receiverUSDC;
        } else if (_stableAddress == addressBUSD) {
            return receiverBUSD;
        } else {
            revert("Stable address not supported.");
        }
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

    function getCommissionPercentage(uint8 _count) internal pure returns (uint8) {
        if (_count == 0) {
            return 3;
        } else if (_count == 1) {
            return 5;
        } else if (_count == 2) {
            return 7;
        } else {
            return 0;
        }
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
