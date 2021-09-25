// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract FantomNFTOracle is OwnableUpgradeable {

    /// @notice Address registry
    IFantomAddressRegistry public addressRegistry;

    // NFT address => token ID => Price
    mapping(address => mapping(uint256 => uint256)) public price;
    mapping(address => uint256) public floorPrice;

    modifier onlySystem() {
        require(_msgSender() == addressRegistry.auction()
            || _msgSender() == addressRegistry.marketplace(),
            "only system"
        );
        _;
    }

    /// @notice Contract initializer
    function initialize(address _auction)
        public
        initializer
    {
        require(
            _platformFeeRecipient != address(0),
            "FantomAuction: Invalid Platform Fee Recipient"
        );

        platformFeeRecipient = _platformFeeRecipient;
        emit FantomAuctionContractDeployed();

        __Ownable_init();
        __ReentrancyGuard_init();
    }

    /**
     @notice Gets NFT price or returns floor price if no price has been recorded
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the NFT
     @return address in what token the price is denominated in
     @return uint256 last sold token amount
     */
    function getPrice(address _nftAddress, uint256 _tokenId) public view returns (uint256) {
        if (price[_nftAddress][_tokenId] == 0) { // fallback on floor price
            return getFloorPrice(_nftAddress);
        }
        return price[_nftAddress][_tokenId];
    }

    function getFloorPrice(address _nftAddress) public view returns (uint256) {
        return floorPrice[_nftAddress];
    }

    function setPrice(address _nftAddress, uint256 _tokenId, uint256 _amount) external onlySystem {
        price[_nftAddress][_tokenId] = _amount;
        _refreshFloorPrice(_nftAddress, _tokenId, _amount);
    }

    function _refreshFloorPrice(address _nftAddress, uint256 _tokenId, uint256 _amount) internal {
        // TODO
    }

    //////////
    // Admin /
    //////////

    /**
     @notice Update FantomAddressRegistry contract
     @dev Only admin
     */
    function updateAddressRegistry(address _registry) external onlyOwner {
        addressRegistry = IFantomAddressRegistry(_registry);
    }
}
