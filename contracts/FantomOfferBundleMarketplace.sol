// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";


import "./interface/IFantomAddressRegistry.sol";
import "./interface/IFantomMarketplace.sol";
import "./interface/IFantomListingMarketplace.sol";
import "./interface/IFantomOfferMarketplace.sol";
import "./interface/IFantomTokenRegistry.sol";
import "./interface/IFantomBundleMarketplace.sol";
import "./interface/IFantomListingBundleMarketplace.sol";


contract FantomOfferBundleMarketplace is
OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeMath for uint256;
    using AddressUpgradeable for address payable;
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    event OfferCreated(
        address indexed creator,
        string bundleID,
        address payToken,
        uint256 price,
        uint256 deadline
    );

    event OfferCanceled(address indexed creator, string bundleID);

    /// @notice Structure for Bundle Item Listing
    struct Listing {
        address[] nfts;
        uint256[] tokenIds;
        uint256[] quantities;
        address payToken;
        uint256 price;
        uint256 startingTime;
    }

    /// @notice Structure for bundle offer
    struct Offer {
        IERC20 payToken;
        uint256 price;
        uint256 deadline;
    }

    bytes4 private constant INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 private constant INTERFACE_ID_ERC1155 = 0xd9b67a26;

      /// @notice Bundle ID -> Offerer -> Offer
    mapping(bytes32 => mapping(address => Offer)) public offers;

    /// @notice Address registry
    IFantomAddressRegistry public addressRegistry;
    
    /// @notice FantomBundleMarketplace Address
    address public fantomBundleMarketplaceAddress;

    /// @notice FantomListingBundleMarketplace Address
    address public fantomListingBundleMarketplaceAddress;

    /// @notice FantomBundleMarketplace
    IFantomBundleMarketplace public fantomBundleMarketplace;

    /// @notice FantomListingBundleMarketplace
    IFantomListingBundleMarketplace public fantomListingBundleMarketplace;

    modifier onlyContract() {
        require(
            addressRegistry.auction() == _msgSender() ||
                addressRegistry.marketplace() == _msgSender(),
            "sender must be auction or marketplace"
        );
        _;
    }

    modifier onlyFantomBundleMarketplace() {
        require(_msgSender() == fantomBundleMarketplaceAddress, "sender is not allowed");
        _;
    }

    /// @notice Contract initializer
    function initialize(address _fantomBundleMarketplaceAddress, address _fantomListingBundleMarketplaceAddress)
        public
        initializer
    {

        fantomBundleMarketplaceAddress = _fantomBundleMarketplaceAddress;
        fantomBundleMarketplace = IFantomBundleMarketplace(_fantomBundleMarketplaceAddress);

        fantomListingBundleMarketplaceAddress = _fantomListingBundleMarketplaceAddress;
        fantomListingBundleMarketplace = IFantomListingBundleMarketplace(_fantomListingBundleMarketplaceAddress);

        __Ownable_init();
        __ReentrancyGuard_init();
    }

    /// @notice Method for offering bundle item
    /// @param _bundleID Bundle ID
    /// @param _payToken Paying token
    /// @param _price Price
    /// @param _deadline Offer expiration
    function createOffer(
        string memory _bundleID,
        IERC20 _payToken,
        uint256 _price,
        uint256 _deadline
    ) external {
        bytes32 bundleID = _getBundleID(_bundleID);
        //replace with a local variable and a function call from FantomBundleMarketplace
        //require(owners[bundleID] != address(0), "invalid id");
        address owner = fantomBundleMarketplace.owners(bundleID);
        require(owner != address(0),"invalid id");
        require(_deadline > _getNow(), "invalid expiration");
        require(_price > 0, "invalid price");

        Offer memory offer = offers[bundleID][_msgSender()];
        require(offer.deadline <= _getNow(), "offer exists");

        offers[bundleID][_msgSender()] = Offer(_payToken, _price, _deadline);

        emit OfferCreated(
            _msgSender(),
            _bundleID,
            address(_payToken),
            _price,
            _deadline
        );
    }

    /// @notice Method for canceling the offer
    /// @param _bundleID Bundle ID
    function cancelOffer(string memory _bundleID) external {
        bytes32 bundleID = _getBundleID(_bundleID);
        Offer memory offer = offers[bundleID][_msgSender()];
        require(offer.deadline > _getNow(), "offer not exists or expired");
        delete (offers[bundleID][_msgSender()]);
        emit OfferCanceled(_msgSender(), _bundleID);
    }

    /// @notice Method for accepting the offer
    function acceptOffer(string memory _bundleID, address _creator)
        external
        nonReentrant
    {
        bytes32 bundleID = _getBundleID(_bundleID);      
        address owner = fantomBundleMarketplace.owners(bundleID);
        require(owner == _msgSender(), "not owning item");

        Offer memory offer = offers[bundleID][_creator];
        require(offer.deadline > _getNow(), "offer not exists or expired");

        uint256 price = offer.price;        
        uint256 platformFee = fantomBundleMarketplace.platformFee();
        uint256 feeAmount = price.mul(platformFee).div(1e3);
        
        address feeReceipient = fantomBundleMarketplace.feeReceipient();
        offer.payToken.safeTransferFrom(_creator, feeReceipient, feeAmount);
        offer.payToken.safeTransferFrom(
            _creator,
            _msgSender(),
            price.sub(feeAmount)
        );

        // Transfer NFT to buyer
        Listing memory listing;
        (listing.nfts, listing.tokenIds,listing.quantities, listing.payToken, listing.price, listing.startingTime) = fantomListingBundleMarketplace.getListing(_msgSender(), _bundleID);
        for (uint256 i; i < listing.nfts.length; i++) {
            if (_supportsInterface(listing.nfts[i], INTERFACE_ID_ERC721)) {
                IERC721(listing.nfts[i]).safeTransferFrom(
                    _msgSender(),
                    _creator,
                    listing.tokenIds[i]
                );
            } else {
                IERC1155(listing.nfts[i]).safeTransferFrom(
                    _msgSender(),
                    _creator,
                    listing.tokenIds[i],
                    listing.quantities[i],
                    bytes("")
                );
            }
            
            IFantomOfferMarketplace(addressRegistry.offerMarketplace()).validateItemSold(
                listing.nfts[i],
                listing.tokenIds[i],
                owner,
                _creator
            );
        }
        fantomListingBundleMarketplace.deleteListing(_msgSender(), bundleID);
        listing.price = 0;
        fantomListingBundleMarketplace.setListing(_creator, bundleID, listing.nfts, listing.tokenIds, listing.quantities, listing.payToken, listing.price, listing.startingTime);
        fantomBundleMarketplace.setOwner(bundleID, _creator);
        delete (offers[bundleID][_creator]);

        fantomBundleMarketplace.emitItemSoldEvent(
            _msgSender(),
            _creator,
            _bundleID,
            address(offer.payToken),
            IFantomListingMarketplace(addressRegistry.listingMarketplace()).getPrice(address(offer.payToken)),
            offer.price
        );
        emit OfferCanceled(_creator, _bundleID);
    }

    function  deleteOffer(bytes32 bundleID, address offerer) external onlyFantomBundleMarketplace{
        delete (offers[bundleID][offerer]);
    }

    function emitOfferCanceledEvent(address creator, string memory bundleID) external onlyFantomBundleMarketplace{
        emit OfferCanceled(creator, bundleID);
    }
    
    /**
     * @notice Validate and cancel listing
     * @dev Only marketplace can access
     */
    function validateItemSold(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _quantity
    ) external 
        onlyContract
        {
        uint256 length = fantomBundleMarketplace.bundleIdsPerItemLength(_nftAddress,_tokenId);
        for (uint256 i; i < length; i++) {
            bytes32 bundleID = fantomBundleMarketplace.bundleIdsPerItemAt(_nftAddress,_tokenId, i);
            address _owner = fantomBundleMarketplace.owners(bundleID);
            if (_owner != address(0)) {
                string memory _bundleID = fantomBundleMarketplace.bundleIds(bundleID);
                Listing memory listing;
                (listing.nfts, listing.tokenIds,listing.quantities, listing.payToken, listing.price, listing.startingTime) = fantomListingBundleMarketplace.getListing(_owner, _bundleID);
                uint256 index = fantomBundleMarketplace.nftIndexes(bundleID,_nftAddress, _tokenId);
                if (listing.quantities[index] > _quantity) {
                    fantomListingBundleMarketplace.subListingQuantity(_owner, bundleID, index, _quantity);
                } else {                    
                    fantomBundleMarketplace.deleteNftIndex(bundleID, _nftAddress, _tokenId);
                    if (listing.nfts.length == 1) {                        
                        fantomListingBundleMarketplace.deleteListing(_owner, bundleID);                        
                        fantomBundleMarketplace.deleteOwner(bundleID);
                        fantomBundleMarketplace.deleteBundleId(bundleID);
                        fantomListingBundleMarketplace.emitItemUpdatedEvent(
                            _owner,
                            _bundleID,
                            new address[](0),
                            new uint256[](0),
                            new uint256[](0),
                            address(0),
                            0
                        );
                        continue;
                    } else {
                        if (index < listing.nfts.length - 1) {                            
                            fantomListingBundleMarketplace.copyLastListingNftsTokenIdsQuantities(_owner, bundleID, index);                            
                            fantomBundleMarketplace.setnftIndex(bundleID, listing.nfts[index], listing.tokenIds[index], index);
                        }                        
                        fantomListingBundleMarketplace.popListingNftsTokenIdsQuantities(_owner, bundleID);
                    }
                }                
                fantomListingBundleMarketplace.emitItemUpdatedEvent(
                    _owner,
                    _bundleID,
                    listing.nfts,
                    listing.tokenIds,
                    listing.quantities,
                    listing.payToken,
                    listing.price
                );
            }
        }        
        fantomBundleMarketplace.deleteBundleIdsPerItem(_nftAddress, _tokenId);
    }

    /**
     @notice Update FantomAddressRegistry contract
     @dev Only admin
     */
    function updateAddressRegistry(address _registry) external onlyOwner {
        addressRegistry = IFantomAddressRegistry(_registry);
    }

    ////////////////////////////
    /// Internal and Private ///
    ////////////////////////////

    function _supportsInterface(address _addr, bytes4 iface)
        internal
        view
        returns (bool)
    {
        return IERC165(_addr).supportsInterface(iface);
    }

    function _getNow() internal view virtual returns (uint256) {
        return block.timestamp;
    }

    function _getBundleID(string memory _bundleID)
        private
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(_bundleID));
    }

}