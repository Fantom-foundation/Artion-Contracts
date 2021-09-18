const {
  FANTOM_ADDRESS_REGISTRY,
  WRAPPED_FTM_MAINNET,
  WRAPPED_FTM_TESTNET
} = require('./constants');

async function main() {
  const Contract = await ethers.getContractFactory('FantomPriceFeed');
  const contract = await Contract.deploy(
    FANTOM_ADDRESS_REGISTRY,
    WRAPPED_FTM_MAINNET
  );

  await contract.deployed();

  console.log('FantomPriceFeed deployed to', contract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
