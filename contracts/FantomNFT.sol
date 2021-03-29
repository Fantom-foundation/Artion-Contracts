// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/GSN/Context.sol";


contract FantomNFT is ERC721("Fantom NFT", "FNFT") {

    /// @dev Events of the contract
    event Minted(
        uint256 tokenId,
        address beneficiary,
        string tokenUri,
        address minter
    );

    /// @dev current max tokenId
    uint256 public tokenIdPointer;

    /// @dev TokenID -> Creator address
    mapping(uint256 => address) public creators;

    /// @dev TokenID -> Primary Ether Sale Price in Wei
    mapping(uint256 => uint256) public primarySalePrice;

    /**
     @notice Mints a NFT AND when minting to a contract checks if the beneficiary is a 721 compatible
     @param _beneficiary Recipient of the NFT
     @param _tokenUri URI for the token being minted
     @return uint256 The token ID of the token that was minted
     */
    function mint(address _beneficiary, string calldata _tokenUri) external returns (uint256) {

        // Valid args
        _assertMintingParamsValid(_tokenUri, _msgSender());

        tokenIdPointer = tokenIdPointer.add(1);
        uint256 tokenId = tokenIdPointer;

        // Mint token and set token URI
        _safeMint(_beneficiary, tokenId);
        _setTokenURI(tokenId, _tokenUri);

        // Associate garment designer
        creators[tokenId] = _msgSender();
        
        emit Minted(tokenId, _beneficiary, _tokenUri, _msgSender());

        return tokenId;
    }

    /**
     @notice Burns a DigitalaxGarmentNFT, releasing any composed 1155 tokens held by the token itself
     @dev Only the owner or an approved sender can call this method
     @param _tokenId the token ID to burn
     */
    function burn(uint256 _tokenId) external {
        address operator = _msgSender();
        require(ownerOf(_tokenId) == operator || isApproved(_tokenId, operator), "Only garment owner or approved");

        // Destroy token mappings
        _burn(_tokenId);

        // Clean up designer mapping
        delete creators[_tokenId];
        delete primarySalePrice[_tokenId];
    }

    function _extractIncomingTokenId() internal pure returns (uint256) {
        // Extract out the embedded token ID from the sender
        uint256 _receiverTokenId;
        uint256 _index = msg.data.length - 32;
        assembly {_receiverTokenId := calldataload(_index)}
        return _receiverTokenId;
    }

    /////////////////
    // View Methods /
    /////////////////

    /**
     @notice View method for checking whether a token has been minted
     @param _tokenId ID of the token being checked
     */
    function exists(uint256 _tokenId) external view returns (bool) {
        return _exists(_tokenId);
    }


    /**
     * @dev checks the given token ID is approved either for all or the single token ID
     */
    function isApproved(uint256 _tokenId, address _operator) public view returns (bool) {
        return isApprovedForAll(ownerOf(_tokenId), _operator) || getApproved(_tokenId) == _operator;
    }

    /////////////////////////
    // Internal and Private /
    /////////////////////////

    /**
     @notice Checks that the URI is not empty and the designer is a real address
     @param _tokenUri URI supplied on minting
     @param _designer Address supplied on minting
     */
    function _assertMintingParamsValid(string calldata _tokenUri, address _designer) pure internal {
        require(bytes(_tokenUri).length > 0, "_assertMintingParamsValid: Token URI is empty");
        require(_designer != address(0), "_assertMintingParamsValid: Designer is zero address");
    }
}