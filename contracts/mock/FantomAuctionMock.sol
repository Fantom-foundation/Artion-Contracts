// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../FantomAuction.sol";

contract FantomAuctionMock is FantomAuction {
    uint256 public nowOverride;

    constructor(address payable _platformReserveAddress) public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal view override returns (uint256) {
        return nowOverride;
    }
}
