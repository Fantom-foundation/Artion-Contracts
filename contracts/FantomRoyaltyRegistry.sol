// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import "./ERC2981Base.sol";

/// @dev This is a contract used to add ERC2981 support to ERC721 and 1155
/// @dev This implementation has the same royalties for each and every tokens
abstract contract FantomRoyaltyRegistry is ERC2981Base {
    //RoyaltyInfo private _royalties;
    mapping(uint256 => mapping(uint256 => CollectionRoyaltyInfo)) _royalties;

    /// @dev Sets token royalties
    /// @param feeRecipient recipient of the royalties
    /// @param royalty percentage (using 2 decimals - 1000 = 100, 0 = 0)
    function _setRoyalties(
        uint256 tokenId,
        uint256 value,
        uint256 royalty,
        address creator,
        address feeRecipient
    ) internal {
        require(royalty <= 1000, "ERC2981Royalties: Too high");
        _royalties[tokenId][value] = CollectionRoyaltyInfo(
            uint16(royalty),
            creator,
            feeRecipient
        );
    }

    /// @inheritdoc	IERC2981Royalties
    function royaltyInfo(uint256 tokenId, uint256 value)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        CollectionRoyaltyInfo memory collectionRoyaltyInfo = _royalties[
            tokenId
        ][value];
        receiver = collectionRoyaltyInfo.feeRecipient;
        royaltyAmount = (value * collectionRoyaltyInfo.royalty) / 1000;
    }
}
