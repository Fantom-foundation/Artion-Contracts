// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./library/ERC1155.sol";
import "./library/ERC1155MintBurn.sol";
import "./library/ERC1155Metadata.sol";
import "./FantomArtTradable.sol";

contract OwnableDelegateProxy {}

contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

/**
 * @title FantomArtTradablePrivate
 * FantomArtTradablePrivate - ERC1155 contract that whitelists an operator address,
 * has mint functionality, and supports useful standards from OpenZeppelin,
  like _exists(), name(), symbol(), and totalSupply()
 */
contract FantomArtTradablePrivate is FantomArtTradable
{
    /**
     * @dev Check if it is mintable
     */
    function isMintable() internal view onlyOwner returns (bool) {
        return true;
    }
}
