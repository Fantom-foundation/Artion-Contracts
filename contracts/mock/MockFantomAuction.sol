// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../FantomAuction.sol";

contract MockFantomAuction is FantomAuction {
    uint256 public time;

    function setTime(uint256 t) public {
        time = t;
    }

    function increaseTime(uint256 t) public {
        time += t;
    }

    function _getNow() internal view override returns (uint256) {
        return time;
    }
}
