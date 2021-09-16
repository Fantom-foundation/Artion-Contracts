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
import "./interface/IFantomBundleMarketplace.sol";
import "./interface/IFantomNFTFactory.sol";
import "./interface/IFantomTokenRegistry.sol";
import "./interface/IFantomPriceFeed.sol";
import "./interface/IFantomMarketPlace.sol";
import "./interface/IFantomListingMarketPlace.sol";

contract FantomOfferMarketplace is OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeMath for uint256;
    using AddressUpgradeable for address payable;
    using SafeERC20 for IERC20;

    event OfferCreated(
        address indexed creator,
        address indexed nft,
        uint256 tokenId,
        uint256 quantity,
        address payToken,
        uint256 pricePerItem,
        uint256 deadline
    );
    event OfferCanceled(
        address indexed creator,
        address indexed nft,
        uint256 tokenId
    );

    /// @notice Structure for offer
    struct Offer {
        IERC20 payToken;
        uint256 quantity;
        uint256 pricePerItem;
        uint256 deadline;
    }


    struct Misc {     // to resolve 'Stack too deep' because of too many local variables in a function
        uint256 price;
        address payable feeReceipient;
        uint16 platformFee;
        uint256 royaltyFee;
    }

    bytes4 private constant INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 private constant INTERFACE_ID_ERC1155 = 0xd9b67a26;

    /// @notice NftAddress -> Token ID -> Offerer -> Offer
    mapping(address => mapping(uint256 => mapping(address => Offer)))
        public offers;

    /// @notice Address registry
    IFantomAddressRegistry public addressRegistry;

    /// @notice FantomMarketplace Address
    address public fantomMarketplaceAddress;

    /// @notice FantomMarketplace
    IFantomMarketplace public fantomMarketplace;

    /// @notice FantomListingMarketplace Address
    address public fantomListingMarketplaceAddress;

    /// @notice FantomMarketplace
    IFantomListingMarketplace public fantomListingMarketplace;

    /*address payable private feeReceipient;

    uint16 private platformFee;

    uint256 private royaltyFee;*/

    modifier offerNotExists(
        address _nftAddress,
        uint256 _tokenId,
        address _creator
    ) {
        Offer memory offer = offers[_nftAddress][_tokenId][_creator];
        require(
            offer.quantity == 0 || offer.deadline <= _getNow(),
            "offer already created"
        );
        _;
    }

    modifier offerExists(
        address _nftAddress,
        uint256 _tokenId,
        address _creator
    ) {
        Offer memory offer = offers[_nftAddress][_tokenId][_creator];
        require(
            offer.quantity > 0 && offer.deadline > _getNow(),
            "offer not exists or expired"
        );
        _;
    }

    /// @notice Contract initializer
    function initialize(address _fantomMarketplaceAddress, address _fantomListingMarketplaceAddress)
        public
        initializer
    {
        fantomMarketplaceAddress = _fantomMarketplaceAddress;
        fantomMarketplace = IFantomMarketplace(_fantomMarketplaceAddress);

        fantomListingMarketplaceAddress = _fantomListingMarketplaceAddress;
        fantomListingMarketplace = IFantomListingMarketplace(_fantomListingMarketplaceAddress);

        __Ownable_init();
        __ReentrancyGuard_init();
    }

    /// @notice Method for offering item
    /// @param _nftAddress NFT contract address
    /// @param _tokenId TokenId
    /// @param _payToken Paying token
    /// @param _quantity Quantity of items
    /// @param _pricePerItem Price per item
    /// @param _deadline Offer expiration
    function createOffer(
        address _nftAddress,
        uint256 _tokenId,
        IERC20 _payToken,
        uint256 _quantity,
        uint256 _pricePerItem,
        uint256 _deadline
    ) external offerNotExists(_nftAddress, _tokenId, _msgSender()) {
        require(
            IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721) ||
                IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC1155),
            "invalid nft address"
        );
        require(_deadline > _getNow(), "invalid expiration");
        require(
            address(_payToken) == address(0) ||
                (addressRegistry.tokenRegistry() != address(0) &&
                    IFantomTokenRegistry(addressRegistry.tokenRegistry())
                        .enabled(address(_payToken))),
            "invalid pay token"
        );

        offers[_nftAddress][_tokenId][_msgSender()] = Offer(
            _payToken,
            _quantity,
            _pricePerItem,
            _deadline
        );

        emit OfferCreated(
            _msgSender(),
            _nftAddress,
            _tokenId,
            _quantity,
            address(_payToken),
            _pricePerItem,
            _deadline
        );
    }

    /// @notice Method for canceling the offer
    /// @param _nftAddress NFT contract address
    /// @param _tokenId TokenId
    function cancelOffer(address _nftAddress, uint256 _tokenId)
        external
        offerExists(_nftAddress, _tokenId, _msgSender())
    {
        delete (offers[_nftAddress][_tokenId][_msgSender()]);
        emit OfferCanceled(_msgSender(), _nftAddress, _tokenId);
    }

    /// @notice Method for accepting the offer
    /// @param _nftAddress NFT contract address
    /// @param _tokenId TokenId
    /// @param _creator Offer creator address
    function acceptOffer(
        address _nftAddress,
        uint256 _tokenId,
        address _creator
    ) external nonReentrant offerExists(_nftAddress, _tokenId, _creator) {
        Offer memory offer = offers[_nftAddress][_tokenId][_creator];
        if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721)) {
            IERC721 nft = IERC721(_nftAddress);
            require(nft.ownerOf(_tokenId) == _msgSender(), "not owning item");
        } else if (
            IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC1155)
        ) {
            IERC1155 nft = IERC1155(_nftAddress);
            require(
                nft.balanceOf(_msgSender(), _tokenId) >= offer.quantity,
                "not owning item"
            );
        } else {
            revert("invalid nft address");
        }

        Misc memory misc; // use struct to resolve 'Stack too deep'
        //uint256 price = offer.pricePerItem.mul(offer.quantity);
        misc.price = offer.pricePerItem.mul(offer.quantity);
        // get the value of platformFee from FantomMarketplace
        misc.platformFee = fantomMarketplace.platformFee();
        //uint256 feeAmount = price.mul(platformFee).div(1e3);
        uint256 feeAmount = misc.price.mul(misc.platformFee).div(1e3);
        //uint256 royaltyFee;

        // get the value of feeReceipient from FantomMarketplace
        misc.feeReceipient = fantomMarketplace.feeReceipient(); 
        //offer.payToken.safeTransferFrom(_creator, feeReceipient, feeAmount);
        offer.payToken.safeTransferFrom(_creator, misc.feeReceipient, feeAmount);
        //replace with a function call from FantomMarketplace
        //address minter = minters[_nftAddress][_tokenId];
        address minter = fantomMarketplace.minters(_nftAddress, _tokenId);
        //replace with a function call from FantomMarketplace        
        //uint16 royalty = royalties[_nftAddress][_tokenId];        
        uint16 royalty = fantomMarketplace.royalties(_nftAddress, _tokenId);
        if (minter != address(0) && royalty != 0) {
            //royaltyFee = price.sub(feeAmount).mul(royalty).div(10000);
            misc.royaltyFee = misc.price.sub(feeAmount).mul(royalty).div(10000);
            //offer.payToken.safeTransferFrom(_creator, minter, royaltyFee);
            offer.payToken.safeTransferFrom(_creator, minter, misc.royaltyFee);
            //feeAmount = feeAmount.add(royaltyFee);
            feeAmount = feeAmount.add(misc.royaltyFee);
        } else {
            // replace with a function call from FantomMarketplace
            //minter = collectionRoyalties[_nftAddress].feeRecipient;
            (, , minter) = fantomMarketplace.collectionRoyalties(_nftAddress);
            // replace with a function call from FantomMarketplace
            //royalty = collectionRoyalties[_nftAddress].royalty;
            (royalty, ,) = fantomMarketplace.collectionRoyalties(_nftAddress);
            if (minter != address(0) && royalty != 0) {
                //royaltyFee = price.sub(feeAmount).mul(royalty).div(10000);
                misc.royaltyFee = misc.price.sub(feeAmount).mul(royalty).div(10000);
                //offer.payToken.safeTransferFrom(_creator, minter, royaltyFee);
                offer.payToken.safeTransferFrom(_creator, minter, misc.royaltyFee);
                //feeAmount = feeAmount.add(royaltyFee);
                feeAmount = feeAmount.add(misc.royaltyFee);
            }
        }
        offer.payToken.safeTransferFrom(
            _creator,
            _msgSender(),
           // price.sub(feeAmount)
            misc.price.sub(feeAmount)
        );

        // Transfer NFT to buyer
        if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721)) {
            IERC721(_nftAddress).safeTransferFrom(
                _msgSender(),
                _creator,
                _tokenId
            );
        } else {
            IERC1155(_nftAddress).safeTransferFrom(
                _msgSender(),
                _creator,
                _tokenId,
                offer.quantity,
                bytes("")
            );
        }
        IFantomBundleMarketplace(addressRegistry.bundleMarketplace())
            .validateItemSold(_nftAddress, _tokenId, offer.quantity);
        // replace with function call from FantomListingMarketplace
        //delete (listings[_nftAddress][_tokenId][_msgSender()]);
        fantomListingMarketplace.deleteListing(_nftAddress, _tokenId, _msgSender());
        delete (offers[_nftAddress][_tokenId][_creator]);

        // replace with a function call from FantomMarketplace
        /*emit ItemSold(
            _msgSender(),
            _creator,
            _nftAddress,
            _tokenId,
            offer.quantity,
            address(offer.payToken),
            getPrice(address(offer.payToken)),
            offer.pricePerItem
        );*/
        fantomMarketplace.emitItemSoldEvent(
            _msgSender(),
            _creator,
            _nftAddress,
            _tokenId,
            offer.quantity,
            address(offer.payToken),
            offer.pricePerItem
        );
        emit OfferCanceled(_creator, _nftAddress, _tokenId);
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

    function _getNow() internal view virtual returns (uint256) {
        return block.timestamp;
    }
}