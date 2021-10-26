# FantomAuction v2 Hardhat Unit Test

This repo contains only the necessities to deploy a mock `ERC20`, `ERC721`, and `FantomAuction` contract on a local blockchain and test the `FantomAuction` contract with the supplied unit test

## Currently Included

Using `hardhat` and a variety of unit-testing libraries such as `chai` to run through a series of unit tests that:

- Mints test `ERC20` tokens to various users
- Mints test `ERC721` tokens to various users
- Approves the `FantomAuction.sol` contract for all transfers
- Tests the integrity of the `FantomAuction.sol` contract (like ensuring proper initialization)
- Creates test auctions by test user `seller`
- Simulates passage of time on the blockchain to test functions at various stages of time
- Places test bids on auctions by test users `bidder` and `winner` and tests `withdrawBid`
- Cancels auctions currently running, that have ended, and have ended with bids below, above, and at reserve price
- Results successful auctions by test users `winner` and `seller`
- Tests the various update-related functions provided to the `seller`
- Checks to ensure assets are properly in escrow while auctions are live and bids are placed; and that assets are properly transferred upon outbids, cancels, failed and successful auctions
- Attempts various contract-breaking transactions from users `other` and `hacker` throughout the process

(Current unit test checks: `101`)

## Test Environment Modifications to Smart Contracts

This `FantomAuction.sol` contract has been modified in a few ways to allow for the test environment to properly run, temporarily disabled functionality isn't needed to test a functioning `FantomAuction.sol` contract. A list of of those changes are as follows:

- (POSSIBLY TESTING ONLY)(259) Changed `_payToken` require to != `address(0)` so that `_msgSender()` of `createAuction()` can set the `_payToken` they want their auction to run in
- (POSSIBLY TESTING ONLY)(573-581) Commented out a possibly redundant check to ensure `ownerTransferSuccess`, may be redundant after implementing `safeTransfer`
- (TESTING ONLY)(157) Changed `minBidIncrement` to `25000000000000000000` for unit test environment
- (TESTING ONLY)(530-570)(593-597) Disabled auction contract fees on `resultAuction()`, required changing `price` from `int256` to `uint256` and assigning `price` to `payAmount`
- (TESTING ONLY)(177)(215-219) All calls to `_getNow()` are temporarily replaced with a global variable `hardhatBlockTimestamp` that is used throughout the Hardhat unit test. This was done as a way to keep track of current block.timestamp while the unit test simulates the passage of time to test different functions at different stages of time (I.E. ensuring a person cannot bid on an auction after it has ended or before it starts)

## Development Fixes Found
The following changes were implemented in the `FantomAuction.sol` contract during unit testing development, these changes are considered fixes for the current `FantomAuction.sol` contract and aren't intended for test environment only:

- Updated `pragma solidity` to ^0.8.0 so contract functions with most recent `@openzeppelin` libraries
- Updated all `transfer` functions to `safeTransfer`
- Added import `ERC721Holder.sol` from `@openzeppelin` so auction contract can own (hold in escrow) auction assets
- Added modifier `onlyNotContract` to append to functions that don't allow contracts to call
- Added `payable` to `highestBid.bidder(_msgSender())` in `_placeBid` function

## Usage

Clone this repo to your local machine

Install dependencies:
```
npm install
```

Run your hardhat node in a new terminal
```
npx hardhat node
```

Run the unit test
```
npx hardhat test
```

Console will output results, latest test returned:

