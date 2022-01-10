// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../FantomAuction.sol";

contract MockFantomAuction is FantomAuction {
    // Overriding the `minBidIncrement` for testing environment only, 25 is arbitrary
    constructor() public {
        minBidIncrement = 25000000000000000000;
    }

    // `hardhatBlockTimestamp` keeps track of time as we change time throughout the Hardhat
    // unit test to test out time-constrained scenarios
    uint256 public hardhatBlockTimestamp;

    function hardhatTimestamp(uint256 t) public {
        hardhatBlockTimestamp = t;
    }

    function _getNow() internal view override returns (uint256) {
        return hardhatBlockTimestamp;
    }
}
