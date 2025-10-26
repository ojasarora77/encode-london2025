// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IReputationRegistry
 * @dev Mock interface for ERC-8004 Reputation Registry
 * @notice This is a simplified interface for testing the DAO integration
 */
interface IReputationRegistry {
    /**
     * @notice Read a specific feedback entry
     * @param agentId The agent ID
     * @param clientAddress The client address
     * @param index The feedback index
     * @return score The feedback score
     * @return tag1 First tag
     * @return tag2 Second tag
     * @return isRevoked Whether the feedback is revoked
     */
    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 index
    ) external view returns (
        uint8 score,
        bytes32 tag1,
        bytes32 tag2,
        bool isRevoked
    );
}