```
Contract: FantomAuction
    √ 000) `MockERC20` tokens minted to users properly (117ms)
    √ 001) `MockERC20` `approve` set to `FantomAuction` for all test users (136ms)
    √ 002) `MockERC721` tokens minted to users properly (172ms)
    √ 003) `MockERC721` `setApprovalForAll` set to `FantomAuction` for all test users (117ms)
    √ 004) `owner` returns the initialized owner
    √ 005) cannot pause auction contract if not `owner`
    √ 006) `FantomAuction` address registry set to `MockERC20`
    √ 007) test auction created successfully for user `seller` (52ms)
    √ 008) NFT successfully in escrow with auction contract
    √ 009) created auction `seller` is `_owner`
    √ 010) created auction `_payToken` is `MockERC20`
    √ 011) created auction `_reservePrice` is `sellerReservePrice`
    √ 012) created auction `_resulted` is `false`
    √ 013) created auction `_minBid` is `0`
    √ 014) `seller` cannot relist the same NFT while active auction exists
    √ 015) cannot list auction if not owner of NFT
    √ 016) `createAuction()` `_endTimestamp` cannot be `0`
    √ 017) `createAuction()` `_endTimestamp` cannot be `1`
    √ 018) `_endTimestamp` cannot be less than `_startTimestamp`
    √ 019) `_endTimestamp` must be greater than 5 minutes past `_startTimestamp`
    √ 020) cannot cancel an auction not owned by the auction contract
    √ 021) cannot cancel an auction you do not own
    √ 022) test auction cancelled successfully by user `seller`
    √ 023) cannot cancel an auction that has already been cancelled
    √ 024) cancelled auction NFT successfully transferred ownership back to `seller`
    √ 025) successfully relisted auction for `seller` `_tokenId(4)` after cancelling
    √ 026) cannot place a bid before auction starts
    √ blockchain time increased 100 seconds
    √ blockchain time increased 100 seconds
    √ 027) NFT successfully in escrow with auction contract after relisting by `seller`
    √ 028) cannot place a bid of zero
    √ 029) cannot place bids below `minBidIncrement`
    √ 030) bid successfully placed at `minBidIncrement` (39ms)
    √ 031) `MockERC20` tokens properly transferred to auction contract
    √ 032) auction contract has the correct amount of `MockERC20` tokens
    √ 033) also cannot place bids below `minBidIncrement` after bid placed
    √ 034) cannot cancel active auction that you dont own
    √ 035) auction contract cannot cancel an auction they dont own
    √ 036) successfully cancelled auction that has bids below reserve price as `seller`
    √ 037) `MockERC20` tokens properly refunded to bidder after cancelled auction
    √ 038) successfully relisted auction for `seller` `_tokenId(4)` after cancelling auction with bids (48ms)
    √ blockchain time increased 50 seconds
    √ blockchain time increased 50 seconds
    √ 039) NFT successfully in escrow with auction contract after relisting by `seller`
    √ 040) bid successfully placed at `minBidIncrement` by `bidder` (40ms)
    √ 041) auction contract has the correct amount of `MockERC20` tokens
    √ 042) previous bidder `bidder` successfully outbid by `other`
    √ 043) auction contract has the correct amount of `MockERC20` tokens
    √ 044) previous bidder `other` successfully outbid by `bidder`
    √ 045) auction contract has the correct amount of `MockERC20` tokens
    √ 046) `MockERC20` tokens properly refunded to bidder after being outbid and placing new bid
    √ 047) `MockERC20` tokens properly transferred back to `other` after `bidder` outbid `other`
    √ 048) cannot result an auction that hasnt ended as `seller`
    √ 049) cannot result an auction that hasnt ended as `other`
    √ blockchain time increased 500 seconds
    √ blockchain time increased 500 seconds
    √ 050) cannot result a finished auction that ended with bids below the reserve price
    √ 051) cannot result a finished auction that ended with bids below the reserve price as non-owner
    √ 052) cannot cancel an auction that has ended with bids below reserve price as `bidder` or `winner` (must be arranged via resultFailedAuction())
    √ 053) successfully cancelled auction that ended with bids below reserve price as `seller` (42ms)
    √ 054) cancelled auction NFT successfully transferred ownership back to `seller`
    √ 055) all users and auction contract have the correct amount of MockERC20 tokens
    √ 056) successfully relisted auction for `seller` `_tokenId(4)` after cancelling ended auction with bids (40ms)
    √ blockchain time increased 50 seconds
    √ blockchain time increased 50 seconds
    √ 057) `_tokenId(4)` successfully in escrow with auction contract after relisting by `seller`
    √ 058) bid successfully placed at `bidderBidAmountMinimum` by `bidder`
    √ 059) bid successfully placed at `sellerReservePrice` by `winner`
    √ blockchain time increased 500 seconds
    √ blockchain time increased 500 seconds
    √ 061) cannot place a bid after auction has ended
    √ 062) cannot cancel an auction that has ended with bids >= reserve price as `seller`
    √ 063) cannot cancel an auction that has ended with bids >= reserve price as `other`
    √ 064) cannot cancel an auction that has ended with bids >= reserve price as `winner`
    √ 065) cannot resultFailedAuction() an auction that has met reserve price as `seller`
    √ 066) cannot resultFailedAuction() an auction that has met reserve price as `winner`
    √ 067) cannot resultFailedAuction() an auction that has met reserve price as `other`
    √ 068) cannot relist an un-resulted auction that has successfully ended as `seller`
    √ 069) cannot relist an un-resulted auction that has successfully ended as `other`
    √ 070) cannot result a successful auction as `other`
    √ 071) test auction `_tokenId(4)` successfully resulted by `seller`
    √ 072) cannot result an auction that has already been resulted as `seller`
    √ 073) cannot result an auction that has already been resulted as `other`
    √ 074) cannot result an auction that has already been resulted as `winner`
    √ 075) `seller` cannot relist an auction they sold and resulted already
    √ 076) `other` cannot relist a sold and resulted auction they didnt win
    √ 077) cannot cancel an auction that has ended successfully and has been resulted as `seller`
    √ 078) cannot cancel an auction that has ended successfully and has been resulted as `other`
    √ 079) all users and auction contract have the correct amount of MockERC20 tokens after a successful auction
    √ 080) successfully listed auction for `seller` `_tokenId(3)` (45ms)
    √ blockchain time increased 50 seconds
    √ blockchain time increased 50 seconds
    √ 081) `_tokenId(3)` successfully in escrow with auction contract after relisting by `seller`
    √ 082) bid successfully placed at `bidderBidAmountMinimum` by `bidder`
    √ 083) bid successfully placed at `sellerReservePrice` by `winner` (46ms)
    √ blockchain time increased 500 seconds
    √ blockchain time increased 500 seconds
    √ 084) auction contract has the correct amount of `MockERC20` tokens
    √ 085) test auction `_tokenId(3)` successfully resulted by `winner`
    √ 086) `_tokenId(3)` successfully transferred from auction contract (escrow) to `winner` after resulting
    √ 087) `_tokenId(4)` successfully transferred from auction contract (escrow) to `winner` after resulting
    √ 088) all users and auction contract have the correct amount of MockERC20 tokens after (2) successful auctions
    √ 089) successfully listed auction for `seller` `_tokenId(2)`
    √ blockchain time increased 500 seconds
    √ 090) bid successfully placed at `bidderBidAmountMinimum` by `bidder`
    √ 091) cannot withdraw a bid if youre not the current highest bidder
    √ 092) `bidder` cannot withdraw a bid before auction ends
    √ 093) cannot withdraw a bid if youre not the current highest bidder
    √ 094) `seller` cannot raise the auction reserve price
    √ 095) `seller` successfully lowered reserve price to `sellerNewReservePrice`
    √ 096) bid successfully placed at `sellerNewReservePrice` by `bidder`
    √ blockchain time increased 604250 seconds
    √ 097) `bidder` cannot withdraw a bid immediately before auction ends
    √ blockchain time increased 43000 seconds
    √ 098) `bidder` cannot withdraw a bid immediately before grace window
    √ blockchain time increased 500 seconds
    √ blockchain time increased 500 seconds
    √ 099 `bidder` successfully withdrew bid once grace window started
    √ 100) cannot result an auction that ended and had the highest bidder withdraw
    √ 101) successfully cancelled auction that ended successfully but had the bidder withdraw
    √ 102) NFT successfully transferred back to seller


  121 passing (4s)

```
