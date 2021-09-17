// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IFantomBundleMarketplace {
    function validateItemSold(
        address,
        uint256,
        uint256
    ) external;
}