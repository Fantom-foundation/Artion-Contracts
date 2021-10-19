# Unit Tests for Fantom Artion Marketplace

This repo contains only the necessities to deploy a mock `ERC20`, `ERC721`, and `FantomAuction` contract on a local blockchain and test the `FantomAuction` contract with the supplied unit test

## Currently Included

Using `truffle`, `ganache`, `chai`, and `openzeppelin test-helpers` to run through a series of unit tests that:

- Mints test `ERC20` tokens to various users
- Mints test `ERC721` tokens to various users
- Approves the `FantomAuction.sol` contract for all transfers
- Tests the integrity of the `FantomAuction.sol` contract (like ensuring proper initialization)
- Creates test auctions by test user `seller`
- Places test bids on auctions by test users `bidder` and `winner`
- Cancels auctions currently running, that have ended, and have ended with bids below, above, and at reserve price
- Results successful auctions by test users `winner` and `seller`
- Checks to ensure assets are properly in escrow while auctions are live and bids are placed; and that assets are properly transferred upon outbids, cancels, failed and successful auctions
- Attempts various contract-breaking transactions from users `other` and `hacker` throughout the process

(Current unit test checks: `89`)

## Test Environment Modifications to Smart Contracts

This `FantomAuction.sol` contract has been modified in a few ways to allow for the test environment to properly run, temporarily disabled functionality isn't needed to test a functioning `FantomAuction.sol` contract. A list of of those changes are as follows:

- (POSSIBLY TESTING ONLY)(223) Changed `_payToken` require to != `address(0)` so that `_msgSender()` of `createAuction()` can set the `_payToken` they want their auction to run in
- (POSSIBLY TESTING ONLY)(512-520) Commented out a possibly redundant check to ensure `ownerTransferSuccess`, may be redundant after implementing `safeTransfer`
- (TESTING ONLY) Changed `minBidIncrement` to `25000000000000000000` for unit test environment
- (TESTING ONLY) Disabled auction contract fees on `resultAuction()`, required changing `price` from `int256` to `uint256` and assigning `price` to `payAmount`

## Development Fixes Found
The following changes were implemented in the `FantomAuction.sol` contract during unit testing development, these changes are considered fixes for the current `FantomAuction.sol` contract and aren't intended for test environment only:

- Updated `pragma solidity` to ^0.8.0 so contract functions with most recent `@openzeppelin` libraries
- Updated all `transfer` functions to `safeTransfer`
- Added import `ERC721Holder.sol` from `@openzeppelin` so auction contract can own (hold in escrow) auction assets
- Added modifier `onlyNotContract` to append to functions that don't allow contracts to call
- Added `payable` to `highestBid.bidder(_msgSender())` in `_placeBid` function

## Usage

Initialize your Truffle directory
```
npm install --save-dev truffle
```

Install the proper libraries
```
npm install --save-dev @openzeppelin/contracts
```
```
npm install --save-dev @openzeppelin/contracts-upgradeable
```
```
npm install --save-dev @openzeppelin/test-helpers
```
```
npm install --save-dev ganache-cli
```
```
npm install --save-dev chai
```

Run your blockchain deterministic
```
npx ganache-cli --deterministic
```
If you have issues with contract size, gas limits, etc. run the blockchain with an unlimited contract size
```
npx ganache-cli --deterministic --gasLimit=0x1fffffffffffff --allowUnlimitedContractSize -e 1000000000
```

Run the unit tests
```
npx truffle test
```

Console will output results, latest test returned:

