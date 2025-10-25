// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title AgentRegistry
 * @notice Simple agent registry for reputation tracking in AgentSearch DAO
 * @dev Stores agent metadata and reputation scores updated by feedback market
 * 
 * Features:
 * - Agent registration with metadata URI (IPFS/Arweave)
 * - Reputation scoring based on review outcomes
 * - Integration with external ERC-8004 registry (agent-reputation-registry/trustless-agents-erc-ri)
 * - UUPS upgradeable pattern
 * 
 * Note: This is separate from the ERC-8004 implementation in the external trustless-agents system
 */
contract AgentRegistry is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable 
{
    struct Agent {
        string agentId;           // Unique agent identifier
        address owner;            // Agent owner/operator
        string metadataURI;       // IPFS/Arweave URI to AgentCard JSON
        uint256 reputationScore;  // Aggregated reputation (0-1000)
        uint256 totalReviews;     // Total reviews received
        uint256 positiveReviews;  // Positive review count
        uint256 registeredAt;     // Registration timestamp
        bool isActive;            // Whether agent is active
    }
    
    /// @notice Mapping from agentId to Agent struct
    mapping(string => Agent) public agents;
    
    /// @notice Mapping from owner address to their agent IDs
    mapping(address => string[]) public ownerAgents;
    
    /// @notice List of all registered agent IDs
    string[] public allAgentIds;
    
    /// @notice Feedback market contract (authorized to update reputation)
    address public feedbackMarket;
    
    /// @notice Events
    event AgentRegistered(string indexed agentId, address indexed owner, string metadataURI);
    event AgentUpdated(string indexed agentId, string metadataURI);
    event AgentDeactivated(string indexed agentId);
    event AgentReactivated(string indexed agentId);
    event ReputationUpdated(string indexed agentId, uint256 newScore, uint256 totalReviews);
    event FeedbackMarketUpdated(address indexed newMarket);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the agent registry
     * @param initialOwner The initial owner address
     */
    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }
    
    /**
     * @notice Set the feedback market contract address
     * @param _feedbackMarket Address of feedback market contract
     */
    function setFeedbackMarket(address _feedbackMarket) external onlyOwner {
        feedbackMarket = _feedbackMarket;
        emit FeedbackMarketUpdated(_feedbackMarket);
    }
    
    /**
     * @notice Register a new agent
     * @param agentId Unique agent identifier
     * @param metadataURI IPFS/Arweave URI to AgentCard JSON
     */
    function registerAgent(string calldata agentId, string calldata metadataURI) external {
        require(bytes(agentId).length > 0, "AgentRegistry: empty agentId");
        require(agents[agentId].owner == address(0), "AgentRegistry: agent already registered");
        
        agents[agentId] = Agent({
            agentId: agentId,
            owner: msg.sender,
            metadataURI: metadataURI,
            reputationScore: 500, // Start at neutral 50%
            totalReviews: 0,
            positiveReviews: 0,
            registeredAt: block.timestamp,
            isActive: true
        });
        
        ownerAgents[msg.sender].push(agentId);
        allAgentIds.push(agentId);
        
        emit AgentRegistered(agentId, msg.sender, metadataURI);
    }
    
    /**
     * @notice Update agent metadata URI
     * @param agentId Agent identifier
     * @param metadataURI New metadata URI
     */
    function updateAgentMetadata(string calldata agentId, string calldata metadataURI) external {
        require(agents[agentId].owner == msg.sender, "AgentRegistry: not owner");
        
        agents[agentId].metadataURI = metadataURI;
        emit AgentUpdated(agentId, metadataURI);
    }
    
    /**
     * @notice Deactivate an agent
     * @param agentId Agent identifier
     */
    function deactivateAgent(string calldata agentId) external {
        require(agents[agentId].owner == msg.sender, "AgentRegistry: not owner");
        
        agents[agentId].isActive = false;
        emit AgentDeactivated(agentId);
    }
    
    /**
     * @notice Reactivate an agent
     * @param agentId Agent identifier
     */
    function reactivateAgent(string calldata agentId) external {
        require(agents[agentId].owner == msg.sender, "AgentRegistry: not owner");
        
        agents[agentId].isActive = true;
        emit AgentReactivated(agentId);
    }
    
    /**
     * @notice Update agent reputation (called by FeedbackMarket after review settlement)
     * @param agentId Agent identifier
     * @param isPositive Whether the review was positive
     */
    function updateReputation(string calldata agentId, bool isPositive) external {
        require(msg.sender == feedbackMarket, "AgentRegistry: only feedback market");
        require(agents[agentId].owner != address(0), "AgentRegistry: agent not found");
        
        Agent storage agent = agents[agentId];
        agent.totalReviews++;
        
        if (isPositive) {
            agent.positiveReviews++;
        }
        
        // Calculate new reputation score (0-1000)
        agent.reputationScore = (agent.positiveReviews * 1000) / agent.totalReviews;
        
        emit ReputationUpdated(agentId, agent.reputationScore, agent.totalReviews);
    }
    
    /**
     * @notice Get agent details
     * @param agentId Agent identifier
     * @return Agent struct
     */
    function getAgent(string calldata agentId) external view returns (Agent memory) {
        return agents[agentId];
    }
    
    /**
     * @notice Get all agents owned by an address
     * @param owner Owner address
     * @return Array of agent IDs
     */
    function getAgentsByOwner(address owner) external view returns (string[] memory) {
        return ownerAgents[owner];
    }
    
    /**
     * @notice Get total number of registered agents
     * @return Total count
     */
    function getTotalAgents() external view returns (uint256) {
        return allAgentIds.length;
    }
    
    /**
     * @notice Get agent ID by index
     * @param index Index in allAgentIds array
     * @return Agent ID
     */
    function getAgentIdByIndex(uint256 index) external view returns (string memory) {
        require(index < allAgentIds.length, "AgentRegistry: index out of bounds");
        return allAgentIds[index];
    }
    
    /**
     * @notice Required override for UUPS pattern
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
