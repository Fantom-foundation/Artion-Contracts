// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IFantomBid {
    function getHighestBidder(address _nftAddress, uint256 _tokenId
    ) external view returns (
        address payable _bidder,
        uint256 _bid,
        uint256 _lastBidTime
    );

    function deleteHighestBidder(address _nftAddress, uint256 _tokenId) external;

    function refundHighestBidder(address _nftAddress, uint256 _tokenId) external;
}