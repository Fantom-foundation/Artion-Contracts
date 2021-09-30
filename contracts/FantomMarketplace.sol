// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interface/IFantomAddressRegistry.sol";
import "./interface/IFantomOfferBundleMarketplace.sol";
import "./interface/IFantomNFTFactory.sol";
import "./interface/IFantomTokenRegistry.sol";
import "./interface/IFantomPriceFeed.sol";
import "./interface/IFantomListingMarketplace.sol";
import "./interface/IFantomOfferMarketplace.sol";

contract FantomMarketplace is OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeMath for uint256;
    using AddressUpgradeable for address payable;
    using SafeERC20 for IERC20;

    event ItemSold(
        address indexed seller,
        address indexed buyer,
        address indexed nft,
        uint256 tokenId,
        uint256 quantity,
        address payToken,
        int256 unitPrice,
        uint256 pricePerItem
    );
    event UpdatePlatformFee(uint16 platformFee);
    event UpdatePlatformFeeRecipient(address payable platformFeeRecipient);

    /// @notice Structure for listed items
    struct Listing {
        uint256 quantity;
        address payToken;
        uint256 pricePerItem;
        uint256 startingTime;
    }

    struct CollectionRoyalty {
        uint16 royalty;
        address creator;
        address feeRecipient;
    }

    bytes4 private constant INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 private constant INTERFACE_ID_ERC1155 = 0xd9b67a26;

    /// @notice NftAddress -> Token ID -> Minter
    mapping(address => mapping(uint256 => address)) public minters;

    /// @notice NftAddress -> Token ID -> Royalty
    mapping(address => mapping(uint256 => uint16)) public royalties;

    /// @notice Platform fee
    uint16 public platformFee;

    /// @notice Platform fee receipient
    address payable public feeReceipient;

    /// @notice NftAddress -> Royalty
    mapping(address => CollectionRoyalty) public collectionRoyalties;

    /// @notice Address registry
    IFantomAddressRegistry public addressRegistry;

    /// @notice FantomOfferMarketplace Address
    address public fantomOfferMarketplaceAddress;

    /// @notice FantomMarketplace
    IFantomOfferMarketplace public fantomOfferMarketplace;

    /// @notice FantomMarketplace
    IFantomListingMarketplace public fantomListingMarketplace;

    modifier isListed(
        address _nftAddress,
        uint256 _tokenId,
        address _owner
    ) {
        (uint256 quantity, , , ) = fantomListingMarketplace.listings(_nftAddress, _tokenId, _owner);
        require(quantity > 0, "not listed item");
        _;
    }

    modifier onlyFantomOfferMarketplace(){
        require(_msgSender() == fantomOfferMarketplaceAddress, "not called by FantomOfferMarketplace");
        _;
    }

    modifier validListing(
        address _nftAddress,
        uint256 _tokenId,
        address _owner
    ) {
        (uint256 quantity, , , uint256 startingTime ) = fantomListingMarketplace.listings(_nftAddress, _tokenId, _owner);
        if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721)) {
            IERC721 nft = IERC721(_nftAddress);
            require(nft.ownerOf(_tokenId) == _owner, "not owning item");
        } else if (
            IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC1155)
        ) {
            IERC1155 nft = IERC1155(_nftAddress);
            require(
                nft.balanceOf(_owner, _tokenId) >= quantity,                
                "not owning item"
            );
        } else {
            revert("invalid nft address");
        }
        require(_getNow() >= startingTime, "item not buyable");
        _;
    }

    /// @notice Contract initializer
    function initialize(address payable _feeRecipient, uint16 _platformFee, address _fantomOfferMarketplaceAddress, address _fantomListingMarketplaceAddress)
        public
        initializer
    {
        platformFee = _platformFee;
        feeReceipient = _feeRecipient;

        fantomOfferMarketplaceAddress = _fantomOfferMarketplaceAddress;
        fantomOfferMarketplace = IFantomOfferMarketplace(_fantomOfferMarketplaceAddress);

        fantomListingMarketplace = IFantomListingMarketplace(_fantomListingMarketplaceAddress);

        __Ownable_init();
        __ReentrancyGuard_init();
    }



    /// @notice Method for buying listed NFT
    /// @param _nftAddress NFT contract address
    /// @param _tokenId TokenId
    function buyItem(
        address _nftAddress,
        uint256 _tokenId,
        address payable _owner
    )
        external
        payable
        nonReentrant
        isListed(_nftAddress, _tokenId, _owner)
        validListing(_nftAddress, _tokenId, _owner)
    {
        Listing memory listedItem;
        (listedItem.quantity, listedItem.payToken, listedItem.pricePerItem, ) = fantomListingMarketplace.listings(_nftAddress, _tokenId, _owner);
        require(listedItem.payToken == address(0), "invalid pay token");
        require(
            msg.value >= listedItem.pricePerItem.mul(listedItem.quantity),
            "insufficient balance to buy"
        );

        _buyItem(_nftAddress, _tokenId, address(0), _owner);
    }

    /// @notice Method for buying listed NFT
    /// @param _nftAddress NFT contract address
    /// @param _tokenId TokenId
    /// refactor
    function buyItemWithERC20(  //function overloading doesn't work when testing
    //function buyItem(
        address _nftAddress,
        uint256 _tokenId,
        address _payToken,
        address _owner
    )
        external
        nonReentrant
        isListed(_nftAddress, _tokenId, _owner)
        validListing(_nftAddress, _tokenId, _owner)
    {
        (, address payToken, , ) = fantomListingMarketplace.listings(_nftAddress, _tokenId, _owner);
        require(payToken == _payToken, "invalid pay token");

        _buyItem(_nftAddress, _tokenId, _payToken, _owner);
    }

    function _buyItem(
        address _nftAddress,
        uint256 _tokenId,
        address _payToken,
        address _owner
    ) private {
        Listing memory listedItem;
        (listedItem.quantity, listedItem.payToken, listedItem.pricePerItem, ) = fantomListingMarketplace.listings(_nftAddress, _tokenId, _owner);
        uint256 price = listedItem.pricePerItem.mul(listedItem.quantity);
        uint256 feeAmount = price.mul(platformFee).div(1e3);
        if (_payToken == address(0)) {
            (bool feeTransferSuccess, ) = feeReceipient.call{value: feeAmount}(
                ""
            );
            require(feeTransferSuccess, "fee transfer failed");
        } else {
            IERC20(_payToken).safeTransferFrom(
                _msgSender(),
                feeReceipient,
                feeAmount
            );
        }

        address minter = minters[_nftAddress][_tokenId];
        uint16 royalty = royalties[_nftAddress][_tokenId];
        if (minter != address(0) && royalty != 0) {
            uint256 royaltyFee = price.sub(feeAmount).mul(royalty).div(10000);
            if (_payToken == address(0)) {
                (bool royaltyTransferSuccess, ) = payable(minter).call{
                    value: royaltyFee
                }("");
                require(royaltyTransferSuccess, "royalty fee transfer failed");
            } else {
                IERC20(_payToken).safeTransferFrom(
                    _msgSender(),
                    minter,
                    royaltyFee
                );
            }
            feeAmount = feeAmount.add(royaltyFee);
        } else {
            minter = collectionRoyalties[_nftAddress].feeRecipient;
            royalty = collectionRoyalties[_nftAddress].royalty;
            if (minter != address(0) && royalty != 0) {
                uint256 royaltyFee = price.sub(feeAmount).mul(royalty).div(
                    10000
                );
                if (_payToken == address(0)) {
                    (bool royaltyTransferSuccess, ) = payable(minter).call{
                        value: royaltyFee
                    }("");
                    require(
                        royaltyTransferSuccess,
                        "royalty fee transfer failed"
                    );
                } else {
                    IERC20(_payToken).safeTransferFrom(
                        _msgSender(),
                        minter,
                        royaltyFee
                    );
                }
                feeAmount = feeAmount.add(royaltyFee);
            }
        }
        if (_payToken == address(0)) {
            (bool ownerTransferSuccess, ) = _owner.call{
                value: price.sub(feeAmount)
            }("");
            require(ownerTransferSuccess, "owner transfer failed");
        } else {
            IERC20(_payToken).safeTransferFrom(
                _msgSender(),
                _owner,
                price.sub(feeAmount)
            );
        }

        // Transfer NFT to buyer
        if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721)) {
            IERC721(_nftAddress).safeTransferFrom(
                _owner,
                _msgSender(),
                _tokenId
            );
        } else {
            IERC1155(_nftAddress).safeTransferFrom(
                _owner,
                _msgSender(),
                _tokenId,
                listedItem.quantity,
                bytes("")
            );
        }
        IFantomOfferBundleMarketplace(addressRegistry.offerBundleMarketplace())
            .validateItemSold(_nftAddress, _tokenId, listedItem.quantity);
        
        emit ItemSold(
            _owner,
            _msgSender(),
            _nftAddress,
            _tokenId,
            listedItem.quantity,
            _payToken,
            fantomListingMarketplace.getPrice(_payToken),
            price.div(listedItem.quantity)
        );
        fantomListingMarketplace.deleteListing(_nftAddress, _tokenId, _owner);
    }



    /// @notice Method for setting royalty
    /// @param _nftAddress NFT contract address
    /// @param _tokenId TokenId
    /// @param _royalty Royalty
    function registerRoyalty(
        address _nftAddress,
        uint256 _tokenId,
        uint16 _royalty
    ) external {
        require(_royalty <= 10000, "invalid royalty");
        require(_isFantomNFT(_nftAddress), "invalid nft address");
        if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721)) {
            IERC721 nft = IERC721(_nftAddress);
            require(nft.ownerOf(_tokenId) == _msgSender(), "not owning item");
        } else if (
            IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC1155)
        ) {
            IERC1155 nft = IERC1155(_nftAddress);
            require(
                nft.balanceOf(_msgSender(), _tokenId) > 0,
                "not owning item"
            );
        }

        require(
            minters[_nftAddress][_tokenId] == address(0),
            "royalty already set"
        );
        minters[_nftAddress][_tokenId] = _msgSender();
        royalties[_nftAddress][_tokenId] = _royalty;
    }

    /// @notice Method for setting royalty
    /// @param _nftAddress NFT contract address
    /// @param _royalty Royalty
    function registerCollectionRoyalty(
        address _nftAddress,
        address _creator,
        uint16 _royalty,
        address _feeRecipient
    ) external onlyOwner {
        require(_creator != address(0), "invalid creator address");
        require(_royalty <= 10000, "invalid royalty");
        require(
            _royalty == 0 || _feeRecipient != address(0),
            "invalid fee recipient address"
        );
        require(!_isFantomNFT(_nftAddress), "invalid nft address");
        require(
            collectionRoyalties[_nftAddress].creator == address(0),
            "royalty already set"
        );
        collectionRoyalties[_nftAddress] = CollectionRoyalty(
            _royalty,
            _creator,
            _feeRecipient
        );
    }

    function _isFantomNFT(address _nftAddress) internal view returns (bool) {
        return
            addressRegistry.artion() == _nftAddress ||
            IFantomNFTFactory(addressRegistry.factory()).exists(_nftAddress) ||
            IFantomNFTFactory(addressRegistry.privateFactory()).exists(
                _nftAddress
            ) ||
            IFantomNFTFactory(addressRegistry.artFactory()).exists(
                _nftAddress
            ) ||
            IFantomNFTFactory(addressRegistry.privateArtFactory()).exists(
                _nftAddress
            );
    }

    /**
     @notice Method for updating platform fee
     @dev Only admin
     @param _platformFee uint16 the platform fee to set
     */
    function updatePlatformFee(uint16 _platformFee) external onlyOwner {
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


    function emitItemSoldEvent(
                            address seller,
                            address buyer,
                            address nft,
                            uint256 tokenId,
                            uint256 quantity,
                            address payToken,
                            uint256 pricePerItem
    ) external onlyFantomOfferMarketplace {
        emit ItemSold(
            seller,
            buyer,
            nft,
            tokenId,
            quantity,
            payToken,
            //getPrice(payToken),
            fantomListingMarketplace.getPrice(payToken),
            pricePerItem
        );
    }

    ////////////////////////////
    /// Internal and Private ///
    ////////////////////////////

    function _getNow() internal view virtual returns (uint256) {
        return block.timestamp;
    }

}
