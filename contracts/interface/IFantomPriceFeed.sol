// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IFantomPriceFeed {
    function wFTM() external view returns (address);

    function getPrice(address) external view returns (int256, uint8);
}