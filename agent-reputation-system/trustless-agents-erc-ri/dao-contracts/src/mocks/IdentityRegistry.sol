// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IdentityRegistry
 * @dev Mock implementation for testing DAO integration
 */
contract IdentityRegistry {
    uint256 private _agentIdCounter;
    mapping(uint256 => address) private _owners;
    
    function register(string calldata tokenURI_) external returns (uint256 agentId) {
        agentId = _agentIdCounter;
        _agentIdCounter++;
        _owners[agentId] = msg.sender;
    }
    
    function totalAgents() external view returns (uint256 count) {
        return _agentIdCounter;
    }
    
    function ownerOf(uint256 tokenId) external view returns (address) {
        return _owners[tokenId];
    }
    
    function agentExists(uint256 agentId) external view returns (bool) {
        return _owners[agentId] != address(0);
    }
}
