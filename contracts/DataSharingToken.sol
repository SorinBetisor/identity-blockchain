// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/**
 * @title DataSharingToken
 * @notice Minimal ERC20-compatible token used to reward users for consenting to data sharing
 */
contract DataSharingToken {
    /// @notice Token metadata
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;

    /// @notice Address with permission to manage minters
    address public owner;

    /// @notice Total token supply
    uint256 public totalSupply;

    /// @notice Balances and allowances
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    /// @notice Addresses allowed to mint new tokens
    mapping(address => bool) public minters;

    error NotOwner();
    error NotMinter();
    error InvalidAddress();
    error InsufficientBalance();
    error InsufficientAllowance();

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event MinterUpdated(address indexed minter, bool isMinter);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @notice Initialize token metadata and make deployer the initial owner/minter
     * @param tokenName Token display name
     * @param tokenSymbol Token ticker
     */
    constructor(string memory tokenName, string memory tokenSymbol) {
        owner = msg.sender;
        name = tokenName;
        symbol = tokenSymbol;

        minters[msg.sender] = true;
        emit OwnershipTransferred(address(0), msg.sender);
        emit MinterUpdated(msg.sender, true);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyMinter() {
        if (!minters[msg.sender]) revert NotMinter();
        _;
    }

    /**
     * @notice Transfer contract ownership
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Add a new minter
     * @param minter Address to grant minting permissions
     */
    function addMinter(address minter) external onlyOwner {
        if (minter == address(0)) revert InvalidAddress();
        minters[minter] = true;
        emit MinterUpdated(minter, true);
    }

    /**
     * @notice Remove an existing minter
     * @param minter Address to revoke minting permissions
     */
    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterUpdated(minter, false);
    }

    /**
     * @notice Mint new tokens to a recipient
     * @param to Recipient address
     * @param amount Number of tokens to mint (18 decimals)
     */
    function mint(address to, uint256 amount) external onlyMinter {
        if (to == address(0)) revert InvalidAddress();

        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    /**
     * @notice Transfer tokens to another address
     * @param to Recipient address
     * @param amount Number of tokens to transfer
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @notice Approve a spender
     * @param spender Spender address
     * @param amount Allowance amount
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        if (spender == address(0)) revert InvalidAddress();
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice Transfer tokens on behalf of another address
     * @param from Address to debit
     * @param to Recipient address
     * @param amount Number of tokens to transfer
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < amount) revert InsufficientAllowance();

        allowance[from][msg.sender] = allowed - amount;
        _transfer(from, to, amount);
        emit Approval(from, msg.sender, allowance[from][msg.sender]);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        if (from == address(0) || to == address(0)) revert InvalidAddress();
        if (balanceOf[from] < amount) revert InsufficientBalance();

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
