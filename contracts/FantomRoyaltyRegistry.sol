// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "./library/IERC2981Royalties.sol";

contract FantomRoyaltyRegistry is Ownable {
    address public royaltyMigrationManager;

    struct RoyaltyInfo {
        address receiver;
        uint16 royaltyPercent;
    }

    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

    // NftAddress -> TokenId -> RoyaltyInfo
    mapping(address => mapping(uint256 => RoyaltyInfo)) internal _royalties;

    modifier auth(address _collection, uint256 _tokenId) {
        require(
            IERC721(_collection).ownerOf(_tokenId) == _msgSender() ||
                _msgSender() == royaltyMigrationManager,
            "not authorized"
        );
        _;
    }

    function setDefaultRoyalty(
        address _collection,
        address _receiver,
        uint16 _royaltyPercent
    ) external onlyOwner {
        _setRoyalty(_collection, 0, _receiver, _royaltyPercent);
    }

    function setRoyalty(
        address _collection,
        uint256 _tokenId,
        address _receiver,
        uint16 _royaltyPercent
    ) external auth(_collection, _tokenId) {
        _setRoyalty(_collection, _tokenId, _receiver, _royaltyPercent);
    }

    function royaltyInfo(
        address _collection,
        uint256 _tokenId,
        uint256 _salePrice
    ) external view returns (address _receiver, uint256 _royaltyAmount) {
        if (IERC165(_collection).supportsInterface(_INTERFACE_ID_ERC2981)) {
            (_receiver, _royaltyAmount) = IERC2981Royalties(_collection)
                .royaltyInfo(_tokenId, _salePrice);
        } else {
            (_receiver, _royaltyAmount) = _royaltyInfo(
                _collection,
                _tokenId,
                _salePrice
            );
        }
    }

    function _setRoyalty(
        address _collection,
        uint256 _tokenId,
        address _receiver,
        uint16 _royaltyPercent
    ) internal {
        RoyaltyInfo memory royalty = _royalties[_collection][_tokenId];

        require(royalty.royaltyPercent == 0, "Royalty already set");
        require(_royaltyPercent <= 10000, "Royalty too high");

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

        if (royalty.receiver != address(0) && royalty.royaltyPercent != 0) {
            _receiver = royalty.receiver;
            _royaltyAmount = (_salePrice * royalty.royaltyPercent) / 10000;
        } else {
            royalty = _royalties[_collection][0]; // use collection-wide royalty

            if (royalty.receiver != address(0) && royalty.royaltyPercent != 0) {
                _receiver = royalty.receiver;
                _royaltyAmount = (_salePrice * royalty.royaltyPercent) / 10000;
            } else {
                _receiver = address(0);
                _royaltyAmount = 0;
            }
        }

        return (_receiver, _royaltyAmount);
    }

    /**
     @notice Update MigrationManager address
     @dev Only admin
     */
    function updateMigrationManager(address _royaltyMigrationManager)
        external
        onlyOwner
    {
        royaltyMigrationManager = _royaltyMigrationManager;
    }
}
