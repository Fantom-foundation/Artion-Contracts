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
import "./interface/IFantomMarketplace.sol";
import "./interface/IFantomBundleMarketplace.sol";
import "./interface/IFantomTokenRegistry.sol";
import "./interface/IFantomAuction.sol";

/**
 * @notice Secondary sale auction contract for NFTs
 */
contract FantomBid is OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeMath for uint256;
    using AddressUpgradeable for address payable;
    using SafeERC20 for IERC20;

    /// @notice Event emitted only on construction. To be used by indexers
    event FantomBidContractDeployed();
        
    event UpdateMinBidIncrement(uint256 minBidIncrement);

    event UpdateBidWithdrawalLockTime(uint256 bidWithdrawalLockTime);

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
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed bidder,
        uint256 bid
    );
   
    /// @notice Information about the sender that placed a bit on an auction
    struct HighestBid {
        address payable bidder;
        uint256 bid;
        uint256 lastBidTime;
    }
    
    /// @notice ERC721 Address -> Token ID -> highest bidder info (if a bid has been received)
    mapping(address => mapping(uint256 => HighestBid)) public highestBids;

    /// @notice globally and across all auctions, the amount by which a bid has to increase
    uint256 public minBidIncrement = 0.05 ether;

    /// @notice global bid withdrawal lock time
    uint256 public bidWithdrawalLockTime = 20 minutes;

    /// @notice Address registry
    IFantomAddressRegistry public addressRegistry;

    /// @notice FantomAuction Address
    address public fantomAuctionAddress;

    /// @notice FantomAuction
    IFantomAuction public fantomAuction;

    modifier whenNotPaused() {
        // replace this part with a function defined in FantomAuction.sol and call the function here IE 14/09/2021
        bool isPaused = fantomAuction.isPaused();
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

    modifier onlyFantomAuction() {
        require(
            fantomAuctionAddress == _msgSender(),
            "not called by FantomAuction"
        );
        _;
    }

    /// @notice Contract initializer
    function initialize(address _fantomAuctionAddress)
        public
        initializer
    {      
        fantomAuctionAddress = _fantomAuctionAddress;
        fantomAuction = IFantomAuction(_fantomAuctionAddress);     
        emit FantomBidContractDeployed();

        __Ownable_init();
        __ReentrancyGuard_init();
    }    

    /**
     @notice Places a new bid, out bidding the existing bidder if found and criteria is reached
     @dev Only callable when the auction is open
     @dev Bids from smart contracts are prohibited to prevent griefing with always reverting receiver
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the item being auctioned
     */
    function placeBid(address _nftAddress, uint256 _tokenId)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        require(_msgSender().isContract() == false, "no contracts permitted");

        // Check the auction to see if this is a valid bid        
        (, address payToken, , uint256 startTime, uint256 endTime, ) = fantomAuction.getAuction(_nftAddress, _tokenId);
        require(
            _getNow() >= startTime && _getNow() <= endTime,
            "bidding outside of the auction window"
        );
        require(payToken == address(0), "invalid pay token");
        
        _placeBid(_nftAddress, _tokenId, msg.value);
    }

    /**
     @notice Places a new bid, out bidding the existing bidder if found and criteria is reached
     @dev Only callable when the auction is open
     @dev Bids from smart contracts are prohibited to prevent griefing with always reverting receiver
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the item being auctioned
     @param _bidAmount Bid amount
     */
    function placeBidWithERC20(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _bidAmount
    ) external nonReentrant whenNotPaused {
        require(_msgSender().isContract() == false, "no contracts permitted");

        // Check the auction to see if this is a valid bid        
        (, , , uint256 startTime, uint256 endTime, ) = fantomAuction.getAuction(_nftAddress, _tokenId);
        // Ensure auction is in flight
        require(
            _getNow() >= startTime && _getNow() <= endTime,
            "bidding outside of the auction window"
        );

        _placeBid(_nftAddress, _tokenId, _bidAmount);
    }

    function _placeBid(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _bidAmount
    ) internal whenNotPaused {
        //Auction storage auction = auctions[_nftAddress][_tokenId];
        // Ensure bid adheres to outbid increment and threshold
        HighestBid storage highestBid = highestBids[_nftAddress][_tokenId];
        uint256 minBidRequired = highestBid.bid.add(minBidIncrement);
        require(
            _bidAmount >= minBidRequired,
            "failed to outbid highest bidder"
        );
        
        (, address payToken, , , ,) = fantomAuction.getAuction(_nftAddress, _tokenId);
        if (payToken != address(0)) {
            IERC20 iERC20 = IERC20(payToken);
            require(
                iERC20.transferFrom(_msgSender(), address(this), _bidAmount),
                "insufficient balance or not approved"
            );
        }
        // Refund existing top bidder if found
        if (highestBid.bidder != address(0)) {
            _refundHighestBidder(
                _nftAddress,
                _tokenId,
                highestBid.bidder,
                highestBid.bid
            );
        }

        // assign top bidder and bid time
        highestBid.bidder = _msgSender();
        highestBid.bid = _bidAmount;
        highestBid.lastBidTime = _getNow();

        emit BidPlaced(_nftAddress, _tokenId, _msgSender(), _bidAmount);
    }

    /**
     @notice Given a sender who has the highest bid on a item, allows them to withdraw their bid
     @dev Only callable by the existing top bidder
     @param _nftAddress ERC 721 Address
     @param _tokenId Token ID of the item being auctioned
     */
    function withdrawBid(address _nftAddress, uint256 _tokenId)
        external
        nonReentrant
        whenNotPaused
    {
        HighestBid storage highestBid = highestBids[_nftAddress][_tokenId];

        // Ensure highest bidder is the caller
        require(
            highestBid.bidder == _msgSender(),
            "you are not the highest bidder"
        );

        // Check withdrawal after delay time
        require(
            _getNow() >= highestBid.lastBidTime.add(bidWithdrawalLockTime),
            "cannot withdraw until lock time has passed"
        );
            
        (, , , , uint256 endTime, ) = fantomAuction.getAuction(_nftAddress, _tokenId);
        require(
            _getNow() < endTime,
            "past auction end"
        );

        uint256 previousBid = highestBid.bid;

        // Clean up the existing top bid
        delete highestBids[_nftAddress][_tokenId];

        // Refund the top bidder
        _refundHighestBidder(_nftAddress, _tokenId, _msgSender(), previousBid);

        emit BidWithdrawn(_nftAddress, _tokenId, _msgSender(), previousBid);
    }

    //////////
    // Admin /
    //////////

    /**
     @notice Update the amount by which bids have to increase, across all auctions
     @dev Only admin
     @param _minBidIncrement New bid step in WEI
     */
    function updateMinBidIncrement(uint256 _minBidIncrement)
        external
        onlyOwner
    {
        minBidIncrement = _minBidIncrement;
        emit UpdateMinBidIncrement(_minBidIncrement);
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
     @notice Method for getting all info about the highest bidder
     @param _tokenId Token ID of the NFT being auctioned
     */
    function getHighestBidder(address _nftAddress, uint256 _tokenId)
        external
        view
        returns (
            address payable _bidder,
            uint256 _bid,
            uint256 _lastBidTime
        )
    {
        HighestBid storage highestBid = highestBids[_nftAddress][_tokenId];
        return (highestBid.bidder, highestBid.bid, highestBid.lastBidTime);
    }

    /////////////////////////
    // Internal and Private /
    /////////////////////////

    function _getNow() internal view virtual returns (uint256) {
        return block.timestamp;
    }


    /**
     @notice Used for sending back escrowed funds from a previous bid
     @param _currentHighestBidder Address of the last highest bidder
     @param _currentHighestBid Ether or Mona amount in WEI that the bidder sent when placing their bid
     */
    function _refundHighestBidder(
        address _nftAddress,
        uint256 _tokenId,
        address payable _currentHighestBidder,
        uint256 _currentHighestBid
    ) private {
        (, address payToken, , , ,) = fantomAuction.getAuction(_nftAddress, _tokenId);
        if (payToken == address(0)) {
            // refund previous best (if bid exists)
            (bool successRefund, ) = _currentHighestBidder.call{
                value: _currentHighestBid
            }("");
            require(successRefund, "failed to refund previous bidder");
        } else {
            IERC20 iERC20 = IERC20(payToken);
            require(
                iERC20.transfer(
                    _currentHighestBidder,
                    _currentHighestBid
                ),
                "failed to refund previous bidder"
            );
        }


        emit BidRefunded(
            _nftAddress,
            _tokenId,
            _currentHighestBidder,
            _currentHighestBid
        );
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

    function deleteHighestBidder(address _nftAddress, uint256 _tokenId) external onlyFantomAuction {
        delete highestBids[_nftAddress][_tokenId];
    }

    function refundHighestBidder(address _nftAddress, uint256 _tokenId) external onlyFantomAuction {
        HighestBid storage highestBid = highestBids[_nftAddress][_tokenId];
        
        if (highestBid.bidder != address(0)) {
            _refundHighestBidder(
                _nftAddress,
                _tokenId,
                highestBid.bidder,
                highestBid.bid
            );

            // Clear up highest bid
            delete highestBids[_nftAddress][_tokenId];
        }
    }

    function transfer(address to, address payToken, uint256 amount, string memory revertMessage) external onlyFantomAuction {
        if(payToken == address(0)){
            (bool transferSuccess, ) = payable(to).call{
                    value: amount
                }("");
                require(
                    transferSuccess,
                    revertMessage
                );
        }else {
            IERC20 iERC20 = IERC20(payToken);
            require(iERC20.transfer(to, amount),
                    revertMessage
                );
        }
    }    
}
