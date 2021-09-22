// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IFantomAddressRegistry {
    function artion() external view returns (address);

    function marketplace() external view returns (address);
    
    function offerMarketplace() external view returns (address);

    function bundleMarketplace() external view returns (address);

    function offerBundleMarketplace() external view returns (address);

    function factory() external view returns (address);

    function privateFactory() external view returns (address);

    function artFactory() external view returns (address);

    function privateArtFactory() external view returns (address);

    function tokenRegistry() external view returns (address);

    function priceFeed() external view returns (address);

     function auction() external view returns (address);

}