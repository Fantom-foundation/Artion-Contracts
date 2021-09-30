// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IFantomListingBundleMarketplace {
    /* function listings(address owner, bytes32 bundleID) external view returns(
        address[] calldata nfts,
        uint256[] calldata tokenIds,
        uint256[] calldata quantities,
        address payToken,
        uint256 price,
        uint256 startingTime
    );
 */
    function deleteListing(address owner, bytes32 bundleID) external;

    function setListing(address owner, bytes32 bundleID, 
                        address[] calldata nfts,
                        uint256[] calldata tokenIds,
                        uint256[] calldata quantities,
                        address payToken,
                        uint256 price,
                        uint256 startingTime) external;

    function emitItemUpdatedEvent(
                                    address owner,
                                    string memory bundleID,
                                    address[] calldata nft,
                                    uint256[] calldata tokenId,
                                    uint256[] calldata quantity,
                                    address payToken,
                                    uint256 newPrice
                                ) external;

    function getListing(address _owner, string memory _bundleID) external view returns(
        address[] calldata nfts,
        uint256[] calldata tokenIds,
        uint256[] calldata quantities,
        address payToken,
        uint256 price,
        uint256 startingTime
    );

    function subListingQuantity(address owner, bytes32 bundleID, uint256 index, uint256 quantity) external;

    function popListingNftsTokenIdsQuantities(address owner, bytes32 bundleID) external;

    function copyLastListingNftsTokenIdsQuantities(address owner, bytes32 bundleID, uint256 index) external;


}