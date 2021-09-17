// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IFantomMarketplace {
    function minters(address, uint256) external view returns (address);

    function royalties(address, uint256) external view returns (uint16);

    function collectionRoyalties(address)
        external
        view
        returns (
            uint16,
            address,
            address
        );

    function getPrice(address) external view returns (int256);

    function platformFee() external view returns(uint16);

    function feeReceipient() external view returns(address payable);

    function emitItemSoldEvent(
                            address seller,
                            address buyer,
                            address nft,
                            uint256 tokenId,
                            uint256 quantity,
                            address payToken,
                            uint256 pricePerItem) external;
}