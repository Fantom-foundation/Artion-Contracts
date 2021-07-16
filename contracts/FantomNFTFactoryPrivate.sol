// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./FantomNFTTradablePrivate.sol";

contract FantomNFTFactoryPrivate is Ownable {
    /// @dev Events of the contract
    event ContractCreated(address creator, address nft);

    /// @notice Fantom auction contract address;
    address public auction;

    /// @notice Fantom marketplace contract address;
    address public marketplace;

    /// @notice Fantom bundle marketplace contract address;
    address public bundleMarketplace;

    /// @notice NFT mint fee
    uint256 public mintFee;

    /// @notice Platform fee for deploying new NFT contract
    uint256 public platformFee;

    /// @notice Platform fee recipient
    address payable public feeRecipient;

    /// @notice NFT Address => Bool
    mapping(address => bool) public exists;

    /// @notice Contract constructor
    constructor(
        address _auction,
        address _marketplace,
        address _bundleMarketplace,
        uint256 _mintFee,
        address payable _feeRecipient,
        uint256 _platformFee
    ) public {
        auction = _auction;
        marketplace = _marketplace;
        bundleMarketplace = _bundleMarketplace;
        mintFee = _mintFee;
        feeRecipient = _feeRecipient;
        platformFee = _platformFee;
    }

    /**
    @notice Update auction contract
    @dev Only admin
    @param _auction address the auction contract address to set
    */
    function updateAuction(address _auction) external onlyOwner {
        auction = _auction;
    }

    /**
    @notice Update marketplace contract
    @dev Only admin
    @param _marketplace address the marketplace contract address to set
    */
    function updateMarketplace(address _marketplace) external onlyOwner {
        marketplace = _marketplace;
    }

    /**
    @notice Update bundle marketplace contract
    @dev Only admin
    @param _bundleMarketplace address the bundle marketplace contract address to set
    */
    function updateBundleMarketplace(address _bundleMarketplace)
        external
        onlyOwner
    {
        bundleMarketplace = _bundleMarketplace;
    }

    /**
    @notice Update mint fee
    @dev Only admin
    @param _mintFee uint256 the platform fee to set
    */
    function updateMintFee(uint256 _mintFee) external onlyOwner {
        mintFee = _mintFee;
    }

    /**
    @notice Update platform fee
    @dev Only admin
    @param _platformFee uint256 the platform fee to set
    */
    function updatePlatformFee(uint256 _platformFee) external onlyOwner {
        platformFee = _platformFee;
    }

    /**
     @notice Method for updating platform fee address
     @dev Only admin
     @param _feeRecipient payable address the address to sends the funds to
     */
    function updateFeeRecipient(address payable _feeRecipient)
        external
        onlyOwner
    {
        feeRecipient = _feeRecipient;
    }

    /// @notice Method for deploy new FantomNFTTradable contract
    /// @param _name Name of NFT contract
    /// @param _symbol Symbol of NFT contract
    function createNFTContract(string memory _name, string memory _symbol)
        external
        payable
        returns (address)
    {
        require(msg.value >= platformFee, "Insufficient funds.");
        (bool success,) = feeRecipient.call{value: msg.value}("");
        require(success, "Transfer failed");

        FantomNFTTradablePrivate nft = new FantomNFTTradablePrivate(
            _name,
            _symbol,
            auction,
            marketplace,
            bundleMarketplace,
            mintFee,
            feeRecipient
        );
        exists[address(nft)] = true;
        nft.transferOwnership(_msgSender());
        emit ContractCreated(_msgSender(), address(nft));
        return address(nft);
    }
}
