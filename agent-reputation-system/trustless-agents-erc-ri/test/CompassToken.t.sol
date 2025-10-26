// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/CompassToken.sol";

/**
 * @title CompassTokenTest
 * @dev Comprehensive test suite for CompassToken ERC-20 contract
 * @author ChaosChain Labs
 */
contract CompassTokenTest is Test {
    CompassToken public compassToken;
    
    address public owner = address(0x1);
    address public daoContract = address(0x2);
    address public user1 = address(0x3);
    address public user2 = address(0x4);
    
    uint256 public constant INITIAL_SUPPLY = 1000000 * 10**18;
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18;
    
    event DAOContractUpdated(address indexed oldDAO, address indexed newDAO);
    event TokensMinted(address indexed to, uint256 amount, string reason);
    
    function setUp() public {
        vm.prank(owner);
        compassToken = new CompassToken(INITIAL_SUPPLY);
    }
    
    function test_InitialState() public {
        assertEq(compassToken.name(), "Compass Token");
        assertEq(compassToken.symbol(), "COMPASS");
        assertEq(compassToken.decimals(), 18);
        assertEq(compassToken.totalSupply(), INITIAL_SUPPLY);
        assertEq(compassToken.balanceOf(owner), INITIAL_SUPPLY);
        assertEq(compassToken.owner(), owner);
        assertEq(compassToken.daoContract(), address(0));
    }
    
    function test_SetDAOContract() public {
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit DAOContractUpdated(address(0), daoContract);
        compassToken.setDAOContract(daoContract);
        
        assertEq(compassToken.daoContract(), daoContract);
    }
    
    function test_SetDAOContract_OnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        compassToken.setDAOContract(daoContract);
    }
    
    function test_SetDAOContract_InvalidAddress() public {
        vm.prank(owner);
        vm.expectRevert("Invalid DAO contract address");
        compassToken.setDAOContract(address(0));
    }
    
    function test_Mint_OnlyDAO() public {
        vm.prank(owner);
        compassToken.setDAOContract(daoContract);
        
        vm.prank(daoContract);
        vm.expectEmit(true, true, false, true);
        emit TokensMinted(user1, 1000, "test mint");
        compassToken.mint(user1, 1000, "test mint");
        
        assertEq(compassToken.balanceOf(user1), 1000);
        assertEq(compassToken.totalSupply(), INITIAL_SUPPLY + 1000);
    }
    
    function test_Mint_NotDAO() public {
        vm.prank(user1);
        vm.expectRevert("Only DAO contract can mint");
        compassToken.mint(user2, 1000, "test mint");
    }
    
    function test_Mint_ZeroAddress() public {
        vm.prank(owner);
        compassToken.setDAOContract(daoContract);
        
        vm.prank(daoContract);
        vm.expectRevert("Cannot mint to zero address");
        compassToken.mint(address(0), 1000, "test mint");
    }
    
    function test_Mint_ZeroAmount() public {
        vm.prank(owner);
        compassToken.setDAOContract(daoContract);
        
        vm.prank(daoContract);
        vm.expectRevert("Amount must be greater than 0");
        compassToken.mint(user1, 0, "test mint");
    }
    
    function test_Mint_ExceedsMaxSupply() public {
        vm.prank(owner);
        compassToken.setDAOContract(daoContract);
        
        uint256 excessAmount = MAX_SUPPLY - INITIAL_SUPPLY + 1;
        vm.prank(daoContract);
        vm.expectRevert("Minting would exceed max supply");
        compassToken.mint(user1, excessAmount, "test mint");
    }
    
    function test_BurnFrom_OnlyDAO() public {
        vm.prank(owner);
        compassToken.setDAOContract(daoContract);
        
        // Transfer tokens to user1 first
        vm.prank(owner);
        compassToken.transfer(user1, 1000);
        
        vm.prank(daoContract);
        compassToken.burnFrom(user1, 500);
        
        assertEq(compassToken.balanceOf(user1), 500);
        assertEq(compassToken.totalSupply(), INITIAL_SUPPLY - 500);
    }
    
    function test_BurnFrom_NotDAO() public {
        vm.prank(user1);
        vm.expectRevert("Only DAO contract can burn");
        compassToken.burnFrom(user2, 1000);
    }
    
    function test_BurnFrom_InsufficientBalance() public {
        vm.prank(owner);
        compassToken.setDAOContract(daoContract);
        
        vm.prank(daoContract);
        vm.expectRevert("Insufficient balance to burn");
        compassToken.burnFrom(user1, 1000);
    }
    
    function test_TransferFromDAO_OnlyDAO() public {
        vm.prank(owner);
        compassToken.setDAOContract(daoContract);
        
        vm.prank(daoContract);
        compassToken.transferFromDAO(owner, user1, 1000);
        
        assertEq(compassToken.balanceOf(user1), 1000);
        assertEq(compassToken.balanceOf(owner), INITIAL_SUPPLY - 1000);
    }
    
    function test_TransferFromDAO_NotDAO() public {
        vm.prank(user1);
        vm.expectRevert("Only DAO contract can transfer");
        compassToken.transferFromDAO(owner, user2, 1000);
    }
    
    function test_TransferFromDAO_ZeroAddress() public {
        vm.prank(owner);
        compassToken.setDAOContract(daoContract);
        
        vm.prank(daoContract);
        vm.expectRevert("Cannot transfer from zero address");
        compassToken.transferFromDAO(address(0), user1, 1000);
    }
    
    function test_TransferFromDAO_InsufficientBalance() public {
        vm.prank(owner);
        compassToken.setDAOContract(daoContract);
        
        vm.prank(daoContract);
        vm.expectRevert("Insufficient balance");
        compassToken.transferFromDAO(user1, user2, 1000);
    }
    
    function test_StandardERC20Functions() public {
        // Test transfer
        vm.prank(owner);
        bool success = compassToken.transfer(user1, 1000);
        assertTrue(success);
        assertEq(compassToken.balanceOf(user1), 1000);
        
        // Test approve and transferFrom
        vm.prank(user1);
        compassToken.approve(user2, 500);
        
        vm.prank(user2);
        success = compassToken.transferFrom(user1, user2, 500);
        assertTrue(success);
        assertEq(compassToken.balanceOf(user2), 500);
        assertEq(compassToken.balanceOf(user1), 500);
    }
}
