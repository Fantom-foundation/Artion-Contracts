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
import "./interface/IFantomListingBundleMarketplace.sol";
import "./interface/IFantomOfferBundleMarketplace.sol";

contract FantomBundleMarketplace is
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeMath for uint256;
    using AddressUpgradeable for address payable;
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    /// @notice Events for the contract    
    event ItemSold(
        address indexed seller,
        address indexed buyer,
        string bundleID,
        address payToken,
        int256 unitPrice,
        uint256 price
    );    
    event UpdatePlatformFee(uint256 platformFee);
    event UpdatePlatformFeeRecipient(address payable platformFeeRecipient);

    /// @notice Structure for Bundle Item Listing
    struct Listing {
        address[] nfts;
        uint256[] tokenIds;
        uint256[] quantities;
        address payToken;
        uint256 price;
        uint256 startingTime;
    }
   
    bytes4 private constant INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 private constant INTERFACE_ID_ERC1155 = 0xd9b67a26;

    /// @notice Owner -> Bundle ID -> Bundle Listing item
    //mapping(address => mapping(bytes32 => Listing)) public listings;

    /// @notice Bundle ID -> Wwner
    mapping(bytes32 => address) public owners;

    mapping(address => mapping(uint256 => EnumerableSet.Bytes32Set)) bundleIdsPerItem;

    mapping(bytes32 => mapping(address => mapping(uint256 => uint256))) nftIndexes;

    mapping(bytes32 => string) bundleIds;

    /// @notice Bundle ID -> Offerer -> Offer
    //mapping(bytes32 => mapping(address => Offer)) public offers;

    /// @notice Platform fee
    uint256 public platformFee;

    /// @notice Platform fee receipient
    address payable public feeReceipient;

    /// @notice Address registry
    IFantomAddressRegistry public addressRegistry;
    
    /// @notice FantomListingBundleMarketplace Address
    address public fantomListingBundleMarketplaceAddress;

    /// @notice FantomOfferBundleMarketplace Address
    address public fantomOfferBundleMarketplaceAddress;

    /// @notice FantomListingBundleMarketplace
    IFantomListingBundleMarketplace public fantomListingBundleMarketplace;

    /// @notice FantomListingBundleMarketplace
    IFantomOfferBundleMarketplace public fantomOfferBundleMarketplace;

    modifier onlyFantomListingOrOfferBundleMarketplace() {
        require(_msgSender() == fantomListingBundleMarketplaceAddress || 
            _msgSender() == fantomOfferBundleMarketplaceAddress
            , "sender is not allowed");
        _;
    }

    /// @notice Contract initializer
    function initialize(address payable _feeRecipient, uint256 _platformFee,
                address _fantomOfferBundleMarketplaceAddress,
                address _fantomListingBundleMarketplaceAddress
                )
        public
        initializer
    {
        platformFee = _platformFee;
        feeReceipient = _feeRecipient;

        fantomListingBundleMarketplaceAddress = _fantomListingBundleMarketplaceAddress;
        fantomListingBundleMarketplace = IFantomListingBundleMarketplace(_fantomListingBundleMarketplaceAddress);

        fantomOfferBundleMarketplaceAddress = _fantomOfferBundleMarketplaceAddress;
        fantomOfferBundleMarketplace = IFantomOfferBundleMarketplace(_fantomOfferBundleMarketplaceAddress);

        __Ownable_init();
        __ReentrancyGuard_init();
    }


    /// @notice Method for buying listed NFT bundle
    /// @param _bundleID Bundle ID
    function buyItem(string memory _bundleID) external payable nonReentrant {
        bytes32 bundleID = _getBundleID(_bundleID); //keccak256(abi.encodePacked(_bundleID));
        address owner = owners[bundleID];
        require(owner != address(0), "invalid id");
        (, , ,address payToken, uint256 price,) = fantomListingBundleMarketplace.getListing(owner, _bundleID);
        require(payToken == address(0), "invalid pay token");
        require(msg.value >= price, "insufficient balance to buy");

        _buyItem(_bundleID, address(0));
    }

    /// @notice Method for buying listed NFT bundle
    /// @param _bundleID Bundle ID
    function buyItemWithERC20(string memory _bundleID, address _payToken)
        external
        nonReentrant
    {
        bytes32 bundleID = _getBundleID(_bundleID); //keccak256(abi.encodePacked(_bundleID));
        address owner = owners[bundleID];
        require(owner != address(0), "invalid id");
                
        (, , ,address payToken, ,) = fantomListingBundleMarketplace.getListing(owner, _bundleID);
        require(payToken == _payToken, "invalid pay token");

        _buyItem(_bundleID, _payToken);
    }

    function _buyItem(string memory _bundleID, address _payToken) private {
        bytes32 bundleID = _getBundleID(_bundleID); // keccak256(abi.encodePacked(_bundleID));
        address owner = owners[bundleID];

        Listing memory listing;
        (listing.nfts, listing.tokenIds,listing.quantities, listing.payToken, listing.price, listing.startingTime) = fantomListingBundleMarketplace.getListing(owner, _bundleID);
        require(listing.price > 0, "not listed");

        for (uint256 i; i < listing.nfts.length; i++) {
            if (_supportsInterface(listing.nfts[i], INTERFACE_ID_ERC721)) {
                _check721Owning(listing.nfts[i], listing.tokenIds[i], owner);
            } else if (_supportsInterface(listing.nfts[i], INTERFACE_ID_ERC1155)) {
                  _check1155Owning(
                    listing.nfts[i],
                    listing.tokenIds[i],
                    listing.quantities[i],
                    owner
                );

            }
        }
        require(_getNow() >= listing.startingTime, "not buyable");

        uint256 price = listing.price;
        uint256 feeAmount = price.mul(platformFee).div(1e3);
        if (_payToken == address(0)) {
            (bool feeTransferSuccess, ) = feeReceipient.call{value: feeAmount}(
                ""
            );
            require(
                feeTransferSuccess,
                "FantomMarketplace: Fee transfer failed"
            );
            (bool ownerTransferSuccess, ) = owner.call{
                value: price.sub(feeAmount)
            }("");
            require(
                ownerTransferSuccess,
                "FantomMarketplace: Owner transfer failed"
            );
        } else {
            IERC20(_payToken).safeTransferFrom(
                _msgSender(),
                feeReceipient,
                feeAmount
            );
            IERC20(_payToken).safeTransferFrom(
                _msgSender(),
                owner,
                price.sub(feeAmount)
            );
        }
        
        // Transfer NFT to buyer
        for (uint256 i; i < listing.nfts.length; i++) {
            if (_supportsInterface(listing.nfts[i], INTERFACE_ID_ERC721)) {
                IERC721(listing.nfts[i]).safeTransferFrom(
                    owner,
                    _msgSender(),
                    listing.tokenIds[i]
                );
            } else {
                IERC1155(listing.nfts[i]).safeTransferFrom(
                    owner,
                    _msgSender(),
                    listing.tokenIds[i],
                    listing.quantities[i],
                    bytes("")
                );
            }
            IFantomOfferMarketplace(addressRegistry.offerMarketplace()).validateItemSold(
                listing.nfts[i],
                listing.tokenIds[i],
                owner,
                _msgSender()
            );
        }
        fantomListingBundleMarketplace.deleteListing(owner, bundleID);
        listing.price = 0;
        fantomListingBundleMarketplace.setListing(_msgSender(), bundleID,
                            listing.nfts,
                            listing.tokenIds,
                            listing.quantities,
                            listing.payToken,
                            listing.price,
                            listing.startingTime
            );
        owners[bundleID] = _msgSender();
        
        fantomOfferBundleMarketplace.deleteOffer(bundleID, _msgSender());
        emit ItemSold(
            owner,
            _msgSender(),
            _bundleID,
            _payToken,
            IFantomListingMarketplace(addressRegistry.listingMarketplace()).getPrice(_payToken),
            price
        );
        fantomOfferBundleMarketplace.emitOfferCanceledEvent(_msgSender(), _bundleID);
    }

    
    /**
     @notice Method for updating platform fee
     @dev Only admin
     @param _platformFee uint256 the platform fee to set
     */
    function updatePlatformFee(uint256 _platformFee) external onlyOwner {
        platformFee = _platformFee;
        emit UpdatePlatformFee(_platformFee);
    }

    /**
     @notice Method for updating platform fee address
     @dev Only admin
     @param _platformFeeRecipient payable address the address to sends the funds to
     */
    function updatePlatformFeeRecipient(address payable _platformFeeRecipient)
        external
        onlyOwner
    {
        feeReceipient = _platformFeeRecipient;
        emit UpdatePlatformFeeRecipient(_platformFeeRecipient);
    }

    /**
     @notice Update FantomAddressRegistry contract
     @dev Only admin
     */
    function updateAddressRegistry(address _registry) external onlyOwner {
        addressRegistry = IFantomAddressRegistry(_registry);
    }


   function setBundleId(bytes32 bundleID, string memory _bundleID) external onlyFantomListingOrOfferBundleMarketplace{
        bundleIds[bundleID] = _bundleID;
    }

    function addBundleIdPerItemAndSetNftIndex(address nft, uint256 tokenId, bytes32 bundleID, uint256 index) external onlyFantomListingOrOfferBundleMarketplace{
        bundleIdsPerItem[nft][tokenId].add(bundleID);
        nftIndexes[bundleID][nft][tokenId] = index;
    }

    function removeBundleIdPerItem(address nft, uint256 tokenId, bytes32 bundleID) external onlyFantomListingOrOfferBundleMarketplace{
        bundleIdsPerItem[nft][tokenId].remove(bundleID);
    }

    function deleteNftIndex(bytes32 bundleID, address nft, uint256 tokenId) external onlyFantomListingOrOfferBundleMarketplace{
        delete (nftIndexes[bundleID][nft][tokenId]);
    }

    function deleteOwner(bytes32 bundleID) external onlyFantomListingOrOfferBundleMarketplace{
        delete (owners[bundleID]);
    }

    function setOwner(bytes32 bundleID, address owner) external onlyFantomListingOrOfferBundleMarketplace{
        owners[bundleID] = owner;
    }

    function setnftIndex(bytes32 bundleID, address nft, uint256 tokenId, uint256 index) external onlyFantomListingOrOfferBundleMarketplace {
        nftIndexes[bundleID][nft][tokenId] = index;
    }

    function deleteBundleId(bytes32 bundleID) external onlyFantomListingOrOfferBundleMarketplace{
        delete (bundleIds[bundleID]);
    }

    function bundleIdsPerItemLength(address nft, uint256 tokenId) external view returns(uint256){
        return bundleIdsPerItem[nft][tokenId].length();
    }

    function bundleIdsPerItemAt(address nft, uint256 tokenId, uint256 atIndex) external view returns(bytes32){
        return bundleIdsPerItem[nft][tokenId].at(atIndex);
    }

    function deleteBundleIdsPerItem(address nft, uint256 tokenId) external onlyFantomListingOrOfferBundleMarketplace{
        delete (bundleIdsPerItem[nft][tokenId]);
    }

    function emitItemSoldEvent(
        address seller,
        address buyer,
        string memory bundleID,
        address payToken,
        int256 unitPrice,
        uint256 price) external onlyFantomListingOrOfferBundleMarketplace{

            emit ItemSold(seller, buyer, bundleID, payToken, unitPrice, price);
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

    function _check721Owning(
        address _nft,
        uint256 _tokenId,
        address _owner
    ) internal view {
        require(IERC721(_nft).ownerOf(_tokenId) == _owner, "not owning item");
    }

    function _check1155Owning(
        address _nft,
        uint256 _tokenId,
        uint256 _quantity,
        address _owner
    ) internal view {
        require(
            IERC1155(_nft).balanceOf(_owner, _tokenId) >= _quantity,
            "not owning item"
        );
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
