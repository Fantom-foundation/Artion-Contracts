// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

//import "../FantomAuction.sol";
import "../FantomBid.sol";

contract BiddingContractMock {
    //FantomAuction public auctionContract;
    FantomBid public bidContract;

    constructor(/*FantomAuction _auctionContract*/ FantomBid _bidContract) public {
        //auctionContract = _auctionContract;
        bidContract = _bidContract;
    }

    function bid(address _nftAddress, uint256 _tokenId) external payable {
        //auctionContract.placeBid{value: msg.value}(_nftAddress, _tokenId);
        bidContract.placeBid{value: msg.value}(_nftAddress, _tokenId);
    }
}
