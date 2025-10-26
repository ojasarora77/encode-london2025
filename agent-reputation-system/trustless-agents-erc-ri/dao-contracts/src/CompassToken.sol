// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CompassToken
 * @dev ERC-20 token for the Feedback Authentication DAO
 * @notice Compass Tokens are used for staking in feedback authentication and voting
 */
contract CompassToken is ERC20, Ownable {
    /// @dev Reference to the DAO contract that can mint tokens
    address public daoContract;
    
    /// @dev Total supply cap to prevent infinite minting
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    
    /// @dev Events
    event DAOContractUpdated(address indexed oldDAO, address indexed newDAO);
    event TokensMinted(address indexed to, uint256 amount, string reason);
    
    /**
     * @dev Constructor mints initial supply to the deployer
     * @param initialSupply Initial amount of tokens to mint to deployer
     */
    constructor(uint256 initialSupply) ERC20("Compass Token", "COMPASS") Ownable(msg.sender) {
        require(initialSupply > 0, "Initial supply must be greater than 0");
        require(initialSupply <= MAX_SUPPLY, "Initial supply exceeds maximum");
        
        _mint(msg.sender, initialSupply);
    }
    
    /**
     * @dev Set the DAO contract address (only owner)
     * @param _daoContract Address of the DAO contract
     */
    function setDAOContract(address _daoContract) external onlyOwner {
        require(_daoContract != address(0), "Invalid DAO contract address");
        address oldDAO = daoContract;
        daoContract = _daoContract;
        emit DAOContractUpdated(oldDAO, _daoContract);
    }
    
    /**
     * @dev Mint tokens to a specific address (only DAO contract)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     * @param reason Reason for minting (for event logging)
     */
    function mint(address to, uint256 amount, string calldata reason) external {
        require(msg.sender == daoContract, "Only DAO contract can mint");
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(totalSupply() + amount <= MAX_SUPPLY, "Minting would exceed max supply");
        
        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }
    
    /**
     * @dev Burn tokens from a specific address (only DAO contract)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address from, uint256 amount) external {
        require(msg.sender == daoContract, "Only DAO contract can burn");
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(from) >= amount, "Insufficient balance to burn");
        
        _burn(from, amount);
    }
    
    /**
     * @dev Transfer tokens from DAO contract (for rewards and refunds)
     * @param from Address to transfer from
     * @param to Address to transfer to
     * @param amount Amount of tokens to transfer
     */
    function transferFromDAO(address from, address to, uint256 amount) external {
        require(msg.sender == daoContract, "Only DAO contract can transfer");
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(from) >= amount, "Insufficient balance");
        
        _transfer(from, to, amount);
    }
}
