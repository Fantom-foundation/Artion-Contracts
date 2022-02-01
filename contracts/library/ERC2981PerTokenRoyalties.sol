// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "./ERC2981.sol";

/// @dev This is a contract used to add ERC2981 support to ERC721 and 1155
abstract contract ERC2981PerTokenRoyalties is ERC2981 {
    // map of known royalties; tokenID => RoyaltyInfo; #0 => collection-wide royalty
    mapping(uint256 => RoyaltyInfo) internal _royalties;

    /// @dev Sets token royalties
    /// @param _tokenId the token id for which we register the royalties
    /// @param _recipient recipient of the royalties
    /// @param _value percentage (using 2 decimals - 10000 = 100, 0 = 0)
    function _setTokenRoyalty(
        uint256 _tokenId,
        address _recipient,
        uint256 _value
    ) internal {
        require(_value <= 10000, "ERC2981PerTokenRoyalties: Royalty Too high");

        RoyaltyInfo memory royalty = _royalties[_tokenId];
        require(royalty.recipient == address(0), "ERC2981PerTokenRoyalties: Royalty already set");

        _royalties[_tokenId] = RoyaltyInfo(_recipient, uint24(_value));
    }

    /// @dev Sets a new royalty recipient for the given tokenID. Only existing recipient can make the change.
    function setTokenRoyaltyRecipient(uint256 _tokenId, address _recipient) external {
        // the royalty must be set and the caller must be the current recipient of the royalty
        RoyaltyInfo memory royalty = _royalties[_tokenId];
        require(royalty.recipient != address(0) && royalty.recipient == msg.sender, "ERC2981PerTokenRoyalties: Current recipient only");

        _royalties[_tokenId].recipient = _recipient;
    }

    /// @dev Sets collection-wide royalty
    /// @param _recipient recipient of the royalties
    /// @param _value percentage (using 2 decimals - 10000 = 100, 0 = 0)
    function _setDefaultRoyalty(address _recipient, uint256 _value) internal {
        require(_value <= 10000, "ERC2981PerTokenRoyalties: Royalty too high");
        _royalties[0] = RoyaltyInfo(_recipient, uint24(_value));
    }

    /// @dev Provides value and recipient for a royalty of the given token and for the given price.
    /// @param _tokenId the token id fir which we register the royalties
    /// @param _salePrice The base amount used to calculate the royalty.
    function royaltyInfo(uint256 _tokenId, uint256 _salePrice) external view override returns (address _receiver, uint256 _royaltyAmount) {
        RoyaltyInfo memory royalty = _royalties[_tokenId];

        // fallback to collection-wide royalty, if set
        if (royalty.recipient == address(0)) {
            royalty = _royalties[0];
        }

        // do the math and return results
        _receiver = royalty.recipient;
        _royaltyAmount = (_salePrice * royalty.amount) / 10000;
        return (_receiver, _royaltyAmount);
    }
}
