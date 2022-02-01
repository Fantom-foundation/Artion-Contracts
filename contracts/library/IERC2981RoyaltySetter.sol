pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface IERC2981RoyaltySetter is IERC165 {
    // bytes4(keccak256('setDefaultRoyalty(address,uint16)')) == 0x4331f639
    // bytes4(keccak256('setTokenRoyalty(uint256,address,uint16)')) == 0x78db6c53
    // => Interface ID = 0x4331f639 ^ 0x78db6c53 == 0x3bea9a6a

    // Set collection-wide default royalty.
    function setDefaultRoyalty(address _receiver, uint16 _royaltyPercent) external;

    // Set royalty for the given token.
    function setTokenRoyalty(uint256 _tokenId, address _receiver, uint16 _royaltyPercent) external;
}
