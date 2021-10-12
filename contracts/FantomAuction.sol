// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interface/IFantomAddressRegistry.sol";
import "./interface/IFantomListingMarketplace.sol";
import "./interface/IFantomMarketplace.sol";
//import "./interface/IFantomBundleMarketplace.sol";
import "./interface/IFantomOfferBundleMarketplace.sol";
import "./interface/IFantomTokenRegistry.sol";
import "./interface/IFantomBid.sol";

/**
 * @notice Secondary sale auction contract for NFTs
 */
contract FantomAuction is OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeMath for uint256;
    using AddressUpgradeable for address payable;
    using SafeERC20 for IERC20;

    /// @notice Event emitted only on construction. To be used by indexers
    event FantomAuctionContractDeployed();

    event PauseToggled(bool isPaused);

    event AuctionCreated(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address payToken
    );

    event UpdateAuctionEndTime(
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 endTime
    );

    event UpdateAuctionStartTime(
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 startTime
    );

    event UpdateAuctionReservePrice(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address payToken,
        uint256 reservePrice
    );

    event UpdatePlatformFee(uint256 platformFee);

    event UpdatePlatformFeeRecipient(address payable platformFeeRecipient);
   
    event AuctionResulted(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed winner,
        address payToken,
        int256 unitPrice,
        uint256 winningBid
    );

    event AuctionCancelled(address indexed nftAddress, uint256 indexed tokenId);

    /// @notice Parameters of an auction
    struct Auction {
        address owner;
        address payToken;
        uint256 reservePrice;
        uint256 startTime;
        uint256 endTime;
        bool resulted;
    }
    
    /// @notice ERC721 Address -> Token ID -> Auction Parameters
    mapping(address => mapping(uint256 => Auction)) public auctions;
   
    /// @notice global platform fee, assumed to always be to 1 decimal place i.e. 25 = 2.5%
    uint256 public platformFee = 25;

    /// @notice where to send platform fee funds to
    address payable public platformFeeRecipient;

    /// @notice Address registry
    IFantomAddressRegistry public addressRegistry;

    /// @notice FantomBid
    IFantomBid public fantomBid;

    /// @notice FantomBid Address;
    address public fantomBidAddress;

    /// @notice for switching off auction creations, bids and withdrawals
    bool public isPaused;

    modifier whenNotPaused() {
        require(!isPaused, "contract paused");
        _;
    }

    modifier onlyMarketplace() {
        require(
            addressRegistry.marketplace() == _msgSender() ||
                addressRegistry.bundleMarketplace() == _msgSender(),
            "not marketplace contract"
        );
        _;
    }

    modifier onlyFantomBid() {
        require(
            fantomBidAddress == _msgSender(),
            "not called by FantomBid"
        );
        _;
    }

    /// @notice Contract initializer
    function initialize(address payable _platformFeeRecipient, address _fantomBidAddress)
        public
        initializer
    {
        require(
            _platformFeeRecipient != address(0),
            "FantomAuction: Invalid Platform Fee Recipient"
        );

        fantomBidAddress = _fantomBidAddress;
        fantomBid = IFantomBid(_fantomBidAddress);
        platformFeeRecipient = _platformFeeRecipient;
        emit FantomAuctionContractDeployed();

        __Ownable_init();
        __ReentrancyGuard_init();
    }

    /**
     @notice Creates a new auction for a given item
     @dev Only the owner of item can create an auction and must have approved the contract
     @dev In addition to owning the item, the sender also has to have the MINTER role.
     @dev End time for the auction must be in the future.
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the item being auctioned
     @param _payToken Paying token
     @param _reservePrice Item cannot be sold for less than this or minBidIncrement, whichever is higher
     @param _startTimestamp Unix epoch in seconds for the auction start time
     @param _endTimestamp Unix epoch in seconds for the auction end time.
     */
    function createAuction(
        address _nftAddress,
        uint256 _tokenId,
        address _payToken,
        uint256 _reservePrice,
        uint256 _startTimestamp,
        uint256 _endTimestamp
    ) external whenNotPaused {
        // Ensure this contract is approved to move the token
        require(
            IERC721(_nftAddress).ownerOf(_tokenId) == _msgSender() &&
                IERC721(_nftAddress).isApprovedForAll(
                    _msgSender(),
                    address(this)
                ),
            "not owner and or contract not approved"
        );

        require(
            _payToken == address(0) ||
                (addressRegistry.tokenRegistry() != address(0) &&
                    IFantomTokenRegistry(addressRegistry.tokenRegistry())
                        .enabled(_payToken)),
            "invalid pay token"
        );

        _createAuction(
            _nftAddress,
            _tokenId,
            _payToken,
            _reservePrice,
            _startTimestamp,
            _endTimestamp
        );
    }
    
    //////////
    // Admin /
    //////////

    /**
     @notice Results a finished auction
     @dev Only admin or smart contract
     @dev Auction can only be resulted if there has been a bidder and reserve met.
     @dev If there have been no bids, the auction needs to be cancelled instead using `cancelAuction()`
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the item being auctioned
     */
    function resultAuction(address _nftAddress, uint256 _tokenId)
        external
        nonReentrant
    {
        // Check the auction to see if it can be resulted
        Auction storage auction = auctions[_nftAddress][_tokenId];

        require(
            IERC721(_nftAddress).ownerOf(_tokenId) == _msgSender() &&
                _msgSender() == auction.owner,
            "sender must be item owner"
        );

        // Check the auction real
        require(auction.endTime > 0, "no auction exists");

        // Check the auction has ended
        require(_getNow() > auction.endTime, "auction not ended");

        // Ensure auction not already resulted
        require(!auction.resulted, "auction already resulted");

        // Ensure this contract is approved to move the token
        require(
            IERC721(_nftAddress).isApprovedForAll(_msgSender(), address(this)),
            "auction not approved"
        );

        // Get info on who the highest bidder is    
        (address bidder, uint256 bid, ) = fantomBid.getHighestBidder(_nftAddress, _tokenId);
        
        address winner = bidder; // populate with the correct value IE 14/09/2021
        uint256 winningBid = bid; // populate with the correct value IE 14/09/2021

        // Ensure there is a winner
        require(winner != address(0), "no open bids");

        // Result the auction
        auction.resulted = true;

        // Clean up the highest bid
        fantomBid.deleteHighestBidder(_nftAddress, _tokenId);

        uint256 payAmount;

        if (winningBid > auction.reservePrice) {
            // Work out total above the reserve
            uint256 aboveReservePrice = winningBid.sub(auction.reservePrice);

            // Work out platform fee from above reserve amount
            uint256 platformFeeAboveReserve = aboveReservePrice
                .mul(platformFee)
                .div(1000);

            fantomBid.transfer(platformFeeRecipient, auction.payToken, platformFeeAboveReserve, "failed to send platform fee");
            
            // Send remaining to designer
            payAmount = winningBid.sub(platformFeeAboveReserve);
        } else {
            payAmount = winningBid;
        }

        IFantomMarketplace marketplace = IFantomMarketplace(
            addressRegistry.marketplace()
        );
        address minter = marketplace.minters(_nftAddress, _tokenId);
        uint16 royalty = marketplace.royalties(_nftAddress, _tokenId);
        if (minter != address(0) && royalty != 0) {
            uint256 royaltyFee = payAmount.mul(royalty).div(1000);            
            fantomBid.transfer(minter, auction.payToken, royaltyFee, "failed to send the owner their royalties");
            payAmount = payAmount.sub(royaltyFee);
        } else {
            (royalty, , minter) = marketplace.collectionRoyalties(_nftAddress);
            if (minter != address(0) && royalty != 0) {
                uint256 royaltyFee = payAmount.mul(royalty).div(1000);                
                fantomBid.transfer(minter, auction.payToken, royaltyFee, "failed to send the royalties");
                payAmount = payAmount.sub(royaltyFee);
            }
        }
        if (payAmount > 0) {           
            fantomBid.transfer(auction.owner, auction.payToken, payAmount, "failed to send the owner the auction balance");
        }

        // Transfer the token to the winner
        IERC721(_nftAddress).safeTransferFrom(
            IERC721(_nftAddress).ownerOf(_tokenId),
            winner,
            _tokenId
        );

        //IFantomBundleMarketplace(addressRegistry.bundleMarketplace())
        IFantomOfferBundleMarketplace(addressRegistry.offerBundleMarketplace())
            .validateItemSold(_nftAddress, _tokenId, uint256(1));

        emit AuctionResulted(
            _nftAddress,
            _tokenId,
            winner,
            auction.payToken,
            IFantomListingMarketplace(addressRegistry.listingMarketplace()).getPrice(auction.payToken),
            winningBid
        );

        // Remove auction
        delete auctions[_nftAddress][_tokenId];
    }

    /**
     @notice Cancels and inflight and un-resulted auctions, returning the funds to the top bidder if found
     @dev Only item owner
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the NFT being auctioned
     */
    function cancelAuction(address _nftAddress, uint256 _tokenId)
        external
        nonReentrant
    {
        // Check valid and not resulted
        Auction memory auction = auctions[_nftAddress][_tokenId];

        require(
            IERC721(_nftAddress).ownerOf(_tokenId) == _msgSender() &&
                _msgSender() == auction.owner,
            "sender must be owner"
        );
        // Check auction is real
        require(auction.endTime > 0, "no auction exists");
        // Check auction not already resulted
        require(!auction.resulted, "auction already resulted");

        _cancelAuction(_nftAddress, _tokenId);
    }

    /**
     @notice Toggling the pause flag
     @dev Only admin
     */
    function toggleIsPaused() external onlyOwner {
        isPaused = !isPaused;
        emit PauseToggled(isPaused);
    }    

    /**
     @notice Update the current reserve price for an auction
     @dev Only admin
     @dev Auction must exist
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the NFT being auctioned
     @param _reservePrice New Ether reserve price (WEI value)
     */
    function updateAuctionReservePrice(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _reservePrice
    ) external {
        Auction storage auction = auctions[_nftAddress][_tokenId];

        require(_msgSender() == auction.owner, "sender must be item owner");
        require(auction.endTime > 0, "no auction exists");

        auction.reservePrice = _reservePrice;
        emit UpdateAuctionReservePrice(_nftAddress, _tokenId, auction.payToken, _reservePrice);
    }

    /**
     @notice Update the current start time for an auction
     @dev Only admin
     @dev Auction must exist
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the NFT being auctioned
     @param _startTime New start time (unix epoch in seconds)
     */
    function updateAuctionStartTime(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _startTime
    ) external {
        Auction storage auction = auctions[_nftAddress][_tokenId];

        require(_msgSender() == auction.owner, "sender must be owner");
        require(auction.endTime > 0, "no auction exists");

        auction.startTime = _startTime;
        emit UpdateAuctionStartTime(_nftAddress, _tokenId, _startTime);
    }

    /**
     @notice Update the current end time for an auction
     @dev Only admin
     @dev Auction must exist
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the NFT being auctioned
     @param _endTimestamp New end time (unix epoch in seconds)
     */
    function updateAuctionEndTime(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _endTimestamp
    ) external {
        Auction storage auction = auctions[_nftAddress][_tokenId];

        require(_msgSender() == auction.owner, "sender must be owner");
        require(auction.endTime > 0, "no auction exists");
        require(
            auction.startTime < _endTimestamp,
            "end time must be greater than start"
        );
        require(_endTimestamp > _getNow(), "invalid end time");

        auction.endTime = _endTimestamp;
        emit UpdateAuctionEndTime(_nftAddress, _tokenId, _endTimestamp);
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
        require(_platformFeeRecipient != address(0), "zero address");

        platformFeeRecipient = _platformFeeRecipient;
        emit UpdatePlatformFeeRecipient(_platformFeeRecipient);
    }

    /**
     @notice Update FantomAddressRegistry contract
     @dev Only admin
     */
    function updateAddressRegistry(address _registry) external onlyOwner {
        addressRegistry = IFantomAddressRegistry(_registry);
    }

    ///////////////
    // Accessors //
    ///////////////

    /**
     @notice Method for getting all info about the auction
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the NFT being auctioned
     */
    function getAuction(address _nftAddress, uint256 _tokenId)
        external
        view
        returns (
            address _owner,
            address _payToken,
            uint256 _reservePrice,
            uint256 _startTime,
            uint256 _endTime,
            bool _resulted
        )
    {
        Auction storage auction = auctions[_nftAddress][_tokenId];
        return (
            auction.owner,
            auction.payToken,
            auction.reservePrice,
            auction.startTime,
            auction.endTime,
            auction.resulted
        );
    }
    
    /////////////////////////
    // Internal and Private /
    /////////////////////////

    function _getNow() internal view virtual returns (uint256) {
        return block.timestamp;
    }

    /**
     @notice Private method doing the heavy lifting of creating an auction
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the NFT being auctioned
     @param _payToken Paying token
     @param _reservePrice Item cannot be sold for less than this or minBidIncrement, whichever is higher
     @param _startTimestamp Unix epoch in seconds for the auction start time
     @param _endTimestamp Unix epoch in seconds for the auction end time.
     */
    function _createAuction(
        address _nftAddress,
        uint256 _tokenId,
        address _payToken,
        uint256 _reservePrice,
        uint256 _startTimestamp,
        uint256 _endTimestamp
    ) private {
        // Ensure a token cannot be re-listed if previously successfully sold
        require(
            auctions[_nftAddress][_tokenId].endTime == 0,
            "auction already started"
        );

        // Check end time not before start time and that end is in the future
        require(
            _endTimestamp > _startTimestamp,
            "end time must be greater than start"
        );
        require(_endTimestamp > _getNow(), "invalid end time");

        // Setup the auction
        auctions[_nftAddress][_tokenId] = Auction({
            owner: _msgSender(),
            payToken: _payToken,
            reservePrice: _reservePrice,
            startTime: _startTimestamp,
            endTime: _endTimestamp,
            resulted: false
        });

        emit AuctionCreated(_nftAddress, _tokenId, _payToken);
    }

    function _cancelAuction(address _nftAddress, uint256 _tokenId) private {
        // refund existing top bidder if found
        
        fantomBid.refundHighestBidder(_nftAddress, _tokenId);
        // Remove auction and top bidder
        delete auctions[_nftAddress][_tokenId];

        emit AuctionCancelled(_nftAddress, _tokenId);
    }
}
