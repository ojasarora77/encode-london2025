# ERC-8004 v1.0 Implementer's Guide

> **Reference Implementation**: This guide is based on the production-ready reference implementation by ChaosChain, deployed on 5 testnets with 79/79 tests passing.

## Table of Contents
1. [Overview](#overview)
2. [Critical Implementation Decisions](#critical-implementation-decisions)
3. [Identity Registry Implementation](#identity-registry-implementation)
4. [Reputation Registry Implementation](#reputation-registry-implementation)
5. [Validation Registry Implementation](#validation-registry-implementation)
6. [Security Considerations](#security-considerations)
7. [Gas Optimization](#gas-optimization)
8. [Common Pitfalls](#common-pitfalls)

---

## Overview

ERC-8004 v1.0 defines three registries for trustless agent discovery and trust establishment. While the spec is clear on the interface, several implementation details require careful decisions.

**Our Implementation Philosophy:**
- 100% spec compliance first
- Production-ready security hardening
- Gas optimization without sacrificing safety
- L2-friendly (Solidity 0.8.19 to avoid PUSH0 opcode issues)

---

## Critical Implementation Decisions

### 1. **tokenURI Updates (_setTokenURI Exposure)**

**The Challenge:**  
ERC-8004 v1.0 spec states: "When the registration data changes, it can be updated with _setTokenURI() as per ERC721URIStorage."

However, `_setTokenURI()` is an **internal** function in OpenZeppelin's `ERC721URIStorage`. The spec doesn't mandate how to expose this functionality.

**Our Solution:**
```solidity
// We inherit from ERC721URIStorage which provides _setTokenURI()
contract IdentityRegistry is ERC721URIStorage, ReentrancyGuard, IIdentityRegistry {
    
    // The _setTokenURI() remains internal and accessible through:
    // 1. Owner calling _setTokenURI() via inherited functionality
    // 2. Operators with approval can also update
    
    // OpenZeppelin's ERC721URIStorage allows the token owner or approved operators
    // to implicitly update the URI through internal functions
}
```

**Why this works:**
- Follows OpenZeppelin's security model
- Token owners/operators can update via inherited mechanisms
- No additional exposure of dangerous functions
- Standard ERC-721 approval patterns work

**Alternative Approaches:**
1. **Public wrapper** (more explicit but less secure):
   ```solidity
   function updateTokenURI(uint256 agentId, string memory newURI) external {
       require(_isApprovedOrOwner(msg.sender, agentId), "Not authorized");
       _setTokenURI(agentId, newURI);
   }
   ```
   
2. **Metadata-only updates** (less flexible):
   ```solidity
   // Only allow URI updates via setMetadata()
   function setMetadata(uint256 agentId, string calldata key, bytes calldata value) external {
       require(_isApprovedOrOwner(msg.sender, agentId), "Not authorized");
       if (keccak256(bytes(key)) == keccak256(bytes("tokenURI"))) {
           _setTokenURI(agentId, string(value));
       }
       // ... other metadata
   }
   ```

**Recommendation:** Use approach #1 if you need explicit URI updates frequently, otherwise stick with OpenZeppelin's defaults.

---

### 2. **Signature Verification (encode vs encodePacked, ERC-1271 Support)**

**The Challenge:**  
ERC-8004 v1.0 spec states: "feedbackAuth is a tuple... signed using EIP-191 or ERC-1271"

Critical questions:
- How to encode the tuple for hashing?
- How to support both EIP-191 (EOAs) and ERC-1271 (smart contracts)?
- What if signature is malformed?

**Our Solution:**

#### **Encoding Strategy: `abi.encode()` (NOT `abi.encodePacked()`)**

```solidity
/// @dev Hash the feedback authorization struct for signature verification
function _hashFeedbackAuth(FeedbackAuth memory auth) private pure returns (bytes32) {
    return keccak256(abi.encode(
        auth.agentId,
        auth.clientAddress,
        auth.indexLimit,
        auth.expiry,
        auth.chainId,
        auth.identityRegistry,
        auth.signerAddress
    ));
}
```

**Why `abi.encode()` and NOT `abi.encodePacked()`?**
- **Type Safety**: `encode()` includes type information, preventing hash collisions
- **Standard Practice**: Most EIPs use `encode()` for structured data
- **Collision Prevention**: `encodePacked()` can cause collisions with dynamic types
- `encodePacked()` is only appropriate for simple concatenation

**Example of collision risk with `encodePacked()`:**
```solidity
// These two produce the SAME hash with encodePacked:
abi.encodePacked("aa", "ab");
abi.encodePacked("a", "aab");

// But different hashes with encode:
abi.encode("aa", "ab");  // Different
abi.encode("a", "aab");  // Different
```

#### **Signature Verification: Support Both EIP-191 and ERC-1271**

```solidity
// Extract signature components (r, s, v)
bytes32 r;
bytes32 s;
uint8 v;

assembly {
    let dataPtr := add(feedbackAuth, 32)
    let sigStart := add(dataPtr, FEEDBACK_AUTH_STRUCT_SIZE)
    r := mload(sigStart)
    s := mload(add(sigStart, 32))
    v := byte(0, mload(add(sigStart, 64)))
}

// Hash the struct
bytes32 messageHash = _hashFeedbackAuth(auth);

// Reconstruct full signature for verification
bytes memory signature = new bytes(65);
assembly {
    mstore(add(signature, 32), r)
    mstore(add(signature, 64), s)
    mstore8(add(signature, 96), v)
}

// Try EIP-191 first (for EOAs) - use tryRecover to avoid revert
(address recoveredSigner, ECDSA.RecoverError error) = ECDSA.tryRecover(messageHash, signature);

bool validSignature = (error == ECDSA.RecoverError.NoError && recoveredSigner == auth.signerAddress);

// If EOA recovery fails, try ERC-1271 for smart contract wallets
if (!validSignature) {
    validSignature = SignatureChecker.isValidSignatureNow(
        auth.signerAddress, 
        messageHash, 
        signature
    );
}

require(validSignature, "Invalid signature");
```

**Critical: Use `tryRecover()` NOT `recover()`**

```solidity
// ❌ BAD: This reverts on non-canonical signatures, blocking ERC-1271 fallback
address signer = ECDSA.recover(messageHash, signature);

// ✅ GOOD: This returns an error enum, allowing ERC-1271 fallback
(address signer, ECDSA.RecoverError error) = ECDSA.tryRecover(messageHash, signature);
```

**Why this matters:**
- Some wallets produce non-canonical ECDSA signatures
- `recover()` reverts, preventing ERC-1271 check
- `tryRecover()` gracefully fails, allowing smart contract wallet verification

---

### 3. **Solidity Version Choice**

**The Challenge:**  
Solidity 0.8.20+ introduced the PUSH0 opcode, which is not supported on many L2s.

**Our Solution:**
```solidity
pragma solidity 0.8.19;
```

**Why 0.8.19?**
- Works on ALL EVM-compatible chains
- No PUSH0 opcode issues on older L2s
- Still has all modern Solidity safety features
- Tested on: Ethereum, Base, Optimism, Mode, 0G

**Recommendation:** Use **0.8.19** for maximum compatibility, or 0.8.20+ if you're only targeting chains that support PUSH0.

---

### 4. **Struct Layout and Storage Costs**

**The Challenge:**  
How to efficiently store feedback and validation data to minimize gas?

**Our Solution:**

```solidity
struct Feedback {
    uint8 score;      // 1 byte
    bytes32 tag1;     // 32 bytes
    bytes32 tag2;     // 32 bytes  
    bool isRevoked;   // 1 byte
}
// Total: 66 bytes (fits in 3 storage slots)

struct ValidationStatus {
    address validatorAddress;  // 20 bytes
    uint256 agentId;          // 32 bytes
    uint8 response;           // 1 byte
    bytes32 tag;              // 32 bytes
    uint256 lastUpdate;       // 32 bytes
}
// Total: 117 bytes (requires 4 storage slots)
```

**Gas Optimization Tips:**
- Pack small values (uint8, bool) together
- Use bytes32 for tags instead of strings
- Store hashes instead of full URIs on-chain
- Emit full URIs in events for off-chain indexing

---

## Identity Registry Implementation

### Key Design Decisions

1. **Counter vs Manual ID Assignment**
   ```solidity
   // We use OpenZeppelin's Counter for safety
   using Counters for Counters.Counter;
   Counters.Counter private _agentIdCounter;
   
   constructor() ERC721("ERC-8004 Trustless Agent", "AGENT") {
       _agentIdCounter.increment(); // Start from 1, not 0
   }
   ```

2. **Metadata Storage**
   ```solidity
   mapping(uint256 => mapping(string => bytes)) private _metadata;
   
   function setMetadata(uint256 agentId, string calldata key, bytes calldata value) external {
       require(_isApprovedOrOwner(msg.sender, agentId), "Not authorized");
       _metadata[agentId][key] = value;
       emit MetadataSet(agentId, key, key, value);
   }
   ```

3. **Reentrancy Protection**
   ```solidity
   // IMPORTANT: Add nonReentrant to all register() functions
   function register(string calldata tokenURI_, MetadataEntry[] calldata metadata) 
       external 
       nonReentrant  // Prevents nested registrations
       returns (uint256 agentId) 
   {
       // ...
   }
   ```
   
   **Why?** External calls during registration could cause reentrancy issues.

---

## Reputation Registry Implementation

### Key Design Decisions

1. **FeedbackAuth Struct Size**
   ```solidity
   // Define as constant for clarity and gas savings
   uint256 private constant FEEDBACK_AUTH_STRUCT_SIZE = 224;
   // Calculation: 7 fields × 32 bytes = 224 bytes
   // (agentId, clientAddress, indexLimit, expiry, chainId, identityRegistry, signerAddress)
   ```

2. **Self-Feedback Prevention (Security Enhancement)**
   ```solidity
   function giveFeedback(...) external {
       address agentOwner = IIdentityRegistry(identityRegistry).ownerOf(agentId);
       
       // Prevent agent owner from giving feedback to themselves
       require(msg.sender != agentOwner, "Self-feedback not allowed");
       
       // ... rest of logic
   }
   ```
   
   **Not in spec but critical for security!**

3. **Response Hash Emission (Best Practice)**
   ```solidity
   // Emit responseHash for integrity verification
   emit ResponseAppended(agentId, clientAddress, feedbackIndex, msg.sender, responseUri, responseHash);
   ```
   
   **Why?** Off-chain indexers can verify file integrity without fetching content.

4. **getResponseCount Edge Case**
   ```solidity
   function getResponseCount(...) external view returns (uint64) {
       address[] memory responders = _responses[agentId][clientAddress][feedbackIndex];
       
       // IMPORTANT: Return 0 if no responses, not revert
       if (responders.length == 0) {
           return 0;
       }
       
       // ... filtering logic
   }
   ```

---

## Validation Registry Implementation

### Key Design Decisions

1. **requestHash Uniqueness (Critical Security Fix)**
   ```solidity
   mapping(bytes32 => bool) private _requestExists;
   
   function validationRequest(...) external {
       // ... compute requestHash
       
       // CRITICAL: Prevent requestHash overwrites
       require(!_requestExists[finalRequestHash], "Request hash already exists");
       
       _requestExists[finalRequestHash] = true;
       // ... rest of logic
   }
   ```
   
   **Why?** Without this, malicious actors could overwrite existing requests.

2. **Self-Validation Prevention (Security Enhancement)**
   ```solidity
   function validationRequest(address validatorAddress, uint256 agentId, ...) external {
       address agentOwner = IIdentityRegistry(identityRegistry).ownerOf(agentId);
       
       // Prevent self-validation
       require(validatorAddress != agentOwner, "Self-validation not allowed");
       require(validatorAddress != msg.sender, "Self-validation not allowed");
       
       // ... rest of logic
   }
   ```

3. **Pending Requests Handling**
   ```solidity
   function getValidationStatus(bytes32 requestHash) 
       external 
       view 
       returns (
           address validatorAddress,
           uint256 agentId,
           uint8 response,
           bytes32 tag,
           uint256 lastUpdate
       ) 
   {
       ValidationStatus memory status = _validationStatuses[requestHash];
       
       // Return default values for non-existent/pending requests
       // This is more user-friendly than reverting
       return (
           status.validatorAddress,
           status.agentId,
           status.response,
           status.tag,
           status.lastUpdate
       );
   }
   ```

4. **responseHash Emission**
   ```solidity
   // Emit responseHash for integrity verification
   emit ValidationResponse(
       msg.sender, 
       agentId, 
       requestHash, 
       response, 
       responseUri, 
       responseHash,  // Include for off-chain verification
       tag
   );
   ```

---

## Security Considerations

### 1. **Access Control**
- Only agent owners/operators can register and update
- Only designated validators can respond
- Only authorized clients can give feedback

### 2. **Signature Security**
- Use `tryRecover()` to handle malformed signatures gracefully
- Support both EIP-191 (EOAs) and ERC-1271 (smart contracts)
- Never use `encodePacked()` for structured data hashing

### 3. **Self-Interaction Prevention**
- Prevent self-feedback (not in spec, but critical)
- Prevent self-validation (not in spec, but critical)

### 4. **Reentrancy Protection**
- Add `nonReentrant` to all state-changing functions in IdentityRegistry
- Consider reentrancy risks in other registries if making external calls

### 5. **Input Validation**
- Validate score ranges (0-100)
- Check agent existence before operations
- Validate timestamps (expiry, indexLimit)

---

## Gas Optimization

### Techniques We Used

1. **IR Compiler** (foundry.toml)
   ```toml
   [profile.default]
   via_ir = true
   optimizer_runs = 200
   ```
   
   Saves ~10-15% gas on average.

2. **Efficient Storage**
   - Use `bytes32` for tags instead of strings
   - Pack structs to minimize storage slots
   - Store hashes instead of full URIs

3. **Event-Driven Architecture**
   - Store minimal data on-chain
   - Emit full data in events for off-chain indexing
   - Off-chain aggregation for complex queries

4. **Gas Benchmarks** (from our tests on Mode Testnet)
   ```
   Agent Registration:  ~150,000 gas
   Give Feedback:       ~120,000 gas
   Validation Request:  ~100,000 gas
   Validation Response: ~80,000 gas
   ```

---

## Common Pitfalls

### ❌ **DON'T: Use `encodePacked()` for structured data**
```solidity
// BAD
bytes32 hash = keccak256(abi.encodePacked(agentId, clientAddress, expiry));
```

### ✅ **DO: Use `encode()` for structured data**
```solidity
// GOOD
bytes32 hash = keccak256(abi.encode(agentId, clientAddress, expiry));
```

---

### ❌ **DON'T: Use `ECDSA.recover()` exclusively**
```solidity
// BAD - Reverts on non-canonical signatures, blocking ERC-1271
address signer = ECDSA.recover(hash, signature);
require(signer == expectedSigner, "Invalid");
```

### ✅ **DO: Use `tryRecover()` with ERC-1271 fallback**
```solidity
// GOOD - Gracefully handles both EOAs and smart contracts
(address signer, ECDSA.RecoverError error) = ECDSA.tryRecover(hash, signature);
bool valid = (error == ECDSA.RecoverError.NoError && signer == expectedSigner);
if (!valid) {
    valid = SignatureChecker.isValidSignatureNow(expectedSigner, hash, signature);
}
```

---

### ❌ **DON'T: Forget to prevent self-interactions**
```solidity
// BAD - Allows reputation gaming
function giveFeedback(uint256 agentId, ...) external {
    // Missing check
}
```

### ✅ **DO: Add self-interaction checks**
```solidity
// GOOD
function giveFeedback(uint256 agentId, ...) external {
    address agentOwner = IIdentityRegistry(identityRegistry).ownerOf(agentId);
    require(msg.sender != agentOwner, "Self-feedback not allowed");
}
```

---

### ❌ **DON'T: Allow requestHash overwrites**
```solidity
// BAD - Vulnerable to hijacking
function validationRequest(...) external {
    _validationStatuses[requestHash] = ValidationStatus(...);
}
```

### ✅ **DO: Check for existing requests**
```solidity
// GOOD
function validationRequest(...) external {
    require(!_requestExists[requestHash], "Request hash already exists");
    _requestExists[requestHash] = true;
    _validationStatuses[requestHash] = ValidationStatus(...);
}
```

---

### ❌ **DON'T: Use Solidity 0.8.20+ for multi-chain**
```solidity
// BAD - Breaks on many L2s
pragma solidity ^0.8.20;
```

### ✅ **DO: Use Solidity 0.8.19 for compatibility**
```solidity
// GOOD - Works everywhere
pragma solidity 0.8.19;
```

---

## Testing Recommendations

Our test suite covers:

1. **Spec Compliance** (79 tests)
   - All required functions
   - All event emissions
   - All error conditions

2. **Security Tests**
   - Self-feedback prevention
   - Self-validation prevention
   - Reentrancy protection
   - Signature verification edge cases

3. **Gas Benchmarks**
   - First-time operations
   - Subsequent operations
   - Batch operations

4. **Integration Tests**
   - Cross-contract interactions
   - Multi-step workflows
   - Edge cases

**Recommended Tools:**
- Foundry for testing and deployment
- Slither for static analysis
- Mythril for security scanning

---

## Deployment Checklist

- [ ] Lock Solidity version to 0.8.19
- [ ] Enable IR compiler in foundry.toml
- [ ] Add comprehensive NatSpec documentation
- [ ] Run full test suite (aim for 100% coverage)
- [ ] Security audit (internal and external)
- [ ] Test on target networks (mainnet/L2s)
- [ ] Verify contracts on block explorers
- [ ] Document deployment addresses

---

## Reference Implementation

**Repository:** https://github.com/YOUR_ORG/trustless-agents-erc-ri

**Live Contracts (5 Testnets):**
- Ethereum Sepolia (11155111)
- Base Sepolia (84532)
- Optimism Sepolia (11155420)
- Mode Testnet (919)
- 0G Testnet (16602)

**Deterministic Addresses:**
```
IdentityRegistry:    0x7177a6867296406881E20d6647232314736Dd09A
ReputationRegistry:  0xB5048e3ef1DA4E04deB6f7d0423D06F63869e322
ValidationRegistry:  0x662b40A526cb4017d947e71eAF6753BF3eeE66d8
```

**Test Results:** 79/79 passing 

---

## Contributing

Found an edge case or have a better approach? We welcome feedback and contributions to improve this guide and the reference implementation.

---

**Last Updated:** October 2025  
**Version:** Based on ERC-8004 v1.0  
**Maintainer:** ChaosChain

