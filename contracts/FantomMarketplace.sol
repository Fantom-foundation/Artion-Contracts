// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

interface IFantomAuction {
    function validateCancelAuction(address, uint256) external;
}

interface IFantomBundleMarketplace {
    function validateItemSold(address, uint256) external;
}

contract FantomMarketplace is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using Address for address payable;
    using SafeERC20 for IERC20;

    /// @notice Events for the contract
    event ItemListed(
        address indexed owner,
        address indexed nft,
        uint256 tokenId,
        uint256 quantity,
        uint256 pricePerItem,
        uint256 startingTime,
        bool isPrivate,
        address allowedAddress
    );
    event ItemSold(
        address indexed seller,
        address indexed buyer,
        address indexed nft,
        uint256 tokenId,
        uint256 quantity,
        uint256 price
    );
    event ItemUpdated(
        address indexed owner,
        address indexed nft,
        uint256 tokenId,
        uint256 newPrice
    );
    event ItemCanceled(
        address indexed owner,
        address indexed nft,
        uint256 tokenId
    );
    event OfferCreated(
        address indexed creator,
        address indexed nft,
        uint256 tokenId,
        address payToken,
        uint256 quantity,
        uint256 pricePerItem,
        uint256 deadline
    );
    event OfferCanceled(
        address indexed creator,
        address indexed nft,
        uint256 tokenId
    );
    event UpdatePlatformFee(
        uint256 platformFee
    );
    event UpdatePlatformFeeRecipient(
        address payable platformFeeRecipient
    );

    /// @notice Structure for listed items
    struct Listing {
        uint256 quantity;
        uint256 pricePerItem;
        uint256 startingTime;
        address allowedAddress;
    }

    /// @notice Structure for offer
    struct Offer {
        IERC20 payToken;
        uint256 quantity;
        uint256 pricePerItem;
        uint256 deadline;
    }

    bytes4 private constant INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 private constant INTERFACE_ID_ERC1155 = 0xd9b67a26;

    /// @notice NftAddress -> Token ID -> Owner -> Listing item
    mapping(address => mapping(uint256 => mapping(address => Listing))) public listings;

    /// @notice NftAddress -> Token ID -> Offerer -> Offer
    mapping(address => mapping(uint256 => mapping(address => Offer))) public offers;

    /// @notice Platform fee
    uint256 public platformFee;

    /// @notice Platform fee receipient
    address payable public feeReceipient;

    /// @notice FantomAuction contract
    IFantomAuction public auction;

    /// @notice FantomBundleMarketplace contract
    IFantomBundleMarketplace public marketplace;

    modifier onlyAuction() {
        require(address(auction) == _msgSender(), "Sender must be auction");
        _;
    }

    modifier onlyMarketplace() {
        require(address(marketplace) == _msgSender(), "Sender must be bundle marketplace");
        _;
    }

    /// @notice Contract constructor
    constructor(
        address payable _feeRecipient,
        uint256 _platformFee
    ) public {
        platformFee = _platformFee;
        feeReceipient = _feeRecipient;
    }

    /// @notice Method for listing NFT
    /// @param _nftAddress Address of NFT contract
    /// @param _tokenId Token ID of NFT
    /// @param _quantity token amount to list (needed for ERC-1155 NFTs, set as 1 for ERC-721)
    /// @param _pricePerItem sale price for each iteam
    /// @param _startingTime scheduling for a future sale
    /// @param _allowedAddress optional param for private sale
    function listItem(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _quantity,
        uint256 _pricePerItem,
        uint256 _startingTime,
        address _allowedAddress
    ) external {
        if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721)) {
            IERC721 nft = IERC721(_nftAddress);
            require(nft.ownerOf(_tokenId) == _msgSender(), "Must be owner of NFT.");
            require(nft.isApprovedForAll(_msgSender(), address(this)), "Must be approved before list.");
        }
        else if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC1155)) {
            IERC1155 nft = IERC1155(_nftAddress);
            require(nft.balanceOf(_msgSender(), _tokenId) >= _quantity, "Must hold enough NFTs.");
            require(nft.isApprovedForAll(_msgSender(), address(this)), "Must be approved before list.");
        }
        else {
            revert("Invalid NFT address.");
        }

        listings[_nftAddress][_tokenId][_msgSender()] = Listing(
            _quantity,
            _pricePerItem,
            _startingTime,
            _allowedAddress
        );
        emit ItemListed(
            _msgSender(),
            _nftAddress,
            _tokenId,
            _quantity,
            _pricePerItem,
            _startingTime,
            _allowedAddress == address(0x0),
            _allowedAddress
        );
    }

    /// @notice Method for canceling listed NFT
    function cancelListing(
        address _nftAddress,
        uint256 _tokenId
    ) external nonReentrant {
        require(listings[_nftAddress][_tokenId][_msgSender()].quantity > 0, "Not listed item.");
        _cancelListing(_nftAddress, _tokenId, _msgSender());
    }

    /// @notice Method for updating listed NFT
    /// @param _nftAddress Address of NFT contract
    /// @param _tokenId Token ID of NFT
    /// @param _newPrice New sale price for each iteam
    function updateListing(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _newPrice
    ) external nonReentrant {
        Listing storage listedItem = listings[_nftAddress][_tokenId][_msgSender()];
        require(listedItem.quantity > 0, "Not listed item.");
        if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721)) {
            IERC721 nft = IERC721(_nftAddress);
            require(nft.ownerOf(_tokenId) == _msgSender(), "Not owning the item.");
        }
        else if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC1155)) {
            IERC1155 nft = IERC1155(_nftAddress);
            require(nft.balanceOf(_msgSender(), _tokenId) >= listedItem.quantity, "Not owning the item.");
        }
        else {
            revert("Invalid NFT address.");
        }

        listedItem.pricePerItem = _newPrice;
        emit ItemUpdated(_msgSender(), _nftAddress, _tokenId, _newPrice);
    }

    /// @notice Method for buying listed NFT
    /// @param _nftAddress NFT contract address
    /// @param _tokenId TokenId
    function buyItem(
        address _nftAddress,
        uint256 _tokenId,
        address payable _owner
    ) external payable nonReentrant {
        Listing memory listedItem = listings[_nftAddress][_tokenId][_owner];
        require(listedItem.quantity > 0, "Not listed item.");
        if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721)) {
            IERC721 nft = IERC721(_nftAddress);
            require(nft.ownerOf(_tokenId) == _owner, "Not owning the item.");
        }
        else if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC1155)) {
            IERC1155 nft = IERC1155(_nftAddress);
            require(nft.balanceOf(_owner, _tokenId) >= listedItem.quantity, "Not owning the item.");
        }
        else {
            revert("Invalid NFT address.");
        }
        require(_getNow() >= listedItem.startingTime, "Item is not buyable yet.");
        require(msg.value >= listedItem.pricePerItem.mul(listedItem.quantity), "Not enough amount to buy item.");
        if (listedItem.allowedAddress != address(0)) {
            require(listedItem.allowedAddress == _msgSender(), "You are not eligable to buy item.");
        }

        uint256 feeAmount = msg.value.mul(platformFee).div(1e3);
        (bool feeTransferSuccess,) = feeReceipient.call{value : feeAmount}("");
        require(feeTransferSuccess, "FantomMarketplace: Fee transfer failed");
        (bool ownerTransferSuccess,) = _owner.call{value : msg.value.sub(feeAmount)}("");
        require(ownerTransferSuccess, "FantomMarketplace: Owner transfer failed");

        // Transfer NFT to buyer
        if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721)) {
            IERC721(_nftAddress).safeTransferFrom(_owner, _msgSender(), _tokenId);
        } else {
            IERC1155(_nftAddress).safeTransferFrom(_owner, _msgSender(), _tokenId, listedItem.quantity, bytes(""));
        }
        marketplace.validateItemSold(_nftAddress, _tokenId);
        auction.validateCancelAuction(_nftAddress, _tokenId);
        emit ItemSold(_owner, _msgSender(), _nftAddress, _tokenId, listedItem.quantity, msg.value.div(listedItem.quantity));
        delete(listings[_nftAddress][_tokenId][_owner]);
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
    ) external {
        require(
            IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721) ||
            IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC1155), 
            "Invalid NFT address."
        );
        require(_deadline > _getNow(), "Invalid expiration");

        _approveHelper(_payToken, address(this), uint256(~0));
        auction.validateCancelAuction(_nftAddress, _tokenId);

        offers[_nftAddress][_tokenId][_msgSender()] = Offer(
            _payToken,
            _quantity,
            _pricePerItem,
            _deadline
        );

        emit OfferCreated(_msgSender(), _nftAddress, _tokenId, address(_payToken), _quantity, _pricePerItem, _deadline);
    }

    /// @notice Method for canceling the offer
    /// @param _nftAddress NFT contract address
    /// @param _tokenId TokenId
    function cancelOffer(
        address _nftAddress,
        uint256 _tokenId
    ) external {
        delete(offers[_nftAddress][_tokenId][_msgSender()]);
        emit OfferCanceled(_msgSender(), _nftAddress, _tokenId);
    }

    /// @notice Method for accepting the offer
    function acceptOffer(
        address _nftAddress,
        uint256 _tokenId,
        address _creator
    ) external nonReentrant {
        Offer memory offer = offers[_nftAddress][_tokenId][_creator];
        if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721)) {
            IERC721 nft = IERC721(_nftAddress);
            require(nft.ownerOf(_tokenId) == _msgSender(), "Not owning the item.");
        }
        else if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC1155)) {
            IERC1155 nft = IERC1155(_nftAddress);
            require(nft.balanceOf(_msgSender(), _tokenId) >= offer.quantity, "Not owning the item.");
        }
        else {
            revert("Invalid NFT address.");
        }
        require(offer.pricePerItem > 0 && offer.quantity > 0, "Offer doesn't exist.");

        uint256 price = offer.pricePerItem.mul(offer.quantity);
        uint256 feeAmount = price.mul(platformFee).div(1e3);

        offer.payToken.safeTransferFrom(_creator, feeReceipient, feeAmount);
        offer.payToken.safeTransferFrom(_creator, _msgSender(), price.sub(feeAmount));

        // Transfer NFT to buyer
        if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721)) {
            IERC721(_nftAddress).safeTransferFrom(_msgSender(), _creator, _tokenId);
        } else {
            IERC1155(_nftAddress).safeTransferFrom(_msgSender(), _creator, _tokenId, offer.quantity, bytes(""));
        }
        marketplace.validateItemSold(_nftAddress, _tokenId);
        auction.validateCancelAuction(_nftAddress, _tokenId);
        delete(listings[_nftAddress][_tokenId][_msgSender()]);
        delete(offers[_nftAddress][_tokenId][_creator]);

        emit ItemSold(_msgSender(), _creator, _nftAddress, _tokenId, offer.quantity, offer.pricePerItem);
        emit OfferCanceled(_creator, _nftAddress, _tokenId);
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
     @notice Update auction contract
     @dev Only admin
     */
    function updateAuction(address _auction) external onlyOwner {
        auction = IFantomAuction(_auction);
    }

    /**
     @notice Update auction contract
     @dev Only admin
     */
    function updateBundleMarketplace(address _marketplace) external onlyOwner {
        marketplace = IFantomBundleMarketplace(_marketplace);
    }


    /**
     @notice Method for updating platform fee address
     @dev Only admin
     @param _platformFeeRecipient payable address the address to sends the funds to
     */
    function updatePlatformFeeRecipient(address payable _platformFeeRecipient) external onlyOwner {
        feeReceipient = _platformFeeRecipient;
        emit UpdatePlatformFeeRecipient(_platformFeeRecipient);
    }

    /**
    * @notice Validate and cancel listing
    * @dev Only auction can access
    */
    function validateCancelListing(address _nftAddress, uint256 _tokenId, address _owner) external onlyAuction {
        Listing memory item = listings[_nftAddress][_tokenId][_owner];
        if (item.quantity > 0) {
            _cancelListing(_nftAddress, _tokenId, _owner);
        }
    }

    /**
    * @notice Validate and cancel listing
    * @dev Only auction can access
    */
    function validateItemSold(address _nftAddress, uint256 _tokenId, address _seller, address _buyer) external onlyMarketplace {
        Listing memory item = listings[_nftAddress][_tokenId][_seller];
        if (item.quantity > 0) {
            _cancelListing(_nftAddress, _tokenId, _seller);
        }
        delete(offers[_nftAddress][_tokenId][_buyer]);
        emit OfferCanceled(_buyer, _nftAddress, _tokenId);
    }

    ////////////////////////////
    /// Internal and Private ///
    ////////////////////////////

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }

    /// @dev Reset approval and approve exact amount
    function _approveHelper(
        IERC20 token,
        address recipient,
        uint256 amount
    ) internal {
        token.safeApprove(recipient, 0);
        token.safeApprove(recipient, amount);
    }

    function _cancelListing(address _nftAddress, uint256 _tokenId, address _owner) private {
        Listing memory listedItem = listings[_nftAddress][_tokenId][_owner];
        if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721)) {
            IERC721 nft = IERC721(_nftAddress);
            require(nft.ownerOf(_tokenId) == _owner, "Not owning the item.");
        }
        else if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC1155)) {
            IERC1155 nft = IERC1155(_nftAddress);
            require(nft.balanceOf(_msgSender(), _tokenId) >= listedItem.quantity, "Not owning the item.");
        }
        else {
            revert("Invalid NFT address.");
        }

        delete(listings[_nftAddress][_tokenId][_owner]);
        emit ItemCanceled(_owner, _nftAddress, _tokenId);
    }
}