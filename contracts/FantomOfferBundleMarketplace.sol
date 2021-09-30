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
        //replace with a local variable and a function call from FantomBundleMarketplace
        //require(owners[bundleID] == _msgSender(), "not owning item");
        address owner = fantomBundleMarketplace.owners(bundleID);
        require(owner == _msgSender(), "not owning item");

        Offer memory offer = offers[bundleID][_creator];
        require(offer.deadline > _getNow(), "offer not exists or expired");

        uint256 price = offer.price;
        //replace with a local variable and a function call from FantomBundleMarketplace
        //uint256 feeAmount = price.mul(platformFee).div(1e3);
        uint256 platformFee = fantomBundleMarketplace.platformFee();
        uint256 feeAmount = price.mul(platformFee).div(1e3);

        //replace with a local variable and a function call from FantomBundleMarketplace
        //offer.payToken.safeTransferFrom(_creator, feeReceipient, feeAmount);
        address feeReceipient = fantomBundleMarketplace.feeReceipient();
        offer.payToken.safeTransferFrom(_creator, feeReceipient, feeAmount);
        offer.payToken.safeTransferFrom(
            _creator,
            _msgSender(),
            price.sub(feeAmount)
        );

        // Transfer NFT to buyer
        // replace with function calls from FantomListingBundleMarketplace
        //Listing memory listing = listings[_msgSender()][bundleID];
        Listing memory listing;
        //(listing.nfts, listing.tokenIds,listing.quantities, listing.payToken, listing.price, listing.startingTime) = fantomListingBundleMarketplace.listings(_msgSender(), bundleID);
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
            
        //replace owners[bundleID] with a local variable and a function call from FantomBundleMarketplace
            //IFantomMarketplace(addressRegistry.marketplace()).validateItemSold(
            IFantomOfferMarketplace(addressRegistry.offerMarketplace()).validateItemSold(
                listing.nfts[i],
                listing.tokenIds[i],
                //owners[bundleID],
                owner,
                _creator
            );
        }
        // replace with a function call from FantomListingBundleMarketplace
        //delete (listings[_msgSender()][bundleID]);
        fantomListingBundleMarketplace.deleteListing(_msgSender(), bundleID);
        listing.price = 0;
        // replace with a function call from FantomListingBundleMarketplace        
        //listings[_creator][bundleID] = listing;
        fantomListingBundleMarketplace.setListing(_creator, bundleID, listing.nfts, listing.tokenIds, listing.quantities, listing.payToken, listing.price, listing.startingTime);
        //replace with a function call from FantomBundleMarketplace.sol
        ///owners[bundleID] = _creator;
        fantomBundleMarketplace.setOwner(bundleID, _creator);
        delete (offers[bundleID][_creator]);

        //replace with a function call from FantomListingBundleMarketplace
        /*emit ItemSold(
            _msgSender(),
            _creator,
            _bundleID,
            address(offer.payToken),
            IFantomMarketplace(addressRegistry.marketplace()).getPrice(address(offer.payToken)),
            offer.price
        );*/
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
        //replace with a funciton call from fantomBundleMarketplace
        //uint256 length = bundleIdsPerItem[_nftAddress][_tokenId].length();
        uint256 length = fantomBundleMarketplace.bundleIdsPerItemLength(_nftAddress,_tokenId);
        for (uint256 i; i < length; i++) {
            //replace with a function call from fantomBundleMarketplace
            //bytes32 bundleID = bundleIdsPerItem[_nftAddress][_tokenId].at(i);
            bytes32 bundleID = fantomBundleMarketplace.bundleIdsPerItemAt(_nftAddress,_tokenId, i);
            //replace with a function call  from fantomBundleMarketplace
            //address _owner = owners[bundleID];
            address _owner = fantomBundleMarketplace.owners(bundleID);
            if (_owner != address(0)) {
                string memory _bundleID = fantomBundleMarketplace.bundleIds(bundleID);
                // replace with function calls from FantomListingBundleMarketplace.sol
                //Listing storage listing = listings[_owner][bundleID];
                Listing memory listing;
                //(listing.nfts, listing.tokenIds,listing.quantities, listing.payToken, listing.price, listing.startingTime) = fantomListingBundleMarketplace.listings(_owner, bundleID);
                (listing.nfts, listing.tokenIds,listing.quantities, listing.payToken, listing.price, listing.startingTime) = fantomListingBundleMarketplace.getListing(_owner, _bundleID);
                // replace with a fucntion call from FantomBundleMarketplace
                //string memory _bundleID = bundleIds[bundleID];
                //string memory _bundleID = fantomBundleMarketplace.bundleIds(bundleID);
                //replace with a function call from FantomBundleMarketplace
                //uint256 index = nftIndexes[bundleID][_nftAddress][_tokenId];
                uint256 index = fantomBundleMarketplace.nftIndexes(bundleID,_nftAddress, _tokenId);
                if (listing.quantities[index] > _quantity) {
                    //replace with  a function call from FantomListingBundleMarketplace.sol
                    //listing.quantities[index] = listing.quantities[index].sub(
                    //    _quantity
                    //);
                    //fantomListingBundleMarketplace.subListingQuantity(owners[bundleID], bundleID, index, _quantity);
                    fantomListingBundleMarketplace.subListingQuantity(_owner, bundleID, index, _quantity);
                } else {
                    //delete (nftIndexes[bundleID][_nftAddress][_tokenId]);
                    fantomBundleMarketplace.deleteNftIndex(bundleID, _nftAddress, _tokenId);
                    if (listing.nfts.length == 1) {
                        //replace with a function call from FantomListingBundleMarketplace.sol
                        //delete (listings[_owner][bundleID]);
                        fantomListingBundleMarketplace.deleteListing(_owner, bundleID);
                        //delete (owners[bundleID]);
                        fantomBundleMarketplace.deleteOwner(bundleID);
                        //delete (bundleIds[bundleID]);
                        fantomBundleMarketplace.deleteBundleId(bundleID);
                        //replace with a function call from FantomListingBundleMarketplace.sol
                        //emit ItemUpdated(
                        //    _owner,
                        //    _bundleID,
                        //    new address[](0),
                        //    new uint256[](0),
                        //    new uint256[](0),
                        //    address(0),
                        //    0
                        //);
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
                            //replace with a function call from FantomListingBundleMarketplace.sol
                            // listing.nfts[index] = listing.nfts[
                            //     listing.nfts.length - 1
                            // ];
                            // listing.tokenIds[index] = listing.tokenIds[
                            //     listing.tokenIds.length - 1
                            // ];
                            // listing.quantities[index] = listing.quantities[
                            //     listing.quantities.length - 1
                            // ];
                            fantomListingBundleMarketplace.copyLastListingNftsTokenIdsQuantities(_owner, bundleID, index);
                            //replace with a function call from FantomBundleMarketplace
                            //nftIndexes[bundleID][listing.nfts[index]][listing.tokenIds[index]] = index;
                            fantomBundleMarketplace.setnftIndex(bundleID, listing.nfts[index], listing.tokenIds[index], index);
                        }
                        //replace with a function call from FantomListingBundleMarketplace
                        // listing.nfts.pop();
                        // listing.tokenIds.pop();
                        // listing.quantities.pop();
                        fantomListingBundleMarketplace.popListingNftsTokenIdsQuantities(_owner, bundleID);
                    }
                }
                //replace with a function call from fantomListingBundleMarketplace
                // emit ItemUpdated(
                //     _owner,
                //     _bundleID,
                //     listing.nfts,
                //     listing.tokenIds,
                //     listing.quantities,
                //     listing.payToken,
                //     listing.price
                // );
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
        //replace with a function call from FantomBundleMarketplace.sol
        //delete (bundleIdsPerItem[_nftAddress][_tokenId]);
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