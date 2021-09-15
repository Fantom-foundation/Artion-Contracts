// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IFantomAddressRegistry {
    function artion() external view returns (address);

    function marketplace() external view returns (address);

    function bundleMarketplace() external view returns (address);

    function tokenRegistry() external view returns (address);
}