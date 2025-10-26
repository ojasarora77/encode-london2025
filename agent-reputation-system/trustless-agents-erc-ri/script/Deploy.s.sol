// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/IdentityRegistry.sol";
import "../src/ReputationRegistry.sol";
import "../src/ValidationRegistry.sol";
import "../src/CompassToken.sol";
import "../src/FeedbackAuthenticationDAO.sol";

/**
 * @title Deploy
 * @dev Deployment script for ERC-8004 v1.0 contracts
 * @notice Deploys all three core registries in the correct order
 * 
 * Usage:
 * forge script script/Deploy.s.sol:Deploy --rpc-url <RPC_URL> --broadcast --verify
 * 
 * @author ChaosChain Labs
 */
contract Deploy is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy IdentityRegistry (no dependencies)
        console.log("Deploying IdentityRegistry...");
        IdentityRegistry identityRegistry = new IdentityRegistry();
        console.log("IdentityRegistry deployed at:", address(identityRegistry));
        
        // 2. Deploy ReputationRegistry (depends on IdentityRegistry)
        console.log("Deploying ReputationRegistry...");
        ReputationRegistry reputationRegistry = new ReputationRegistry(address(identityRegistry));
        console.log("ReputationRegistry deployed at:", address(reputationRegistry));
        
        // 3. Deploy ValidationRegistry (depends on IdentityRegistry)
        console.log("Deploying ValidationRegistry...");
        ValidationRegistry validationRegistry = new ValidationRegistry(address(identityRegistry));
        console.log("ValidationRegistry deployed at:", address(validationRegistry));
        
        // 4. Deploy CompassToken (ERC-20 token for DAO)
        console.log("Deploying CompassToken...");
        uint256 initialTokenSupply = 1000000 * 10**18; // 1M tokens
        CompassToken compassToken = new CompassToken(initialTokenSupply);
        console.log("CompassToken deployed at:", address(compassToken));
        
        // 5. Deploy FeedbackAuthenticationDAO (depends on CompassToken and ReputationRegistry)
        console.log("Deploying FeedbackAuthenticationDAO...");
        uint256 initialTreasury = 500000 * 10**18; // 500K tokens for treasury
        // Transfer treasury tokens from deployer to DAO contract
        compassToken.transfer(address(this), initialTreasury);
        FeedbackAuthenticationDAO dao = new FeedbackAuthenticationDAO(
            address(compassToken),
            address(reputationRegistry),
            initialTreasury
        );
        console.log("FeedbackAuthenticationDAO deployed at:", address(dao));
        
        vm.stopBroadcast();
        
        // Output deployment summary
        console.log("\n=== ERC-8004 v1.0 + DAO Deployment Complete ===");
        console.log("Network Chain ID:", block.chainid);
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("\nContract Addresses:");
        console.log("  IdentityRegistry:        ", address(identityRegistry));
        console.log("  ReputationRegistry:      ", address(reputationRegistry));
        console.log("  ValidationRegistry:      ", address(validationRegistry));
        console.log("  CompassToken:            ", address(compassToken));
        console.log("  FeedbackAuthenticationDAO:", address(dao));
        console.log("\nVerification Commands:");
        console.log("forge verify-contract <address> src/IdentityRegistry.sol:IdentityRegistry");
        console.log("forge verify-contract <address> src/ReputationRegistry.sol:ReputationRegistry --constructor-args <encoded>");
        console.log("forge verify-contract <address> src/ValidationRegistry.sol:ValidationRegistry --constructor-args <encoded>");
        console.log("forge verify-contract <address> src/CompassToken.sol:CompassToken --constructor-args <encoded>");
        console.log("forge verify-contract <address> src/FeedbackAuthenticationDAO.sol:FeedbackAuthenticationDAO --constructor-args <encoded>");
    }
}

/**
 * @title DeployIdentityOnly
 * @dev Deploy only the IdentityRegistry
 */
contract DeployIdentityOnly is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        IdentityRegistry identityRegistry = new IdentityRegistry();
        console.log("IdentityRegistry deployed at:", address(identityRegistry));
        
        vm.stopBroadcast();
    }
}

/**
 * @title DeployReputationOnly
 * @dev Deploy only the ReputationRegistry (requires existing IdentityRegistry)
 */
contract DeployReputationOnly is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address identityRegistryAddress = vm.envAddress("IDENTITY_REGISTRY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        ReputationRegistry reputationRegistry = new ReputationRegistry(identityRegistryAddress);
        console.log("ReputationRegistry deployed at:", address(reputationRegistry));
        
        vm.stopBroadcast();
    }
}

/**
 * @title DeployValidationOnly
 * @dev Deploy only the ValidationRegistry (requires existing IdentityRegistry)
 */
contract DeployValidationOnly is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address identityRegistryAddress = vm.envAddress("IDENTITY_REGISTRY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        ValidationRegistry validationRegistry = new ValidationRegistry(identityRegistryAddress);
        console.log("ValidationRegistry deployed at:", address(validationRegistry));
        
        vm.stopBroadcast();
    }
}

/**
 * @title DeployDAOOnly
 * @dev Deploy only the DAO contracts (requires existing ReputationRegistry)
 */
contract DeployDAOOnly is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address reputationRegistryAddress = vm.envAddress("REPUTATION_REGISTRY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy CompassToken
        uint256 initialTokenSupply = 1000000 * 10**18; // 1M tokens
        CompassToken compassToken = new CompassToken(initialTokenSupply);
        console.log("CompassToken deployed at:", address(compassToken));
        
        // Deploy FeedbackAuthenticationDAO
        uint256 initialTreasury = 500000 * 10**18; // 500K tokens for treasury
        compassToken.transfer(address(this), initialTreasury);
        FeedbackAuthenticationDAO dao = new FeedbackAuthenticationDAO(
            address(compassToken),
            reputationRegistryAddress,
            initialTreasury
        );
        console.log("FeedbackAuthenticationDAO deployed at:", address(dao));
        
        vm.stopBroadcast();
    }
}
