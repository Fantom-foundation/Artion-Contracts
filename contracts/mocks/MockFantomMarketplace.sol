// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../FantomMarketplace.sol";

contract MockFantomMarketplace is FantomMarketplace {
    uint256 public time;

    function setTime(uint256 t) public {
        time = t;
    }

    function increaseTime(uint256 t) public {
        time += t;
    }

    function _getNow() internal override view returns (uint256) {
        return time;
    }
}
