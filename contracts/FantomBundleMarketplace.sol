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

interface IFantomAddressRegistry {
    function auction() external view returns (address);

    function marketplace() external view returns (address);

    function tokenRegistry() external view returns (address);
}

interface IFantomMarketplace {
    function validateItemSold(
        address,
        uint256,
        address,
        address
    ) external;

    function getPrice(address) external view returns (int256);
}

interface IFantomTokenRegistry {
    function enabled(address) external returns (bool);
}

contract FantomBundleMarketplace is
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeMath for uint256;
    using AddressUpgradeable for address payable;
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    /// @notice Events for the contract
    event ItemListed(
        address indexed owner,
        string bundleID,
        address payToken,
        uint256 price,
        uint256 startingTime
    );
    event ItemSold(
        address indexed seller,
        address indexed buyer,
        string bundleID,
        address payToken,
        int256 unitPrice,
        uint256 price
    );
    event ItemUpdated(
        address indexed owner,
        string bundleID,
        address[] nft,
        uint256[] tokenId,
        uint256[] quantity,
        address payToken,
        uint256 newPrice
    );
    event ItemCanceled(address indexed owner, string bundleID);
    event OfferCreated(
        address indexed creator,
        string bundleID,
        address payToken,
        uint256 price,
        uint256 deadline
    );
    event OfferCanceled(address indexed creator, string bundleID);
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

    /// @notice Address registry
    IFantomAddressRegistry public addressRegistry;

    modifier onlyContract() {
        require(
            addressRegistry.auction() == _msgSender() ||
                addressRegistry.marketplace() == _msgSender(),
            "sender must be auction or marketplace"
        );
        _;
    }

    /// @notice Contract initializer
    function initialize(address payable _feeRecipient, uint256 _platformFee)
        public
        initializer
    {
        platformFee = _platformFee;
        feeReceipient = _feeRecipient;

        __Ownable_init();
        __ReentrancyGuard_init();
    }

    /// @notice Method for get NFT bundle listing
    /// @param _owner Owner address
    /// @param _bundleID Bundle ID
    function getListing(address _owner, string memory _bundleID)
        external
        view
        returns (
            address[] memory nfts,
            uint256[] memory tokenIds,
            uint256[] memory quantities,
            uint256 price,
            uint256 startingTime
        )
    {
        bytes32 bundleID = _getBundleID(_bundleID);
        nfts = listings[_owner][bundleID].nfts;
        tokenIds = listings[_owner][bundleID].tokenIds;
        quantities = listings[_owner][bundleID].quantities;
        price = listings[_owner][bundleID].price;
        startingTime = listings[_owner][bundleID].startingTime;
    }

    /// @notice Method for listing NFT bundle
    /// @param _bundleID Bundle ID
    /// @param _nftAddresses Addresses of NFT contract
    /// @param _tokenIds Token IDs of NFT
    /// @param _quantities token amounts to list (needed for ERC-1155 NFTs, set as 1 for ERC-721)
    /// @param _price sale price for bundle
    /// @param _startingTime scheduling for a future sale
    function listItem(
        string memory _bundleID,
        address[] calldata _nftAddresses,
        uint256[] calldata _tokenIds,
        uint256[] calldata _quantities,
        address _payToken,
        uint256 _price,
        uint256 _startingTime
    ) external {
        bytes32 bundleID = _getBundleID(_bundleID);
        bundleIds[bundleID] = _bundleID;
        require(
            _nftAddresses.length == _tokenIds.length &&
                _tokenIds.length == _quantities.length,
            "invalid data"
        );
        require(
            owners[bundleID] == address(0) ||
                (owners[bundleID] == _msgSender() &&
                    listings[_msgSender()][bundleID].price == 0),
            "already listed"
        );

        address tokenRegistry = addressRegistry.tokenRegistry();
        require(
            _payToken == address(0) ||
                (tokenRegistry != address(0) &&
                    IFantomTokenRegistry(tokenRegistry).enabled(_payToken)),
            "invalid pay token"
        );

        Listing storage listing = listings[_msgSender()][bundleID];
        delete listing.nfts;
        delete listing.tokenIds;
        delete listing.quantities;
        for (uint256 i; i < _nftAddresses.length; i++) {
            if (_supportsInterface(_nftAddresses[i], INTERFACE_ID_ERC721)) {
                IERC721 nft = IERC721(_nftAddresses[i]);
                _check721Owning(_nftAddresses[i], _tokenIds[i], _msgSender());
                require(
                    nft.isApprovedForAll(_msgSender(), address(this)),
                    "item not approved"
                );

                listing.quantities.push(uint256(1));
            } else if (
                _supportsInterface(_nftAddresses[i], INTERFACE_ID_ERC1155)
            ) {
                IERC1155 nft = IERC1155(_nftAddresses[i]);
                _check1155Owning(
                    _nftAddresses[i],
                    _tokenIds[i],
                    _quantities[i],
                    _msgSender()
                );
                require(
                    nft.isApprovedForAll(_msgSender(), address(this)),
                    "item not approved"
                );

                listing.quantities.push(_quantities[i]);
            } else {
                revert("invalid nft address");
            }
            address _nft = _nftAddresses[i];
            listing.nfts.push(_nft);
            listing.tokenIds.push(_tokenIds[i]);
            bundleIdsPerItem[_nft][_tokenIds[i]].add(bundleID);
            nftIndexes[bundleID][_nft][_tokenIds[i]] = i;
        }

        listing.payToken = _payToken;
        listing.price = _price;
        listing.startingTime = _startingTime;

        owners[bundleID] = _msgSender();

        emit ItemListed(
            _msgSender(),
            _bundleID,
            _payToken,
            _price,
            _startingTime
        );
    }

    /// @notice Method for canceling listed NFT bundle
    function cancelListing(string memory _bundleID) external nonReentrant {
        bytes32 bundleID = _getBundleID(_bundleID);
        require(listings[_msgSender()][bundleID].price > 0, "not listed");
        _cancelListing(_msgSender(), _bundleID);
    }

    /// @notice Method for updating listed NFT bundle
    /// @param _bundleID Bundle ID
    /// @param _newPrice New sale price for bundle
    function updateListing(
        string memory _bundleID,
        address _payToken,
        uint256 _newPrice
    ) external nonReentrant {
        bytes32 bundleID = _getBundleID(_bundleID);
        Listing storage listing = listings[_msgSender()][bundleID];
        require(listing.price > 0, "not listed");

        address tokenRegistry = addressRegistry.tokenRegistry();
        require(
            _payToken == address(0) ||
                (tokenRegistry != address(0) &&
                    IFantomTokenRegistry(tokenRegistry).enabled(_payToken)),
            "invalid pay token"
        );

        listing.payToken = _payToken;
        listing.price = _newPrice;
        emit ItemUpdated(
            _msgSender(),
            _bundleID,
            listing.nfts,
            listing.tokenIds,
            listing.quantities,
            _payToken,
            _newPrice
        );
    }

    /// @notice Method for buying listed NFT bundle
    /// @param _bundleID Bundle ID
    /* function buyItem(string memory _bundleID) external payable nonReentrant {
        bytes32 bundleID = _getBundleID(_bundleID);
        address owner = owners[bundleID];
        require(owner != address(0), "invalid id");

        Listing memory listing = listings[owner][bundleID];
        require(listing.payToken == address(0), "invalid pay token");
        require(msg.value >= listing.price, "insufficient balance to buy");

        _buyItem(_bundleID, address(0));
    } */

    /// @notice Method for buying listed NFT bundle
    /// @param _bundleID Bundle ID
    function buyItem(string memory _bundleID, address _payToken)
        external
        nonReentrant
    {
        bytes32 bundleID = _getBundleID(_bundleID);
        address owner = owners[bundleID];
        require(owner != address(0), "invalid id");

        Listing memory listing = listings[owner][bundleID];
        require(listing.payToken == _payToken, "invalid pay token");

        _buyItem(_bundleID, _payToken);
    }

    function _buyItem(string memory _bundleID, address _payToken) private {
        bytes32 bundleID = _getBundleID(_bundleID);
        address owner = owners[bundleID];
        Listing memory listing = listings[owner][bundleID];

        require(listing.price > 0, "not listed");
        for (uint256 i; i < listing.nfts.length; i++) {
            if (_supportsInterface(listing.nfts[i], INTERFACE_ID_ERC721)) {
                _check721Owning(listing.nfts[i], listing.tokenIds[i], owner);
            } else if (
                _supportsInterface(listing.nfts[i], INTERFACE_ID_ERC1155)
            ) {
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
            IFantomMarketplace(addressRegistry.marketplace()).validateItemSold(
                listing.nfts[i],
                listing.tokenIds[i],
                owner,
                _msgSender()
            );
        }
        delete (listings[owner][bundleID]);
        listing.price = 0;
        listings[_msgSender()][bundleID] = listing;
        owners[bundleID] = _msgSender();
        delete (offers[bundleID][_msgSender()]);

        emit ItemSold(
            owner,
            _msgSender(),
            _bundleID,
            _payToken,
            IFantomMarketplace(addressRegistry.marketplace()).getPrice(_payToken),
            price
        );
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
        require(owners[bundleID] != address(0), "invalid id");
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
        require(owners[bundleID] == _msgSender(), "not owning item");

        Offer memory offer = offers[bundleID][_creator];
        require(offer.deadline > _getNow(), "offer not exists or expired");

        uint256 price = offer.price;
        uint256 feeAmount = price.mul(platformFee).div(1e3);

        offer.payToken.safeTransferFrom(_creator, feeReceipient, feeAmount);
        offer.payToken.safeTransferFrom(
            _creator,
            _msgSender(),
            price.sub(feeAmount)
        );

        // Transfer NFT to buyer
        Listing memory listing = listings[_msgSender()][bundleID];
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
            IFantomMarketplace(addressRegistry.marketplace()).validateItemSold(
                listing.nfts[i],
                listing.tokenIds[i],
                owners[bundleID],
                _creator
            );
        }
        delete (listings[_msgSender()][bundleID]);
        listing.price = 0;
        listings[_creator][bundleID] = listing;
        owners[bundleID] = _creator;
        delete (offers[bundleID][_creator]);

        emit ItemSold(
            _msgSender(),
            _creator,
            _bundleID,
            address(offer.payToken),
            IFantomMarketplace(addressRegistry.marketplace()).getPrice(address(offer.payToken)),
            offer.price
        );
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

    /**
     * @notice Validate and cancel listing
     * @dev Only marketplace can access
     */
    function validateItemSold(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _quantity
    ) external onlyContract {
        uint256 length = bundleIdsPerItem[_nftAddress][_tokenId].length();
        for (uint256 i; i < length; i++) {
            bytes32 bundleID = bundleIdsPerItem[_nftAddress][_tokenId].at(i);
            address _owner = owners[bundleID];
            if (_owner != address(0)) {
                Listing storage listing = listings[_owner][bundleID];
                string memory _bundleID = bundleIds[bundleID];
                uint256 index = nftIndexes[bundleID][_nftAddress][_tokenId];
                if (listing.quantities[index] > _quantity) {
                    listing.quantities[index] = listing.quantities[index].sub(
                        _quantity
                    );
                } else {
                    delete (nftIndexes[bundleID][_nftAddress][_tokenId]);
                    if (listing.nfts.length == 1) {
                        delete (listings[_owner][bundleID]);
                        delete (owners[bundleID]);
                        delete (bundleIds[bundleID]);
                        emit ItemUpdated(
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
                            listing.nfts[index] = listing.nfts[
                                listing.nfts.length - 1
                            ];
                            listing.tokenIds[index] = listing.tokenIds[
                                listing.tokenIds.length - 1
                            ];
                            listing.quantities[index] = listing.quantities[
                                listing.quantities.length - 1
                            ];
                            nftIndexes[bundleID][listing.nfts[index]][
                                listing.tokenIds[index]
                            ] = index;
                        }
                        listing.nfts.pop();
                        listing.tokenIds.pop();
                        listing.quantities.pop();
                    }
                }

                emit ItemUpdated(
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

        delete (bundleIdsPerItem[_nftAddress][_tokenId]);
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

    function _cancelListing(address _owner, string memory _bundleID) private {
        bytes32 bundleID = _getBundleID(_bundleID);
        Listing memory listing = listings[_owner][bundleID];
        for (uint256 i; i < listing.nfts.length; i++) {
            bundleIdsPerItem[listing.nfts[i]][listing.tokenIds[i]].remove(
                bundleID
            );
            delete (nftIndexes[bundleID][listing.nfts[i]][listing.tokenIds[i]]);
        }
        delete (listings[_owner][bundleID]);
        delete (owners[bundleID]);
        delete (bundleIds[bundleID]);
        emit ItemCanceled(_owner, _bundleID);
    }

    function _getBundleID(string memory _bundleID)
        private
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(_bundleID));
    }
}
