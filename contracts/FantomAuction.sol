// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @notice Secondary sale auction contract for NFTs
 */
contract FantomAuction is ReentrancyGuard, Ownable {
    using SafeMath for uint256;
    using Address for address payable;
    using SafeERC20 for IERC20;

    /// @notice Event emitted only on construction. To be used by indexers
    event FantomAuctionContractDeployed();

    event PauseToggled(
        bool isPaused
    );

    event AuctionCreated(
        address indexed nftAddress,
        uint256 indexed tokenId
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
        uint256 reservePrice
    );

    event UpdatePlatformFee(
        uint256 platformFee
    );

    event UpdatePlatformFeeRecipient(
        address payable platformFeeRecipient
    );

    event UpdateMinBidIncrement(
        uint256 minBidIncrement
    );

    event UpdateBidWithdrawalLockTime(
        uint256 bidWithdrawalLockTime
    );

    event BidPlaced(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed bidder,
        uint256 bid
    );

    event BidWithdrawn(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed bidder,
        uint256 bid
    );

    event BidRefunded(
        address indexed bidder,
        uint256 bid
    );

    event AuctionResulted(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed winner,
        uint256 winningBid
    );

    event AuctionCancelled(
        address indexed nftAddress,
        uint256 indexed tokenId
    );

    /// @notice Parameters of an auction
    struct Auction {
        address owner;
        uint256 reservePrice;
        uint256 startTime;
        uint256 endTime;
        bool resulted;
    }

    /// @notice Information about the sender that placed a bit on an auction
    struct HighestBid {
        address payable bidder;
        uint256 bid;
        uint256 lastBidTime;
    }

    /// @notice ERC721 Address -> Token ID -> Auction Parameters
    mapping(address => mapping(uint256 => Auction)) public auctions;

    /// @notice ERC721 Address -> Token ID -> highest bidder info (if a bid has been received)
    mapping(address => mapping(uint256 => HighestBid)) public highestBids;

    /// @notice globally and across all auctions, the amount by which a bid has to increase
    uint256 public minBidIncrement = 0.05 ether;

    /// @notice global bid withdrawal lock time
    uint256 public bidWithdrawalLockTime = 20 minutes;

    /// @notice global platform fee, assumed to always be to 1 decimal place i.e. 120 = 12.0%
    uint256 public platformFee = 120;

    /// @notice where to send platform fee funds to
    address payable public platformFeeRecipient;

    /// @notice for switching off auction creations, bids and withdrawals
    bool public isPaused;

    modifier whenNotPaused() {
        require(!isPaused, "Function is currently paused");
        _;
    }

    constructor(address payable _platformFeeRecipient) public {
        require(_platformFeeRecipient != address(0), "FantomAuction: Invalid Platform Fee Recipient");

        platformFeeRecipient = _platformFeeRecipient;
        emit FantomAuctionContractDeployed();
    }

    /**
     @notice Creates a new auction for a given item
     @dev Only the owner of item can create an auction and must have approved the contract
     @dev In addition to owning the item, the sender also has to have the MINTER role.
     @dev End time for the auction must be in the future.
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the item being auctioned
     @param _reservePrice Item cannot be sold for less than this or minBidIncrement, whichever is higher
     @param _startTimestamp Unix epoch in seconds for the auction start time
     @param _endTimestamp Unix epoch in seconds for the auction end time.
     */
    function createAuction(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _reservePrice,
        uint256 _startTimestamp,
        uint256 _endTimestamp
    ) external whenNotPaused {
        // Ensure this contract is approved to move the token
        require(
            IERC721(_nftAddress).ownerOf(_tokenId) == _msgSender() && IERC721(_nftAddress).isApprovedForAll(_msgSender(), address(this)),
            "FantomAuction.createAuction: Not owner and or contract not approved"
        );

        _createAuction(
            _nftAddress,
            _tokenId,
            _reservePrice,
            _startTimestamp,
            _endTimestamp
        );
    }

    /**
     @notice Places a new bid, out bidding the existing bidder if found and criteria is reached
     @dev Only callable when the auction is open
     @dev Bids from smart contracts are prohibited to prevent griefing with always reverting receiver
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the item being auctioned
     */
    function placeBid(address _nftAddress, uint256 _tokenId) external payable nonReentrant whenNotPaused {
        require(_msgSender().isContract() == false, "FantomAuction.placeBid: No contracts permitted");

        // Check the auction to see if this is a valid bid
        Auction storage auction = auctions[_nftAddress][_tokenId];

        // Ensure auction is in flight
        require(
            _getNow() >= auction.startTime && _getNow() <= auction.endTime,
            "FantomAuction.placeBid: Bidding outside of the auction window"
        );

        uint256 bidAmount = msg.value;

        // Ensure bid adheres to outbid increment and threshold
        HighestBid storage highestBid = highestBids[_nftAddress][_tokenId];
        uint256 minBidRequired = highestBid.bid.add(minBidIncrement);
        require(bidAmount >= minBidRequired, "FantomAuction.placeBid: Failed to outbid highest bidder");

        // Refund existing top bidder if found
        if (highestBid.bidder != address(0)) {
            _refundHighestBidder(highestBid.bidder, highestBid.bid);
        }

        // assign top bidder and bid time
        highestBid.bidder = _msgSender();
        highestBid.bid = bidAmount;
        highestBid.lastBidTime = _getNow();

        emit BidPlaced(_nftAddress, _tokenId, _msgSender(), bidAmount);
    }

    /**
     @notice Given a sender who has the highest bid on a item, allows them to withdraw their bid
     @dev Only callable by the existing top bidder
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the item being auctioned
     */
    function withdrawBid(address _nftAddress, uint256 _tokenId) external nonReentrant whenNotPaused {
        HighestBid storage highestBid = highestBids[_nftAddress][_tokenId];

        // Ensure highest bidder is the caller
        require(highestBid.bidder == _msgSender(), "FantomAuction.withdrawBid: You are not the highest bidder");

        // Check withdrawal after delay time
        require(
            _getNow() >= highestBid.lastBidTime.add(bidWithdrawalLockTime),
            "FantomAuction.withdrawBid: Cannot withdraw until lock time has passed"
        );

        require(_getNow() < auctions[_nftAddress][_tokenId].endTime, "FantomAuction.withdrawBid: Past auction end");

        uint256 previousBid = highestBid.bid;

        // Clean up the existing top bid
        delete highestBids[_nftAddress][_tokenId];

        // Refund the top bidder
        _refundHighestBidder(_msgSender(), previousBid);

        emit BidWithdrawn(_nftAddress, _tokenId, _msgSender(), previousBid);
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
    function resultAuction(address _nftAddress, uint256 _tokenId) external nonReentrant {
        // Check the auction to see if it can be resulted
        Auction storage auction = auctions[_nftAddress][_tokenId];

        require(IERC721(_nftAddress).ownerOf(_tokenId) == _msgSender() && _msgSender() == auction.owner, "FantomAuction.resultAuction: Sender must be item owner");

        // Check the auction real
        require(auction.endTime > 0, "FantomAuction.resultAuction: Auction does not exist");

        // Check the auction has ended
        require(_getNow() > auction.endTime, "FantomAuction.resultAuction: The auction has not ended");

        // Ensure auction not already resulted
        require(!auction.resulted, "FantomAuction.resultAuction: auction already resulted");

        // Ensure this contract is approved to move the token
        require(IERC721(_nftAddress).isApprovedForAll(_msgSender(), address(this)), "FantomAuction.resultAuction: auction not approved");

        // Get info on who the highest bidder is
        HighestBid storage highestBid = highestBids[_nftAddress][_tokenId];
        address winner = highestBid.bidder;
        uint256 winningBid = highestBid.bid;

        // Ensure auction not already resulted
        require(winningBid >= auction.reservePrice, "FantomAuction.resultAuction: reserve not reached");

        // Ensure there is a winner
        require(winner != address(0), "FantomAuction.resultAuction: no open bids");

        // Result the auction
        auction.resulted = true;

        // Clean up the highest bid
        delete highestBids[_nftAddress][_tokenId];

        if (winningBid > auction.reservePrice) {
            // Work out total above the reserve
            uint256 aboveReservePrice = winningBid.sub(auction.reservePrice);

            // Work out platform fee from above reserve amount
            uint256 platformFeeAboveReserve = aboveReservePrice.mul(platformFee).div(1000);

            // Send platform fee
            (bool platformTransferSuccess,) = platformFeeRecipient.call{value : platformFeeAboveReserve}("");
            require(platformTransferSuccess, "FantomAuction.resultAuction: Failed to send platform fee");

            // Send remaining to designer
            (bool ownerTransferSuccess,) = auction.owner.call{value : winningBid.sub(platformFeeAboveReserve)}("");
            require(ownerTransferSuccess, "FantomAuction.resultAuction: Failed to send the owner their royalties");
        } else {
            (bool ownerTransferSuccess,) = auction.owner.call{value : winningBid}("");
            require(ownerTransferSuccess, "FantomAuction.resultAuction: Failed to send the owner their royalties");
        }

        // Transfer the token to the winner
        IERC721(_nftAddress).safeTransferFrom(IERC721(_nftAddress).ownerOf(_tokenId), winner, _tokenId);

        emit AuctionResulted(_nftAddress, _tokenId, winner, winningBid);
    }

    /**
     @notice Cancels and inflight and un-resulted auctions, returning the funds to the top bidder if found
     @dev Only item owner
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the NFT being auctioned
     */
    function cancelAuction(address _nftAddress, uint256 _tokenId) external nonReentrant {
        // Check valid and not resulted
        Auction storage auction = auctions[_nftAddress][_tokenId];

        require(IERC721(_nftAddress).ownerOf(_tokenId) == _msgSender() && _msgSender() == auction.owner, "FantomAuction.cancelAuction: Sender must be item owner");

        // Check auction is real
        require(auction.endTime > 0, "FantomAuction.cancelAuction: Auction does not exist");

        // Check auction not already resulted
        require(!auction.resulted, "FantomAuction.cancelAuction: auction already resulted");

        // refund existing top bidder if found
        HighestBid storage highestBid = highestBids[_nftAddress][_tokenId];
        if (highestBid.bidder != address(0)) {
            _refundHighestBidder(highestBid.bidder, highestBid.bid);

            // Clear up highest bid
            delete highestBids[_nftAddress][_tokenId];
        }

        // Remove auction and top bidder
        delete auctions[_nftAddress][_tokenId];

        emit AuctionCancelled(_nftAddress, _tokenId);
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
     @notice Update the amount by which bids have to increase, across all auctions
     @dev Only admin
     @param _minBidIncrement New bid step in WEI
     */
    function updateMinBidIncrement(uint256 _minBidIncrement) external onlyOwner {
        minBidIncrement = _minBidIncrement;
        emit UpdateMinBidIncrement(_minBidIncrement);
    }

    /**
     @notice Update the global bid withdrawal lockout time
     @dev Only admin
     @param _bidWithdrawalLockTime New bid withdrawal lock time
     */
    function updateBidWithdrawalLockTime(uint256 _bidWithdrawalLockTime) external onlyOwner {
        bidWithdrawalLockTime = _bidWithdrawalLockTime;
        emit UpdateBidWithdrawalLockTime(_bidWithdrawalLockTime);
    }

    /**
     @notice Update the current reserve price for an auction
     @dev Only admin
     @dev Auction must exist
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the NFT being auctioned
     @param _reservePrice New Ether reserve price (WEI value)
     */
    function updateAuctionReservePrice(address _nftAddress, uint256 _tokenId, uint256 _reservePrice) external {
        Auction storage auction = auctions[_nftAddress][_tokenId];

        require(_msgSender() == auction.owner, "FantomAuction.updateAuctionReservePrice: Sender must be item owner");
        require(auction.endTime > 0, "FantomAuction.updateAuctionReservePrice: No Auction exists");

        auction.reservePrice = _reservePrice;
        emit UpdateAuctionReservePrice(_nftAddress, _tokenId, _reservePrice);
    }

    /**
     @notice Update the current start time for an auction
     @dev Only admin
     @dev Auction must exist
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the NFT being auctioned
     @param _startTime New start time (unix epoch in seconds)
     */
    function updateAuctionStartTime(address _nftAddress, uint256 _tokenId, uint256 _startTime) external {
        Auction storage auction = auctions[_nftAddress][_tokenId];

        require(_msgSender() == auction.owner, "FantomAuction.updateAuctionStartTime: Sender must be item owner");
        require(auction.endTime > 0, "FantomAuction.updateAuctionStartTime: No Auction exists");

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
    function updateAuctionEndTime(address _nftAddress, uint256 _tokenId, uint256 _endTimestamp) external {
        Auction storage auction = auctions[_nftAddress][_tokenId];

        require(_msgSender() == auction.owner, "FantomAuction.updateAuctionEndTime: Sender must be item owner");
        require(auction.endTime > 0, "FantomAuction.updateAuctionEndTime: No Auction exists");
        require(auction.startTime < _endTimestamp, "FantomAuction.updateAuctionEndTime: End time must be greater than start");
        require(_endTimestamp > _getNow(), "FantomAuction.updateAuctionEndTime: End time passed. Nobody can bid");

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
    function updatePlatformFeeRecipient(address payable _platformFeeRecipient) external onlyOwner {
        require(_platformFeeRecipient != address(0), "FantomAuction.updatePlatformFeeRecipient: Zero address");

        platformFeeRecipient = _platformFeeRecipient;
        emit UpdatePlatformFeeRecipient(_platformFeeRecipient);
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
    returns (address _owner, uint256 _reservePrice, uint256 _startTime, uint256 _endTime, bool _resulted) {
        Auction storage auction = auctions[_nftAddress][_tokenId];
        return (
            auction.owner,
            auction.reservePrice,
            auction.startTime,
            auction.endTime,
            auction.resulted
        );
    }

    /**
     @notice Method for getting all info about the highest bidder
     @param _tokenId Token ID of the NFT being auctioned
     */
    function getHighestBidder(address _nftAddress, uint256 _tokenId) external view returns (
        address payable _bidder,
        uint256 _bid,
        uint256 _lastBidTime
    ) {
        HighestBid storage highestBid = highestBids[_nftAddress][_tokenId];
        return (
            highestBid.bidder,
            highestBid.bid,
            highestBid.lastBidTime
        );
    }

    /////////////////////////
    // Internal and Private /
    /////////////////////////

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }

    /**
     @notice Private method doing the heavy lifting of creating an auction
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the NFT being auctioned
     @param _reservePrice Item cannot be sold for less than this or minBidIncrement, whichever is higher
     @param _startTimestamp Unix epoch in seconds for the auction start time
     @param _endTimestamp Unix epoch in seconds for the auction end time.
     */
    function _createAuction(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _reservePrice,
        uint256 _startTimestamp,
        uint256 _endTimestamp
    ) private {
        // Ensure a token cannot be re-listed if previously successfully sold
        require(auctions[_nftAddress][_tokenId].endTime == 0, "FantomAuction.createAuction: Cannot relist");

        // Check end time not before start time and that end is in the future
        require(_endTimestamp > _startTimestamp, "FantomAuction.createAuction: End time must be greater than start");
        require(_endTimestamp > _getNow(), "FantomAuction.createAuction: End time passed. Nobody can bid.");

        // Setup the auction
        auctions[_nftAddress][_tokenId] = Auction({
            owner : _msgSender(),
            reservePrice : _reservePrice,
            startTime : _startTimestamp,
            endTime : _endTimestamp,
            resulted : false
        });

        emit AuctionCreated(_nftAddress, _tokenId);
    }

    /**
     @notice Used for sending back escrowed funds from a previous bid
     @param _currentHighestBidder Address of the last highest bidder
     @param _currentHighestBid Ether or Mona amount in WEI that the bidder sent when placing their bid
     */
    function _refundHighestBidder(address payable _currentHighestBidder, uint256 _currentHighestBid) private {
        // refund previous best (if bid exists)
        (bool successRefund,) = _currentHighestBidder.call{value : _currentHighestBid}("");
        require(successRefund, "FantomAuction._refundHighestBidder: failed to refund previous bidder");
        emit BidRefunded(_currentHighestBidder, _currentHighestBid);
    }

    /**
    * @notice Reclaims ERC20 Compatible tokens for entire balance
    * @dev Only access controls admin
    * @param _tokenContract The address of the token contract
    */
    function reclaimERC20(address _tokenContract) external onlyOwner {
        require(_tokenContract != address(0), "Invalid address");
        IERC20 token = IERC20(_tokenContract);
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(_msgSender(), balance), "Transfer failed");
    }
}
