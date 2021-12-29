// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/// @dev Interface for the NFT Royalty Standard
interface IERC2981Royalties {
    function royaltyInfo(
        address _collection,
        uint256 _tokenId,
        uint256 _salePrice
    ) external view returns (address receiver, uint256 royaltyAmount);
}
