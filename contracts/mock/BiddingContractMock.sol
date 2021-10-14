// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../FantomAuction.sol";

contract BiddingContractMock {
    FantomAuction public auctionContract;

    constructor(FantomAuction _auctionContract) public {
        auctionContract = _auctionContract;
    }

    /* function bid(address _nftAddress, uint256 _tokenId) external payable {
        auctionContract.placeBid{value: msg.value}(_nftAddress, _tokenId);
    } */
}
