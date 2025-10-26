 // SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../interfaces/IReputationRegistry.sol";

/**
 * @title ReputationRegistry
 * @dev Mock implementation for testing DAO integration
 */
contract ReputationRegistry is IReputationRegistry {
    struct Feedback {
        uint8 score;
        bytes32 tag1;
        bytes32 tag2;
        bool isRevoked;
    }
    
    mapping(uint256 => mapping(address => mapping(uint64 => Feedback))) private _feedback;
    mapping(uint256 => mapping(address => uint64)) private _lastIndex;
    
    function giveFeedback(
        uint256 agentId,
        uint8 score,
        bytes32 tag1,
        bytes32 tag2,
        string calldata fileuri,
        bytes32 filehash,
        bytes memory feedbackAuth
    ) external {
        uint64 currentIndex = _lastIndex[agentId][msg.sender] + 1;
        _feedback[agentId][msg.sender][currentIndex] = Feedback({
            score: score,
            tag1: tag1,
            tag2: tag2,
            isRevoked: false
        });
        _lastIndex[agentId][msg.sender] = currentIndex;
    }
    
    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 index
    ) external view returns (
        uint8 score,
        bytes32 tag1,
        bytes32 tag2,
        bool isRevoked
    ) {
        Feedback storage fb = _feedback[agentId][clientAddress][index];
        return (fb.score, fb.tag1, fb.tag2, fb.isRevoked);
    }
}