```
Contract: FantomAuction
    √ 000) `MockERC20` tokens minted to users properly (2974ms)
    √ 001) `MockERC20` `approve` set to `FantomAuction` for all test users (3359ms)
    √ 002) `MockERC721` tokens minted to users properly (6049ms)
    √ 003) `MockERC721` `setApprovalForAll` set to `FantomAuction` for all test users (3494ms)
    √ 004) `owner` returns the initialized owner (2848ms)
    √ 005) cannot pause auction contract if not `owner` (773ms)
    √ 006) `FantomAuction` address registry set to `MockERC20` (668ms)
    √ 007) test auction created successfully for user `seller` (1249ms)
    √ 008) NFT successfully in escrow with auction contract (105ms)
    √ 009) created auction `seller` is `_owner` (113ms)
    √ 010) created auction `_payToken` is `MockERC20` (122ms)
    √ 011) created auction `_reservePrice` is `sellerReservePrice` (119ms)
    √ 012) created auction `_resulted` is `false` (97ms)
    √ 013) created auction `_minBid` is `0` (100ms)
    √ 014) `seller` cannot relist the same NFT while active auction exists (468ms)
    √ 015) cannot list auction if not owner of NFT (476ms)
    √ 016) `createAuction()` `_endTimestamp` cannot be `0` (449ms)
    √ 017) `createAuction()` `_endTimestamp` cannot be `1` (382ms)
    √ 018) `_endTimestamp` cannot be less than `_startTimestamp` (476ms)
    √ 019) `_endTimestamp` must be greater than 5 minutes past `_startTimestamp` (468ms)
    √ 020) cannot cancel an auction not owned by the auction contract (498ms)
    √ 021) cannot cancel an auction you do not own (542ms)
    √ 022) test auction cancelled successfully by user `seller` (1069ms)
    √ 023) cannot cancel an auction that has already been cancelled (381ms)
    √ 024) cancelled auction NFT successfully transferred ownership back to `seller` (75ms)
    √ 025) successfully relisted auction for `seller` `_tokenId(4)` after cancelling (1266ms)
    √ 026) cannot place a bid before auction starts (446ms)
    √ 027) NFT successfully in escrow with auction contract after relisting by `seller` (208ms)
    √ 028) cannot place a bid of zero (414ms)
    √ 029) cannot place bids below `minBidIncrement` (492ms)
    √ 030) bid successfully placed at `minBidIncrement` (3552ms)
    √ 031) `MockERC20` tokens properly transferred to auction contract (121ms)
    √ 032) auction contract has the correct amount of `MockERC20` tokens (111ms)
    √ 033) also cannot place bids below `minBidIncrement` after bid placed (446ms)
    √ 034) cannot cancel active auction that you dont own (426ms)
    √ 035) auction contract cannot cancel an auction they dont own (386ms)
    √ 036) successfully cancelled auction that has bids below reserve price as `seller` (1234ms)
    √ 037) `MockERC20` tokens properly refunded to bidder after cancelled auction (140ms)
    √ 038) successfully relisted auction for `seller` `_tokenId(4)` after cancelling auction with bids (1150ms)
    √ 039) NFT successfully in escrow with auction contract after relisting by `seller` (271ms)
    √ 040) bid successfully placed at `minBidIncrement` by `bidder` (3640ms)
    √ 041) auction contract has the correct amount of `MockERC20` tokens (95ms)
    √ 042) previous bidder `bidder` successfully outbid by `other` (4371ms)
    √ 043) auction contract has the correct amount of `MockERC20` tokens (96ms)
    √ 044) previous bidder `other` successfully outbid by `bidder` (4256ms)
    √ 045) auction contract has the correct amount of `MockERC20` tokens (110ms)
    √ 046) `MockERC20` tokens properly refunded to bidder after being outbid and placing new bid (139ms)
    √ 047) `MockERC20` tokens properly transferred back to `other` after `bidder` outbid `other` (129ms)
    √ 048) cannot result an auction that hasnt ended as `seller` (462ms)
    √ 049) cannot result an auction that hasnt ended as `other` (572ms)
    √ 050) cannot result a finished auction that ended with bids below the reserve price (430ms)
    √ 051) cannot result a finished auction that ended with bids below the reserve price as non-owner (405ms)
    √ 052) cannot cancel an auction that has ended with bids below reserve price as `bidder` or `winner` (must be arranged via resultFailedAuction()) (472ms)
    √ 053) successfully cancelled auction that ended with bids below reserve price as `seller` (1265ms)
    √ 054) cancelled auction NFT successfully transferred ownership back to `seller` (138ms)
    √ 055) all users and auction contract have the correct amount of MockERC20 tokens (922ms)
    √ 056) successfully relisted auction for `seller` `_tokenId(4)` after cancelling ended auction with bids (1267ms)
    √ 057) `_tokenId(4)` successfully in escrow with auction contract after relisting by `seller` (238ms)
    √ 058) bid successfully placed at `bidderBidAmountMinimum` by `bidder` (3446ms)
    √ 059) bid successfully placed at `sellerReservePrice` by `winner` (4419ms)
    √ 060) auction contract has the correct amount of `MockERC20` tokens (256ms)
    √ 061) cannot place a bid after auction has ended (438ms)
    √ 062) cannot cancel an auction that has ended with bids >= reserve price as `seller` (493ms)
    √ 063) cannot cancel an auction that has ended with bids >= reserve price as `other` (496ms)
    √ 064) cannot cancel an auction that has ended with bids >= reserve price as `winner` (418ms)
    √ 065) cannot resultFailedAuction() an auction that has met reserve price as `seller` (475ms)
    √ 066) cannot resultFailedAuction() an auction that has met reserve price as `winner` (497ms)
    √ 067) cannot resultFailedAuction() an auction that has met reserve price as `other` (466ms)
    √ 068) cannot relist an un-resulted auction that has successfully ended as `seller` (430ms)
    √ 069) cannot relist an un-resulted auction that has successfully ended as `other` (477ms)
    √ 070) cannot result a successful auction as `other` (554ms)
    √ 071) test auction `_tokenId(4)` successfully resulted by `seller` (1545ms)
    √ 072) cannot result an auction that has already been resulted as `seller` (431ms)
    √ 073) cannot result an auction that has already been resulted as `other` (478ms)
    √ 074) cannot result an auction that has already been resulted as `winner` (434ms)
    √ 075) `seller` cannot relist an auction they sold and resulted already (463ms)
    √ 076) `other` cannot relist a sold and resulted auction they didnt win (527ms)
    √ 077) cannot cancel an auction that has ended successfully and has been resulted as `seller` (433ms)
    √ 078) cannot cancel an auction that has ended successfully and has been resulted as `other` (426ms)
    √ 079) all users and auction contract have the correct amount of MockERC20 tokens after a successful auction (921ms)
    √ 080) successfully listed auction for `seller` `_tokenId(3)` (1057ms)
    √ 081) `_tokenId(4)` successfully in escrow with auction contract after relisting by `seller` (269ms)
    √ 082) bid successfully placed at `bidderBidAmountMinimum` by `bidder` (3364ms)
    √ 083) bid successfully placed at `sellerReservePrice` by `winner` (4296ms)
    √ 084) auction contract has the correct amount of `MockERC20` tokens (237ms)
    √ 085) test auction `_tokenId(3)` successfully resulted by `winner` (1425ms)
    √ 086) `_tokenId(3)` successfully transferred from auction contract (escrow) to `winner` after resulting (143ms)
    √ 087) `_tokenId(4)` successfully transferred from auction contract (escrow) to `winner` after resulting (142ms)
    √ 088) all users and auction contract have the correct amount of MockERC20 tokens after (2) successful auctions (810ms)


  89 passing (2m)
```
