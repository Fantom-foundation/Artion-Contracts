# Smart contracts for Fantom Artion Marketplace

## Running tests

1. Create `.env` file with your private key: (Metamask - Account details - Export private key)
```
echo 'PRIVATE_KEY=(your private key without 0x here)' > .env
```
(Relevant for deploing contracts only - any hex number is sufficient to run tests)

2. Run a Hardhat node:

```
npx hardhat node
```

3. Start the tests in another terminal:

```
npx hardhat test
```

## Deploying contracts

Run appropriate deployment script on desired network:
```
npx hardhat run scripts/4_deploy_auction.js --network mainnet
```

Generate flatten source file for FTMscan contract verification:
```
npx hardhat flatten contracts/FantomAuction.sol >flatten/FantomAuction.sol
```
*You will have to remove redundant SPDX headers, verification will fail if you keep multiple SPDX headers in one file.

