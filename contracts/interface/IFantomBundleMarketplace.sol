// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;


interface IFantomBundleMarketplace {

    /*function validateItemSold(
        address,
        uint256,
        uint256
    ) external;*/

    function owners(bytes32 bundleID) external view returns (address);

    function platformFee() external view returns(uint256);

    function feeReceipient() external view returns(address);

    function setBundleId(bytes32 bundleID, string memory _bundleID) external;

    function bundleIds(bytes32 bundleID) external view returns(string memory);

    function nftIndexes(bytes32 bundleID, address nft, uint256 tokenID) external view returns(uint256);

    function addBundleIdPerItemAndSetNftIndex(address nft, uint256 tokenId, bytes32 bundleID, uint256 index) external;

    function setOwner(bytes32 bundleID, address owner) external;

    function setnftIndex(bytes32 bundleID, address nft, uint256 tokenId, uint256 index) external;

    function removeBundleIdPerItem(address nft, uint256 tokenId, bytes32 bundleID) external;

    function deleteNftIndex(bytes32 bundleID, address nft, uint256 tokenId) external;

    function deleteOwner(bytes32 bundleID) external;

    function deleteBundleId(bytes32 bundleID) external;

    function bundleIdsPerItemLength(address nft, uint256 tokenId) external view returns(uint256);

    function bundleIdsPerItemAt(address nft, uint256 tokenId, uint256 atIndex) external view returns(bytes32);

    function emitItemSoldEvent(
        address seller,
        address buyer,
        string memory bundleID,
        address payToken,
        int256 unitPrice,
        uint256 price) external;

}