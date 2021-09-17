// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IFantomAuction {
    function getAuction(address _nftAddress, uint256 _tokenId)
        external
        view
        returns (
            address _owner,
            address _payToken,
            uint256 _reservePrice,
            uint256 _startTime,
            uint256 _endTime,
            bool _resulted
        );
    
    function isPaused() external view returns(bool);
}