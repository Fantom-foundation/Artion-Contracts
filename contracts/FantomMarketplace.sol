// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;


import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract FantomMarketplace is Context {

    /// @notice Events for the contract
    event ItemListed(
        address indexed owner,
        address indexed nft,
        uint256 tokenId,
        uint256 quantity,
        uint256 pricePerItem,
        uint256 startingTime,
        bool isPrivate,
        address allowedAddress
    );

    /// @notice Structure for listed items
    struct Listing {
        uint256 tokenId;
        uint256 quantity;
        uint256 pricePerItem;
        uint256 startingTime;
        address allowedAddress;
    }

    /// @notice Owner -> NftAdress -> Listing item
    mapping(address => mapping(address => Listing)) public listings;

    
    /// @notice Method for listing NFT
    /// @param _nftAddress Address of NFT contract
    /// @param _tokenId Token ID of NFT
    /// @param _quantity token amount to list (needed for ERC-1155 NFTs, set as 1 for ERC-721)
    /// @param _pricePerItem sale price for each iteam
    /// @param _startingTime scheduling for a future sale
    /// @param _allowedAddress optional param for private sale
    function listItem(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _quantity,
        uint256 _pricePerItem,
        uint256 _startingTime,
        address _allowedAddress
    ) external {
        IERC721 nft = IERC721(_nftAddress);
        require(nft.ownerOf(_tokenId) == _msgSender(), "Must be owner of NFT.");
        require(nft.isApprovedForAll(_msgSender(), address(this)), "Must be approved before list.");

        listings[_msgSender()][_nftAddress] = Listing(
            _tokenId,
            _quantity,
            _pricePerItem,
            _startingTime,
            _allowedAddress
        );
        emit ItemListed(
            _msgSender(),
            _nftAddress,
            _tokenId,
            _quantity,
            _pricePerItem,
            _startingTime,
            _allowedAddress == address(0x0),
            _allowedAddress
        );
    }
}
