// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IFantomListingMarketplace {
    function listings(address _nftAddress, uint256 _tokenId, address _owner) external view returns (
        uint256 quantity,
        address payToken,
        uint256 pricePerItem,
        uint256 startingTime
        );

    function deleteListing(address _nftAddress, uint256 _tokenId, address _owner) external;

    function cancelListing(address _nftAddress, uint256 _tokenId, address _seller) external;

    function getPrice(address _payToken) external view returns(int256);
}