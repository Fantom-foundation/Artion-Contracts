// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IFantomOfferBundleMarketplace {

    function  deleteOffer(bytes32 bundleID, address offerer) external;

    function emitOfferCanceledEvent(address creator, string memory bundleID) external;

    function validateItemSold(
        address nft,
        uint256 tokenId,
        uint256 quantity
    ) external;

    function test() external;

}