// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import "./IERC2981Royalties.sol";

/// @dev This is a contract used to add ERC2981 support to ERC721 and 1155
abstract contract ERC2981Base is ERC165, IERC2981Royalties {
    struct RoyaltyInfo {
        address receiver;
        uint16 royaltyPercent;
    }

    mapping(address => mapping(uint256 => RoyaltyInfo)) internal _royalties;

    function _setRoyalty(
        address _collection,
        uint256 _tokenId,
        address _receiver,
        uint16 _royaltyPercent
    ) internal {
        _royalties[_collection][_tokenId] = RoyaltyInfo(
            _receiver,
            _royaltyPercent
        );
    }

    function _royaltyInfo(
        address _collection,
        uint256 _tokenId,
        uint256 _salePrice
    ) internal view returns (address _receiver, uint256 _royaltyAmount) {
        RoyaltyInfo memory royalty = _royalties[_collection][_tokenId];

        _receiver = royalty.receiver;
        _royaltyAmount = (_salePrice * royalty.royaltyPercent) / 10000;
    }
}
