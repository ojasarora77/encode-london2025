// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title AgentGovernanceToken (AGTC)
 * @notice DAO governance token for AgentSearch protocol
 * @dev ERC20Votes implementation for weighted voting by historical accuracy + token balance
 * 
 * Features:
 * - Voting power delegation
 * - Checkpoint-based historical balance tracking
 * - UUPS upgradeable pattern
 * - Mintable by governance
 * 
 * Sources:
 * - OpenZeppelin ERC20Votes: https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Votes
 * - Compound governance token: https://github.com/compound-finance/compound-protocol
 */
contract AgentGovernanceToken is 
    Initializable,
    ERC20Upgradeable,
    ERC20VotesUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable 
{
    /// @notice Accuracy tracking for weighted voting
    mapping(address => uint256) public userAccuracyScore;
    
    /// @notice Total reviews submitted by user
    mapping(address => uint256) public userReviewCount;
    
    /// @notice Emitted when user accuracy is updated
    event AccuracyUpdated(address indexed user, uint256 newScore, uint256 reviewCount);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the governance token
     * @param initialOwner The initial owner/DAO address
     */
    function initialize(address initialOwner) public initializer {
        __ERC20_init("Agent Governance Token", "AGTC");
        __ERC20Votes_init();
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        
        // Mint initial supply to owner (DAO treasury)
        _mint(initialOwner, 1_000_000 * 10**18); // 1M tokens
    }
    
    /**
     * @notice Mint new tokens (only callable by owner/DAO)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @notice Update user accuracy score (called by FeedbackMarket after review settlement)
     * @param user User address
     * @param wasCorrect Whether the user's review was correct
     */
    function updateAccuracy(address user, bool wasCorrect) external onlyOwner {
        userReviewCount[user]++;
        
        // Simple accuracy calculation: percentage of correct reviews
        if (wasCorrect) {
            userAccuracyScore[user]++;
        }
        
        emit AccuracyUpdated(user, userAccuracyScore[user], userReviewCount[user]);
    }
    
    /**
     * @notice Get weighted voting power (token balance * accuracy multiplier)
     * @param account User address
     * @return Weighted voting power
     */
    function getWeightedVotingPower(address account) external view returns (uint256) {
        uint256 tokenBalance = balanceOf(account);
        uint256 accuracyMultiplier = _getAccuracyMultiplier(account);
        
        // Weighted voting power = balance * (1 + accuracy bonus)
        // Accuracy bonus: 0-50% based on historical accuracy
        return tokenBalance + (tokenBalance * accuracyMultiplier / 100);
    }
    
    /**
     * @notice Get accuracy multiplier (0-50 based on review history)
     * @param account User address
     * @return Multiplier percentage (0-50)
     */
    function _getAccuracyMultiplier(address account) internal view returns (uint256) {
        uint256 reviewCount = userReviewCount[account];
        if (reviewCount == 0) return 0;
        
        uint256 accuracyPercentage = (userAccuracyScore[account] * 100) / reviewCount;
        
        // Cap at 50% bonus for perfect accuracy
        return accuracyPercentage > 100 ? 50 : accuracyPercentage / 2;
    }
    
    /**
     * @notice Required override for UUPS pattern
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    /**
     * @notice Required override for ERC20Votes
     */
    function _update(address from, address to, uint256 value) 
        internal 
        override(ERC20Upgradeable, ERC20VotesUpgradeable) 
    {
        super._update(from, to, value);
    }
}
