// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import "../src/IdentityRegistry.sol";
import "../src/ReputationRegistry.sol";
import "../src/ValidationRegistry.sol";

/**
 * @title Deploy
 * @dev Deployment script for ERC-8004 Trustless Agents Reference Implementation
 * @notice Deploys all three core registry contracts in the correct order
 */
contract Deploy is Script {
    struct DeploymentAddresses {
        address identityRegistry;
        address reputationRegistry;
        address validationRegistry;
    }
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying ERC-8004 Trustless Agents Reference Implementation...");
        console.log("Network:", getNetworkName());
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        
        DeploymentAddresses memory addresses = deployContracts();
        
        vm.stopBroadcast();
        
        logDeploymentSummary(addresses);
        generateDeploymentJson(addresses);
    }
    
    function deployContracts() internal returns (DeploymentAddresses memory) {
        // Deploy IdentityRegistry first (no dependencies)
        console.log("\n1. Deploying IdentityRegistry...");
        IdentityRegistry identityRegistry = new IdentityRegistry();
        console.log("IdentityRegistry deployed at:", address(identityRegistry));
        
        // Deploy ReputationRegistry (depends on IdentityRegistry)
        console.log("\n2. Deploying ReputationRegistry...");
        ReputationRegistry reputationRegistry = new ReputationRegistry(address(identityRegistry));
        console.log("ReputationRegistry deployed at:", address(reputationRegistry));
        
        // Deploy ValidationRegistry (depends on IdentityRegistry)
        console.log("\n3. Deploying ValidationRegistry...");
        ValidationRegistry validationRegistry = new ValidationRegistry(address(identityRegistry));
        console.log("ValidationRegistry deployed at:", address(validationRegistry));
        
        return DeploymentAddresses({
            identityRegistry: address(identityRegistry),
            reputationRegistry: address(reputationRegistry),
            validationRegistry: address(validationRegistry)
        });
    }
    
    function logDeploymentSummary(DeploymentAddresses memory addresses) internal view {
        console.log("\n=== Deployment Summary ===");
        console.log("Network:", getNetworkName());
        console.log("Chain ID:", block.chainid);
        console.log("IdentityRegistry:", addresses.identityRegistry);
        console.log("ReputationRegistry:", addresses.reputationRegistry);
        console.log("ValidationRegistry:", addresses.validationRegistry);
        
        // Get validation expiration time
        ValidationRegistry validationRegistry = ValidationRegistry(addresses.validationRegistry);
        console.log("Validation expiration time:", validationRegistry.getExpirationSlots(), "seconds");
    }
    
    function generateDeploymentJson(DeploymentAddresses memory addresses) internal view {
        string memory networkName = getNetworkName();
        console.log("\n=== JSON Output for Web Interface ===");
        console.log(string.concat(
            '{\n',
            '  "network": "', networkName, '",\n',
            '  "chainId": "', vm.toString(block.chainid), '",\n',
            '  "contracts": {\n',
            '    "identityRegistry": "', vm.toString(addresses.identityRegistry), '",\n',
            '    "reputationRegistry": "', vm.toString(addresses.reputationRegistry), '",\n',
            '    "validationRegistry": "', vm.toString(addresses.validationRegistry), '"\n',
            '  }\n',
            '}'
        ));
    }
    
    function getNetworkName() internal view returns (string memory) {
        uint256 chainId = block.chainid;
        if (chainId == 1) return "ethereum";
        if (chainId == 11155111) return "sepolia";
        if (chainId == 8453) return "base";
        if (chainId == 84532) return "base_sepolia";
        if (chainId == 42161) return "arbitrum";
        if (chainId == 421614) return "arbitrum_sepolia";
        if (chainId == 10) return "optimism";
        if (chainId == 11155420) return "optimism_sepolia";
        return "unknown";
    }
}