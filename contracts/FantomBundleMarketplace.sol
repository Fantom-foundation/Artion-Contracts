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
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

interface IFantomAuction {
    function validateCancelAuction(address, uint256) external;
}

interface IFantomMarketplace {
    function validateItemSold(address, uint256, address, address) external;
}

contract FantomBundleMarketplace is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using Address for address payable;
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    /// @notice Events for the contract
    event ItemListed(
        address indexed owner,
        string indexed bundleID,
        address[] nft,
        uint256[] tokenId,
        uint256[] quantity,
        uint256 price,
        uint256 startingTime,
        bool isPrivate,
        address allowedAddress
    );
    event ItemSold(
        address indexed seller,
        address indexed buyer,
        string indexed bundleID,
        uint256 price
    );
    event ItemUpdated(
        address indexed owner,
        string indexed bundleID,
        uint256 newPrice
    );
    event ItemCanceled(
        address indexed owner,
        string bundleID
    );
    event OfferCreated(
        address indexed creator,
        string indexed bundleID,
        address payToken,
        uint256 price,
        uint256 deadline
    );
    event OfferCanceled(
        address indexed creator,
        string indexed bundleID
    );
    event UpdatePlatformFee(
        uint256 platformFee
    );
    event UpdatePlatformFeeRecipient(
        address payable platformFeeRecipient
    );

    /// @notice Structure for Bundle Item Listing
    struct Listing {
        address[] nfts;
        uint256[] tokenIds;
        uint256[] quantities;
        uint256 price;
        uint256 startingTime;
        address allowedAddress;
    }

    /// @notice Structure for bundle offer
    struct Offer {
        IERC20 payToken;
        uint256 price;
        uint256 deadline;
    }

    bytes4 private constant INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 private constant INTERFACE_ID_ERC1155 = 0xd9b67a26;

    /// @notice Owner -> Bundle ID -> Bundle Listing item
    mapping(address => mapping(bytes32 => Listing)) public listings;

    /// @notice Bundle ID -> Wwner
    mapping(bytes32 => address) public owners;

    mapping(address => mapping(uint256 => EnumerableSet.Bytes32Set)) bundleIdsPerItem;

    mapping(bytes32 => mapping(address => mapping(uint256 => uint256))) nftIndexes;

    mapping(bytes32 => string) bundleIds;

    /// @notice Bundle ID -> Offerer -> Offer
    mapping(bytes32 => mapping(address => Offer)) public offers;

    /// @notice Platform fee
    uint256 public platformFee;

    /// @notice Platform fee receipient
    address payable public feeReceipient;

    /// @notice FantomAuction contract
    IFantomAuction public auction;

    /// @notice FantomMarketplace contract for single items
    IFantomMarketplace public marketplace;

    modifier onlyAuction() {
        require(address(auction) == _msgSender(), "Sender must be auction");
        _;
    }

    modifier onlyContract() {
        require(address(auction) == _msgSender() || address(marketplace) == _msgSender(), "Sender must be auction");
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

    /// @notice Method for get NFT bundle listing
    /// @param _owner Owner address
    /// @param _bundleID Bundle ID
    function getListing(address _owner, string memory _bundleID) external view returns (
        address[] memory nfts,
        uint256[] memory tokenIds,
        uint256[] memory quantities,
        uint256 price,
        uint256 startingTime,
        address allowedAddress
    ) {
        bytes32 bundleID = _getBundleID(_bundleID);
        nfts = listings[_owner][bundleID].nfts;
        tokenIds = listings[_owner][bundleID].tokenIds;
        quantities = listings[_owner][bundleID].quantities;
        price = listings[_owner][bundleID].price;
        startingTime = listings[_owner][bundleID].startingTime;
        allowedAddress = listings[_owner][bundleID].allowedAddress;
    }

    /// @notice Method for listing NFT bundle
    /// @param _bundleID Bundle ID
    /// @param _nftAddresses Addresses of NFT contract
    /// @param _tokenIds Token IDs of NFT
    /// @param _quantities token amounts to list (needed for ERC-1155 NFTs, set as 1 for ERC-721)
    /// @param _price sale price for bundle
    /// @param _startingTime scheduling for a future sale
    /// @param _allowedAddress optional param for private sale
    function listItem(
        string memory _bundleID,
        address[] calldata _nftAddresses,
        uint256[] calldata _tokenIds,
        uint256[] calldata _quantities,
        uint256 _price,
        uint256 _startingTime,
        address _allowedAddress
    ) external {
        bytes32 bundleID = _getBundleID(_bundleID);
        bundleIds[bundleID] = _bundleID;
        require(_nftAddresses.length == _tokenIds.length && _tokenIds.length == _quantities.length, "Arrays must have same length.");
        require(
            owners[bundleID] == address(0) || (owners[bundleID] == _msgSender() && listings[_msgSender()][bundleID].price == 0),
            "Bundle is already listed."
        );

        Listing storage listing = listings[_msgSender()][bundleID];
        for (uint256 i; i < _nftAddresses.length; i++) {
            if (IERC165(_nftAddresses[i]).supportsInterface(INTERFACE_ID_ERC721)) {
                IERC721 nft = IERC721(_nftAddresses[i]);
                require(nft.ownerOf(_tokenIds[i]) == _msgSender(), "Must be owner of NFT.");
                require(nft.isApprovedForAll(_msgSender(), address(this)), "Must be approved before list.");
            }
            else if (IERC165(_nftAddresses[i]).supportsInterface(INTERFACE_ID_ERC1155)) {
                IERC1155 nft = IERC1155(_nftAddresses[i]);
                require(nft.balanceOf(_msgSender(), _tokenIds[i]) >= _quantities[i], "Must hold enough NFTs.");
                require(nft.isApprovedForAll(_msgSender(), address(this)), "Must be approved before list.");
            }
            else {
                revert("Invalid NFT address.");
            }
            listing.nfts.push(_nftAddresses[i]);
            listing.tokenIds.push(_tokenIds[i]);
            listing.quantities.push(_quantities[i]);
            bundleIdsPerItem[_nftAddresses[i]][_tokenIds[i]].add(bundleID);
            nftIndexes[bundleID][_nftAddresses[i]][_tokenIds[i]] = i;
        }

        listing.price = _price;
        listing.startingTime = _startingTime;
        listing.allowedAddress = _allowedAddress;

        owners[bundleID] = _msgSender();

        emit ItemListed(
            _msgSender(),
            _bundleID,
            _nftAddresses,
            _tokenIds,
            _quantities,
            _price,
            _startingTime,
            _allowedAddress == address(0x0),
            _allowedAddress
        );
    }

    /// @notice Method for canceling listed NFT bundle
    function cancelListing(
        string memory _bundleID
    ) external nonReentrant {
        bytes32 bundleID = _getBundleID(_bundleID);
        require(listings[_msgSender()][bundleID].price > 0, "Not listed bundle.");
        _cancelListing(_msgSender(), _bundleID);
    }

    /// @notice Method for updating listed NFT bundle
    /// @param _bundleID Bundle ID
    /// @param _newPrice New sale price for bundle
    function updateListing(
        string memory _bundleID,
        uint256 _newPrice
    ) external nonReentrant {
        bytes32 bundleID = _getBundleID(_bundleID);
        Listing storage listing = listings[_msgSender()][bundleID];
        require(listing.price > 0, "Not listed bundle.");

        listing.price = _newPrice;
        emit ItemUpdated(_msgSender(), _bundleID, _newPrice);
    }

    /// @notice Method for buying listed NFT bundle
    /// @param _bundleID Bundle ID
    function buyItem(
        string memory _bundleID
    ) external payable nonReentrant {
        bytes32 bundleID = _getBundleID(_bundleID);
        address owner = owners[bundleID];
        require(owner != address(0), "Invalid Bundle ID.");

        Listing storage listing = listings[owner][bundleID];
        require(listing.price > 0, "Not listed bundle.");
        for (uint256 i; i < listing.nfts.length; i++) {
            if (IERC165(listing.nfts[i]).supportsInterface(INTERFACE_ID_ERC721)) {
                IERC721 nft = IERC721(listing.nfts[i]);
                require(nft.ownerOf(listing.tokenIds[i]) == owner, "Not owning the item.");
            }
            else if (IERC165(listing.nfts[i]).supportsInterface(INTERFACE_ID_ERC1155)) {
                IERC1155 nft = IERC1155(listing.nfts[i]);
                require(nft.balanceOf(owner, listing.tokenIds[i]) >= listing.quantities[i], "Not owning the item.");
            }
        }
        require(_getNow() >= listing.startingTime, "Bundle is not buyable yet.");
        require(msg.value >= listing.price, "Not enough amount to buy item.");
        if (listing.allowedAddress != address(0)) {
            require(listing.allowedAddress == _msgSender(), "You are not eligable to buy item.");
        }

        uint256 feeAmount = msg.value.mul(platformFee).div(1e3);
        (bool feeTransferSuccess,) = feeReceipient.call{value : feeAmount}("");
        require(feeTransferSuccess, "FantomMarketplace: Fee transfer failed");
        (bool ownerTransferSuccess,) = owner.call{value : msg.value.sub(feeAmount)}("");
        require(ownerTransferSuccess, "FantomMarketplace: Owner transfer failed");

        // Transfer NFT to buyer
        for (uint256 i; i < listing.nfts.length; i++) {
            if (IERC165(listing.nfts[i]).supportsInterface(INTERFACE_ID_ERC721)) {
                IERC721(listing.nfts[i]).safeTransferFrom(owner, _msgSender(), listing.tokenIds[i]);
            } else {
                IERC1155(listing.nfts[i]).safeTransferFrom(owner, _msgSender(), listing.tokenIds[i], listing.quantities[i], bytes(""));
            }
            marketplace.validateItemSold(listing.nfts[i], listing.tokenIds[i], owner, _msgSender());
            auction.validateCancelAuction(listing.nfts[i], listing.tokenIds[i]);
        }
        delete(listings[owner][bundleID]);
        delete listing.price;
        listings[_msgSender()][bundleID] = listing;
        owners[bundleID] = _msgSender();
        delete(offers[bundleID][_msgSender()]);

        emit ItemSold(owner, _msgSender(), _bundleID, msg.value);
        emit OfferCanceled(_msgSender(), _bundleID);
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
        require(owners[bundleID] != address(0), "Invalid Bundle ID.");
        require(_deadline > _getNow(), "Invalid expiration");

        _approveHelper(_payToken, address(this), uint256(~0));
        Listing storage listing = listings[owners[bundleID]][bundleID];
        for (uint256 i; i < listing.nfts.length; i++) {
            auction.validateCancelAuction(listing.nfts[i], listing.tokenIds[i]);
        }

        offers[bundleID][_msgSender()] = Offer(
            _payToken,
            _price,
            _deadline
        );

        emit OfferCreated(_msgSender(), _bundleID, address(_payToken), _price, _deadline);
    }

    /// @notice Method for canceling the offer
    /// @param _bundleID Bundle ID
    function cancelOffer(
        string memory _bundleID
    ) external {
        bytes32 bundleID = _getBundleID(_bundleID);
        delete(offers[bundleID][_msgSender()]);
        emit OfferCanceled(_msgSender(), _bundleID);
    }

    /// @notice Method for accepting the offer
    function acceptOffer(
        string memory _bundleID,
        address _creator
    ) external nonReentrant {
        bytes32 bundleID = _getBundleID(_bundleID);
        require(owners[bundleID] == _msgSender(), "Not owning the bundle.");

        Offer memory offer = offers[bundleID][_creator];
        require(offer.price > 0, "Offer doesn't exist.");

        uint256 price = offer.price;
        uint256 feeAmount = price.mul(platformFee).div(1e3);

        offer.payToken.safeTransferFrom(_creator, feeReceipient, feeAmount);
        offer.payToken.safeTransferFrom(_creator, _msgSender(), price.sub(feeAmount));

        // Transfer NFT to buyer
        Listing memory listing = listings[_msgSender()][bundleID];
        for (uint256 i; i < listing.nfts.length; i++) {
            if (IERC165(listing.nfts[i]).supportsInterface(INTERFACE_ID_ERC721)) {
                IERC721(listing.nfts[i]).safeTransferFrom(_msgSender(), _creator, listing.tokenIds[i]);
            } else {
                IERC1155(listing.nfts[i]).safeTransferFrom(_msgSender(), _creator, listing.tokenIds[i], listing.quantities[i], bytes(""));
            }
            marketplace.validateItemSold(listing.nfts[i], listing.tokenIds[i], owners[bundleID], _creator);
            auction.validateCancelAuction(listing.nfts[i], listing.tokenIds[i]);
        }
        delete(listings[_msgSender()][bundleID]);
        listing.price = 0;
        listings[_creator][bundleID] = listing;
        owners[bundleID] = _creator;
        delete(offers[bundleID][_creator]);

        emit ItemSold(_msgSender(), _creator, _bundleID, offer.price);
        emit OfferCanceled(_creator, _bundleID);
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
    function updateMarketplace(address _marketplace) external onlyOwner {
        marketplace = IFantomMarketplace(_marketplace);
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
    function validateItemSold(address _nftAddress, uint256 _tokenId) external onlyContract {
        uint256 length = bundleIdsPerItem[_nftAddress][_tokenId].length();
        for (uint256 i; i < length; i++) {
            bytes32 bundleID = bundleIdsPerItem[_nftAddress][_tokenId].at(i);
            address _owner = owners[bundleID];
            if (_owner != address(0)) {
                Listing storage listing = listings[_owner][bundleID];
                if (listing.price != 0) {
                    uint256 index = nftIndexes[bundleID][_nftAddress][_tokenId];
                    delete(nftIndexes[bundleID][_nftAddress][_tokenId]);
                    if (listing.nfts.length == 1) {
                        // delete bundle
                        delete(listings[_owner][bundleID]);
                        delete(owners[bundleID]);
                        string memory _bundleId = bundleIds[bundleID];
                        delete(bundleIds[bundleID]);
                        emit ItemCanceled(_owner, _bundleId);
                    } else {
                        if (index < listing.nfts.length - 1) {
                            listing.nfts[index] = listing.nfts[listing.nfts.length - 1];
                            listing.tokenIds[index] = listing.tokenIds[listing.tokenIds.length - 1];
                            listing.quantities[index] = listing.quantities[listing.quantities.length - 1];
                            nftIndexes[bundleID][listing.nfts[index]][listing.tokenIds[index]] = index;
                        }
                        delete(listing.nfts[listing.nfts.length - 1]);
                        delete(listing.tokenIds[listing.tokenIds.length - 1]);
                        delete(listing.quantities[listing.quantities.length - 1]);
                    }
                }
            }
        }

        delete(bundleIdsPerItem[_nftAddress][_tokenId]);
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

    function _cancelListing(address _owner, string memory _bundleID) private {
        bytes32 bundleID = _getBundleID(_bundleID);
        Listing memory listing = listings[_owner][bundleID];
        for (uint256 i; i < listing.nfts.length; i++) {
            bundleIdsPerItem[listing.nfts[i]][listing.tokenIds[i]].remove(bundleID);
            delete(nftIndexes[bundleID][listing.nfts[i]][listing.tokenIds[i]]);
        }
        delete(listings[_owner][bundleID]);
        delete(owners[bundleID]);
        delete(bundleIds[bundleID]);
        emit ItemCanceled(_owner, _bundleID);
    }

    function _getBundleID(string memory _bundleID) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(_bundleID));
    }
}
