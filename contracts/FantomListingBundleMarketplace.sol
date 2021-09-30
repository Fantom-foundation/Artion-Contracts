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
import "./interface/IFantomTokenRegistry.sol";
import "./interface/IFantomBundleMarketplace.sol";

contract FantomListingBundleMarketplace is
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
    mapping(address => mapping(bytes32 => Listing)) public listings;

    /// @notice Address registry
    IFantomAddressRegistry public addressRegistry;

    /// @notice FantomBundleMarketplace Address
    address public fantomBundleMarketplaceAddress;

    /// @notice FantomBundleMarketplace
    IFantomBundleMarketplace public fantomBundleMarketplace;


    modifier onlyFantomBundleMarketplace() {
        require(_msgSender() == fantomBundleMarketplaceAddress, "sender is not allowed");
        _;
    }

    /// @notice Contract initializer
    function initialize(address _fantomBundleMarketplaceAddress)
        public
        initializer
    {
        fantomBundleMarketplaceAddress = _fantomBundleMarketplaceAddress;
        fantomBundleMarketplace = IFantomBundleMarketplace(_fantomBundleMarketplaceAddress);

        __Ownable_init();
        __ReentrancyGuard_init();
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
        // replace some places a function call from FantomBundleMarketplace
        //bundleIds[bundleID] = _bundleID;
        fantomBundleMarketplace.setBundleId(bundleID, _bundleID);
        require(
            _nftAddresses.length == _tokenIds.length &&
                _tokenIds.length == _quantities.length,
            "invalid data"
        );
        // replace with a function call and a local variable        
        //require(
            //owners[bundleID] == address(0) ||
            //    (owners[bundleID] == _msgSender() &&
        address owner = fantomBundleMarketplace.owners(bundleID);
            require(
                owner == address(0) ||
                (owner == _msgSender() &&
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
                    //nft.isApprovedForAll(_msgSender(), address(this)),
                    nft.isApprovedForAll(_msgSender(), fantomBundleMarketplaceAddress),
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
                    //nft.isApprovedForAll(_msgSender(), address(this)),
                    nft.isApprovedForAll(_msgSender(), fantomBundleMarketplaceAddress),
                    "item not approved"
                );

                listing.quantities.push(_quantities[i]);
            } else {
                revert("invalid nft address");
            }
            address _nft = _nftAddresses[i];
            listing.nfts.push(_nft);
            listing.tokenIds.push(_tokenIds[i]);
            // replace with function calls from FantomBundleMarketplace
            /*bundleIdsPerItem[_nft][_tokenIds[i]].add(bundleID);
            nftIndexes[bundleID][_nft][_tokenIds[i]] = i;*/
            fantomBundleMarketplace.addBundleIdPerItemAndSetNftIndex(_nft, _tokenIds[i], bundleID, i);
        }

        listing.payToken = _payToken;
        listing.price = _price;
        listing.startingTime = _startingTime;
        
        //replace with function call from FantomBundleMarketplace
        //owners[bundleID] = _msgSender();
        fantomBundleMarketplace.setOwner(bundleID, _msgSender());

        emit ItemListed(
            _msgSender(),
            _bundleID,
            _payToken,
            _price,
            _startingTime
        );
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

    /// @notice Method for canceling listed NFT bundle
    function cancelListing(string memory _bundleID) external nonReentrant {
        bytes32 bundleID = _getBundleID(_bundleID);
        require(listings[_msgSender()][bundleID].price > 0, "not listed");
        _cancelListing(_msgSender(), _bundleID);
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
            address payToken,
            uint256 price,
            uint256 startingTime
        )
    {
        bytes32 bundleID = _getBundleID(_bundleID);
        nfts = listings[_owner][bundleID].nfts;
        tokenIds = listings[_owner][bundleID].tokenIds;
        quantities = listings[_owner][bundleID].quantities;
        payToken = listings[_owner][bundleID].payToken;
        price = listings[_owner][bundleID].price;
        startingTime = listings[_owner][bundleID].startingTime;         
    }

    function deleteListing(address owner, bytes32 bundleID) external onlyFantomBundleMarketplace{
        delete (listings[owner][bundleID]);        
    }

    function setListing(address owner, bytes32 bundleID, 
                        address[] calldata nfts,
                        uint256[] calldata tokenIds,
                        uint256[] calldata quantities,
                        address payToken,
                        uint256 price,
                        uint256 startingTime) external onlyFantomBundleMarketplace{
        
        listings[owner][bundleID]=  Listing(nfts, tokenIds, quantities, payToken, price, startingTime);
    }

    function subListingQuantity(address owner, bytes32 bundleID, uint256 index, uint256 quantity) external onlyFantomBundleMarketplace{
        Listing storage listing = listings[owner][bundleID];
        listing.quantities[index] = listing.quantities[index].sub(quantity);
    }

    function popListingNftsTokenIdsQuantities(address owner, bytes32 bundleID) external onlyFantomBundleMarketplace{
        Listing storage listing = listings[owner][bundleID];
        listing.nfts.pop();
        listing.tokenIds.pop();
        listing.quantities.pop();
    }

    function emitItemUpdatedEvent(
                                    address owner,
                                    string memory bundleID,
                                    address[] calldata nft,
                                    uint256[] calldata tokenId,
                                    uint256[] calldata quantity,
                                    address payToken,
                                    uint256 newPrice
                                ) external onlyFantomBundleMarketplace{

        emit ItemUpdated(owner, bundleID, nft, tokenId, quantity, payToken, newPrice);
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

    function _cancelListing(address _owner, string memory _bundleID) private {
        bytes32 bundleID = _getBundleID(_bundleID);
        Listing memory listing = listings[_owner][bundleID];
        for (uint256 i; i < listing.nfts.length; i++) {
            //replace with a function call from FantomBundleMarketplace
            /*bundleIdsPerItem[listing.nfts[i]][listing.tokenIds[i]].remove(
                bundleID
            );*/
            fantomBundleMarketplace.removeBundleIdPerItem(listing.nfts[i], listing.tokenIds[i], bundleID);
            //replace with a function call from FantomBundleMarketplace
            //delete (nftIndexes[bundleID][listing.nfts[i]][listing.tokenIds[i]]);
            fantomBundleMarketplace.deleteNftIndex(bundleID, listing.nfts[i], listing.tokenIds[i]);
        }
        delete (listings[_owner][bundleID]);
        //replace with a function call from FantomBundleMarketplace
        //delete (owners[bundleID]);
        fantomBundleMarketplace.deleteOwner(bundleID);
        //replace with a function call from FantomBundleMarketplacde
        //delete (bundleIds[bundleID]);
        fantomBundleMarketplace.deleteBundleId(bundleID);
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