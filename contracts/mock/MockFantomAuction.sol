// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../FantomAuction.sol";

contract MockFantomAuction is FantomAuction {
    uint256 public hardhatBlockTimestamp;

    function hardhatTimestamp(uint256 t) public {
        hardhatBlockTimestamp = t;
    }

    function _getNow() internal view override returns (uint256) {
        return hardhatBlockTimestamp;
    }
}
