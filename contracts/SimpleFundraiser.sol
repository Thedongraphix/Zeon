// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SimpleFundraiser
 * @dev A simple fundraiser contract that accepts ETH contributions
 */
contract SimpleFundraiser {
    // State variables
    string public name;
    uint256 public goalAmount;
    uint256 public currentAmount;
    address public owner;
    bool public isActive;
    
    // Mapping to track contributions
    mapping(address => uint256) public contributions;
    address[] public contributors;
    
    // Events
    event ContributionReceived(address indexed contributor, uint256 amount);
    event FundsWithdrawn(address indexed owner, uint256 amount);
    event GoalReached(uint256 totalAmount);
    event FundraiserClosed(uint256 finalAmount);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyActive() {
        require(isActive, "Fundraiser is not active");
        _;
    }
    
    /**
     * @dev Constructor to initialize the fundraiser
     * @param _name The name of the fundraiser
     * @param _goalAmount The goal amount in wei
     * @param _owner The address of the fundraiser owner
     */
    constructor(
        string memory _name,
        uint256 _goalAmount,
        address _owner
    ) {
        require(_goalAmount > 0, "Goal amount must be greater than 0");
        require(_owner != address(0), "Owner address cannot be zero");
        require(bytes(_name).length > 0, "Name cannot be empty");
        
        name = _name;
        goalAmount = _goalAmount;
        owner = _owner;
        isActive = true;
        currentAmount = 0;
    }
    
    /**
     * @dev Internal function to handle contributions
     */
    function _contribute() internal onlyActive {
        require(msg.value > 0, "Contribution must be greater than 0");
        
        // Track contribution
        if (contributions[msg.sender] == 0) {
            contributors.push(msg.sender);
        }
        contributions[msg.sender] += msg.value;
        currentAmount += msg.value;
        
        emit ContributionReceived(msg.sender, msg.value);
        
        // Check if goal is reached
        if (currentAmount >= goalAmount) {
            emit GoalReached(currentAmount);
        }
    }
    
    /**
     * @dev Contribute ETH to the fundraiser
     */
    function contribute() external payable {
        _contribute();
    }
    
    /**
     * @dev Fallback function to accept ETH
     */
    receive() external payable {
        _contribute();
    }
    
    /**
     * @dev Withdraw funds (only owner)
     */
    function withdraw() external onlyOwner {
        require(address(this).balance > 0, "No funds to withdraw");
        
        uint256 amount = address(this).balance;
        
        // Transfer funds to owner
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit FundsWithdrawn(owner, amount);
    }
    
    /**
     * @dev Close the fundraiser (only owner)
     */
    function closeFundraiser() external onlyOwner {
        isActive = false;
        emit FundraiserClosed(currentAmount);
    }
    
    /**
     * @dev Check if goal is reached
     */
    function isGoalReached() external view returns (bool) {
        return currentAmount >= goalAmount;
    }
    
    /**
     * @dev Get fundraiser progress as percentage (scaled by 10000 for precision)
     */
    function getProgress() external view returns (uint256) {
        if (goalAmount == 0) return 0;
        return (currentAmount * 10000) / goalAmount;
    }
    
    /**
     * @dev Get number of contributors
     */
    function getContributorCount() external view returns (uint256) {
        return contributors.length;
    }
    
    /**
     * @dev Get contributor at index
     */
    function getContributor(uint256 index) external view returns (address) {
        require(index < contributors.length, "Index out of bounds");
        return contributors[index];
    }
    
    /**
     * @dev Get contribution amount for an address
     */
    function getContribution(address contributor) external view returns (uint256) {
        return contributions[contributor];
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get fundraiser details
     */
    function getFundraiserDetails() external view returns (
        string memory _name,
        uint256 _goalAmount,
        uint256 _currentAmount,
        address _owner,
        bool _isActive,
        uint256 _contributorCount,
        uint256 _progress
    ) {
        return (
            name,
            goalAmount,
            currentAmount,
            owner,
            isActive,
            contributors.length,
            goalAmount > 0 ? (currentAmount * 10000) / goalAmount : 0
        );
    }
} 