# Legacy ERC-8004 Implementation (v0.x)

This directory contains the legacy implementation of ERC-8004 (versions 0.3-0.4).

## ⚠️ Deprecated

These contracts are **deprecated** and should not be used for new deployments. Please use the v1.0 implementation in the root `src/` directory.

## Contents

- `src/` - Legacy contract implementations
- `test/` - Legacy test suites
- `script/` - Legacy deployment scripts

## Deployed Contracts (Testnets Only)

The legacy contracts remain deployed on testnets for backward compatibility:

| Network | Identity Registry | Reputation Registry | Validation Registry |
|---------|-------------------|---------------------|---------------------|
| Ethereum Sepolia | [`0x127C86a24F46033E77C347258354ee4C739b139C`](https://sepolia.etherscan.io/address/0x127C86a24F46033E77C347258354ee4C739b139C) | [`0x57396214E6E65E9B3788DE7705D5ABf3647764e0`](https://sepolia.etherscan.io/address/0x57396214E6E65E9B3788DE7705D5ABf3647764e0) | [`0x5d332cE798e491feF2de260bddC7f24978eefD85`](https://sepolia.etherscan.io/address/0x5d332cE798e491feF2de260bddC7f24978eefD85) |
| Base Sepolia | [`0x19fad4adD9f8C4A129A078464B22E1506275FbDd`](https://sepolia.basescan.org/address/0x19fad4adD9f8C4A129A078464B22E1506275FbDd) | [`0xA13497975fd3f6cA74081B074471C753b622C903`](https://sepolia.basescan.org/address/0xA13497975fd3f6cA74081B074471C753b622C903) | [`0x6e24aA15e134AF710C330B767018d739CAeCE293`](https://sepolia.basescan.org/address/0x6e24aA15e134AF710C330B767018d739CAeCE293) |
| Optimism Sepolia | [`0x19fad4adD9f8C4A129A078464B22E1506275FbDd`](https://sepolia-optimistic.etherscan.io/address/0x19fad4adD9f8C4A129A078464B22E1506275FbDd) | [`0xA13497975fd3f6cA74081B074471C753b622C903`](https://sepolia-optimistic.etherscan.io/address/0xA13497975fd3f6cA74081B074471C753b622C903) | [`0x6e24aA15e134AF710C330B767018d739CAeCE293`](https://sepolia-optimistic.etherscan.io/address/0x6e24aA15e134AF710C330B767018d739CAeCE293) |

## Key Differences from v1.0

### Identity Registry
- v0.x: Custom identity system with domain/address mappings
- v1.0: ERC-721 based with URIStorage

### Reputation Registry
- v0.x: Pre-authorization pattern
- v1.0: Cryptographic signatures (EIP-191/ERC-1271)

### Validation Registry
- v0.x: Hash-based with time bounds
- v1.0: URI-based with tags and multiple responses

## Migration

If you're using the legacy contracts, please plan to migrate to v1.0. See the main README and `CHANGELOG_V1.md` for migration guidance.

## Support

Legacy contracts are no longer actively maintained. For issues or questions, please refer to the v1.0 implementation.

---

**For the current implementation, see the root directory.**
