// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./FantomArtTradablePrivate.sol";
import "./FantomArtFactory.sol";

contract FantomArtFactoryPrivate is FantomArtFactory {
    /**
    @notice Create FantomNFTTradablePrivate instance
    */
    function createInstance(
        address _auction,
        address _marketplace,
        address _bundleMarketplace,
        uint256 _mintFee,
        address payable _feeRecipient,
        uint256 _platformFee
    ) public internal view returns (FantomNFTTradablePrivate) {
        return new FantomNFTTradablePrivate(
            _auction,
            _marketplace,
            _bundleMarketplace,
            _mintFee,
            _feeRecipient,
            _platformFee
        );
    }
}
