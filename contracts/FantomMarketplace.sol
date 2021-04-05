// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract FantomMarketplace is Context, ReentrancyGuard {
    using SafeMath for uint256;
    using Address for address;

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

    /// @notice Structure for listed items
    struct Listing {
        address payable owner;
        uint256 quantity;
        uint256 pricePerItem;
        uint256 startingTime;
        address allowedAddress;
    }

    bytes4 private constant INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 private constant INTERFACE_ID_ERC1155 = 0xd9b67a26;

    /// @notice NftAdress -> Token ID -> Listing item
    mapping(address => mapping(uint256 => Listing)) public listings;

    /// @notice Platform fee
    uint256 public platformFee;

    /// @notice Platform fee receipient
    address payable public feeReceipient;

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
        IERC721 nft = IERC721(_nftAddress);
        require(_nftAddress.isContract(), "Invalid NFT address.");
        require(nft.ownerOf(_tokenId) == _msgSender(), "Must be owner of NFT.");
        require(nft.isApprovedForAll(_msgSender(), address(this)), "Must be approved before list.");

        listings[_nftAddress][_tokenId] = Listing(
            _msgSender(),
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
        Listing memory listedItem = listings[_nftAddress][_tokenId];
        IERC721 nft = IERC721(_nftAddress);
        require(
            (listedItem.owner == _msgSender()) && (nft.ownerOf(_tokenId) == listedItem.owner),
            "Not listed Item or not owning the item."
        );

        delete(listings[_nftAddress][_tokenId]);
        emit ItemCanceled(listedItem.owner, _nftAddress, _tokenId);
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
        Listing storage listedItem = listings[_nftAddress][_tokenId];
        IERC721 nft = IERC721(_nftAddress);
        require(
            (listedItem.owner == _msgSender()) && (nft.ownerOf(_tokenId) == listedItem.owner),
            "Not listed Item or not owning the item."
        );

        listedItem.pricePerItem = _newPrice;
        emit ItemUpdated(_msgSender(), _nftAddress, _tokenId, _newPrice);
    }

    /// @notice Method for buying listed NFT
    /// @param _nftAddress NFT contract address
    /// @param _tokenId TokenId
    function buyItem(
        address _nftAddress,
        uint256 _tokenId
    ) external payable nonReentrant {
        Listing memory listedItem = listings[_nftAddress][_tokenId];
        IERC721 nft = IERC721(_nftAddress);
        require(nft.ownerOf(_tokenId) == listedItem.owner, "Seller doesn't own the item.");
        require(_getNow() >= listedItem.startingTime, "Item is not buyable yet.");
        require(msg.value >= listedItem.pricePerItem.mul(listedItem.quantity), "Not enough amount to buy item.");
        if (listedItem.allowedAddress != address(0)) {
            require(listedItem.allowedAddress == _msgSender(), "You are not eligable to buy item.");
        }

        uint256 feeAmount = msg.value.mul(platformFee).div(1e3);
        feeReceipient.transfer(feeAmount);
        listedItem.owner.transfer(msg.value.sub(feeAmount));

        // Transfer NFT to buyer
        nft.safeTransferFrom(listedItem.owner, _msgSender(), _tokenId);
        delete(listings[_nftAddress][_tokenId]);

        emit ItemSold(listedItem.owner, _msgSender(), _nftAddress, _tokenId, msg.value);
    }

    
    ////////////////////////////
    /// Internal and Private ///
    ////////////////////////////

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }
}
