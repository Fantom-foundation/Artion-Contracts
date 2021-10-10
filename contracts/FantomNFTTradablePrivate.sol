// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./FantomNFTTradable.sol";

/**
 * @title FantomNFTTradablePrivate
 * FantomNFTTradablePrivate - ERC721 contract that whitelists a trading address, and has minting functionality.
 */
contract FantomNFTTradablePrivate is FantomNFTTradable {
    /**
     * @dev Check if it is mintable
     */
    function isMintable() internal view onlyOwner returns (bool) {
        return true;
    }
}
