// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC2981.sol";

/// @dev This is a contract used to add ERC2981 support to ERC721 and 1155
abstract contract ERC2981PerTokenRoyalties is ERC2981 {
    mapping(uint256 => RoyaltyInfo) internal _royalties;

    function setDefaultRoyalty(address _recipient, uint16 _value)
        external
        override
    {
        _setDefaultRoyalty(_recipient, _value);
    }

    function setTokenRoyalty(
        uint256 _tokenId,
        address _receiver,
        uint16 _value
    ) external override {
        _setTokenRoyalty(_tokenId, _receiver, _value);
    }

    /// @dev Sets token royalties
    /// @param tokenId the token id fir which we register the royalties
    /// @param recipient recipient of the royalties
    /// @param value percentage (using 2 decimals - 10000 = 100, 0 = 0)
    function _setTokenRoyalty(
        uint256 tokenId,
        address recipient,
        uint256 value
    ) internal {
        require(value <= 10000, "Royalty Too high");
        _royalties[tokenId] = RoyaltyInfo(recipient, uint24(value));
    }

    /// @dev Sets collection-wide royalty
    /// @param recipient recipient of the royalties
    /// @param value percentage (using 2 decimals - 10000 = 100, 0 = 0)
    function _setDefaultRoyalty(address recipient, uint256 value) internal {
        require(value <= 10000, "Royalty: Too high");
        _royalties[0] = RoyaltyInfo(recipient, uint24(value));
    }

    function royaltyInfo(uint256 _tokenId, uint256 _salePrice)
        external
        view
        override
        returns (address _receiver, uint256 _royaltyAmount)
    {
        RoyaltyInfo memory royalty = _royalties[_tokenId];

        if (royalty.recipient == address(0)) {
            royalty = _royalties[0]; // use collection-wide royalty
        }

        _receiver = royalty.recipient;
        _royaltyAmount = (_salePrice * royalty.amount) / 10000;

        return (_receiver, _royaltyAmount);
    }
}
