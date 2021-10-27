// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockERC721 is ERC721 {

    constructor (string memory _name, string memory _symbol) ERC721(_name, _symbol) {}

    uint256 public _tokenId;

    function mint(address _to) public {
        super._mint(_to, _tokenId);
        super.tokenURI(_tokenId);
        _tokenId++;
    }
}