// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IFantomTokenRegistry {
    function enabled(address) external returns (bool);
}