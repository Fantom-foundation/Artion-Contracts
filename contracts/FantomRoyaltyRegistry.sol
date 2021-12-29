// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "./library/ERC2981Base.sol";

contract FantomRoyaltyRegistry is Ownable, ERC2981Base {
    address royaltyMigrationManager;

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
        require(_royaltyPercent <= 10000, "royalty too high");

        _setRoyalty(_collection, 0, _receiver, _royaltyPercent);
    }

    function setRoyalty(
        address _collection,
        uint256 _tokenId,
        address _receiver,
        uint16 _royaltyPercent
    ) external auth(_collection, _tokenId) {
        require(_royaltyPercent <= 10000, "royalty too high");

        _setRoyalty(_collection, _tokenId, _receiver, _royaltyPercent);
    }

    function royaltyInfo(
        address _collection,
        uint256 _tokenId,
        uint256 _salePrice
    )
        external
        view
        override
        returns (address _receiver, uint256 _royaltyAmount)
    {
        (_receiver, _royaltyAmount) = _royaltyInfo(
            _collection,
            _tokenId,
            _salePrice
        );
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
