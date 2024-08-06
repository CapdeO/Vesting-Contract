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
    bytes32 public constant SETTER_ROLE = keccak256("SETTER_ROLE");

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

    struct Affiliate {
        bool isInfluencer;
        uint256 totalInvestment;
        uint256 totalProfit;
        uint256 balanceProfitUSDT;
        uint256 balanceProfitUSDC;
        uint256 balanceProfitBUSD;
        bool hasWithdrawnFirstTime;
        uint256 totalCodeUsageCounter;
        bool hasReferralCode;
        string referralCode;
        bool banned;
        uint256 unbanTime;
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
    address public donationAddress;

    mapping(address => Affiliate) public affiliates;
    mapping(address => mapping(address => uint8)) public codeUsageCounter;
    mapping(string => address) public referralAddress;
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
        address _donationAddress
    ) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        owner = _owner;
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(PAUSER_ROLE, _msgSender());
        _grantRole(UPGRADER_ROLE, _msgSender());
        _grantRole(SETTER_ROLE, _msgSender());
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(PAUSER_ROLE, owner);
        _grantRole(UPGRADER_ROLE, owner);
        _grantRole(SETTER_ROLE, owner);

        rewardToken = IERC20(_token);

        addressUSDT = _addressUSDT;
        tokensSupported[addressUSDT] = true;
        addressUSDC = _addressUSDC;
        tokensSupported[addressUSDC] = true;
        addressBUSD = _addressBUSD;
        tokensSupported[addressBUSD] = true;

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

        uint8 phaseNumber = getCurrentPhaseNumber();
        Phase storage currentPhase = phases[phaseNumber];

        uint256 adjustedAmount = _stableAmount * 10 ** (18 - IERC20Metadata(_stableAddress).decimals());

        Affiliate storage affiliate = affiliates[_msgSender()];

        affiliate.totalInvestment += adjustedAmount;

        uint256 tokens = (adjustedAmount * 1 ether) / currentPhase.tokenPrice;

        require(tokens <= currentPhase.balance, "There are not enough tokens to buy.");

        Investor storage investor = investors[_msgSender()][phaseNumber];

        require(investor.balance + tokens <= currentPhase.maxTokensPerInvestor,"The purchase of tokens exceeds the maximum limit per user.");

        investor.balance += tokens;
        investor.total += tokens;
        currentPhase.balance -= tokens;
        currentPhase.accumulatedCapital += adjustedAmount;

        if (keccak256(abi.encodePacked(_referralCode)) == keccak256(abi.encodePacked(""))) {
            require(IERC20(_stableAddress).transferFrom(_msgSender(), owner, _stableAmount), "Stable transfer error.");
        } else {
            address _referralAddress = referralAddress[_referralCode];
            Affiliate storage referral = affiliates[_referralAddress];

            require(_referralAddress != address(0), "Invalid referral code.");

            uint8 commissionPercentage = getCommissionPercentage(_referralAddress);

            referral.totalCodeUsageCounter++;
            codeUsageCounter[_referralAddress][_msgSender()]++;

            uint256 influencerAmount = _stableAmount * commissionPercentage / 100;

            require(IERC20(_stableAddress).transferFrom(_msgSender(), owner, _stableAmount - influencerAmount), "Stable transfer error.");
            
            if (influencerAmount > 0) {
                require(IERC20(_stableAddress).transferFrom(_msgSender(), address(this), influencerAmount), "Stable transfer error.");
                referral.totalProfit += influencerAmount * 10 ** (18 - IERC20Metadata(_stableAddress).decimals());
                setStableBalance(_referralAddress, _stableAddress, influencerAmount);
            }

            emit ReferralCodeUsed(
                _referralCode, 
                _msgSender(),
                influencerAmount * 10 ** (18 - IERC20Metadata(_stableAddress).decimals())
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

    function setReferralCode(string memory _referralCode) external whenNotPaused {
        Affiliate storage affiliate = affiliates[_msgSender()];
        
        if (!affiliate.isInfluencer) {
            require(affiliate.totalInvestment >= 25 ether, "Minimum investment of 25 dollars required.");
        }
        require(referralAddress[_referralCode] == address(0), "Referral code already used.");
        require(!affiliate.hasReferralCode, "This address already has a referral code.");
        referralAddress[_referralCode] = _msgSender();
        affiliate.referralCode = _referralCode;
        affiliate.hasReferralCode = true;
        referralCodes.push(_referralCode);
    }

    function withdrawProfits() external whenNotPaused {
        Affiliate storage affiliate = affiliates[_msgSender()];
        require(affiliate.hasReferralCode, "This address has not a referral code.");
        require(affiliate.balanceProfitUSDT > 0 && affiliate.balanceProfitUSDC > 0 && affiliate.balanceProfitBUSD > 0, "Address without profit.");

        uint256 commissionPercentage = 1;

        if (!affiliate.hasWithdrawnFirstTime) {
            require(affiliate.totalProfit >= 500 ether, "Address must accumulate 500 dollars in commissions the first time.");
            commissionPercentage = 90;
            affiliate.hasWithdrawnFirstTime = true;
        }
            
        uint256 maxBalance = affiliate.balanceProfitUSDT;
        address maxBalanceAddress = addressUSDT;

        if (affiliate.balanceProfitUSDC > maxBalance) {
            maxBalance = affiliate.balanceProfitUSDC;
            maxBalanceAddress = addressUSDC;
        }

        if (affiliate.balanceProfitBUSD * 10 ** 12 > maxBalance) {
            maxBalance = affiliate.balanceProfitBUSD;
            maxBalanceAddress = addressBUSD;
        }

        uint256 comission = commissionPercentage * 10 ** IERC20Metadata(maxBalanceAddress).decimals();
        require(IERC20(maxBalanceAddress).transfer(_msgSender(), maxBalance - comission), "Stable transfer error");
        require(IERC20(maxBalanceAddress).transfer(owner, comission), "Stable transfer error");

        if (maxBalanceAddress != addressUSDT && affiliate.balanceProfitUSDT > 0) {
            require(IERC20(addressUSDT).transfer(_msgSender(), affiliate.balanceProfitUSDT), "Stable transfer error");
        }

        if (maxBalanceAddress != addressUSDC && affiliate.balanceProfitUSDC > 0) {
            require(IERC20(addressUSDC).transfer(_msgSender(), affiliate.balanceProfitUSDC), "Stable transfer error");
        }

        if (maxBalanceAddress != addressBUSD && affiliate.balanceProfitBUSD > 0) {
            require(IERC20(addressBUSD).transfer(_msgSender(), affiliate.balanceProfitBUSD), "Stable transfer error");
        }

        affiliate.balanceProfitUSDT = 0;
        affiliate.balanceProfitUSDC = 0;
        affiliate.balanceProfitBUSD = 0;
    }

    function setInfluencer(address _influencer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        affiliates[_influencer].isInfluencer = true;
    }

    function banAffiliate(address _affiliate, uint256 _unbanTime) public onlyRole(SETTER_ROLE) {
        Affiliate storage affiliate = affiliates[_affiliate];
        affiliate.banned = true;
        affiliate.unbanTime = block.timestamp + _unbanTime;
    }

    function unbanAffiliate(address _affiliate) public onlyRole(SETTER_ROLE) {
        affiliates[_affiliate].banned = false;
    }

    function setStableBalance(address _affiliate, address _stableAddress, uint256 _stableAmount) internal {
        if (_stableAddress == addressUSDT) {
            affiliates[_affiliate].balanceProfitUSDT += _stableAmount;
        } else if (_stableAddress == addressUSDC) {
            affiliates[_affiliate].balanceProfitUSDC += _stableAmount;
        } else if (_stableAddress == addressBUSD) {
            affiliates[_affiliate].balanceProfitBUSD += _stableAmount;
        }
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

    function getAffiliatedList() external view onlyExisting returns (Affiliate[] memory) {
        Affiliate[] memory affiliatesData = new Affiliate[](referralCodes.length);

        for (uint8 i = 0; i < referralCodes.length; i++) {
            address affiliateAddress = referralAddress[referralCodes[i]];
            affiliatesData[i] = affiliates[affiliateAddress];
        }

        return affiliatesData;
    }

    function getCommissionPercentage(address _referralAddress) internal view returns (uint8) {

        if (affiliates[_referralAddress].banned) {
            return 0;
        }

        uint256 referralTotalInvestment = affiliates[_referralAddress].totalInvestment;
        uint8 usageCounter = codeUsageCounter[_referralAddress][_msgSender()];

        if (referralTotalInvestment >= 150 ether && usageCounter == 2) {
            return 7;
        } else if (referralTotalInvestment >= 75 ether && usageCounter == 1) {
            return 5;
        } else if (referralTotalInvestment >= 25 ether && usageCounter == 0) {
            return 3;
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
