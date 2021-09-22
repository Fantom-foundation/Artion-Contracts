// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IFantomOfferMarketplace {
    
    function deleteOffer(address _nftAddress, uint256 _tokenId, address _buyer) external;

    function emitOfferCanceledEvent(address _buyer, address _nftAddress, uint256 _tokenId) external;

    function validateItemSold(
                address _nftAddress,
                uint256 _tokenId,
                address _seller,
                address _buyer
            ) external ;
}