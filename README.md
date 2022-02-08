# Smart contracts for Fantom Artion Marketplace

## Running tests

1. Create `.env` file with your wallet address:
```
echo 'PRIVATE_KEY=(your wallet address without 0x here)' > .env
```

2. Run a Hardhat node:

```
npx hardhat node
```

3. Start the tests in another terminal:

```
npx hardhat test
```

