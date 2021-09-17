const {
  TREASURY_ADDRESS,
  AUCTION,
  MARKETPLACE,
  BUNDLE_MARKETPLACE,
  PLATFORM_FEE
} = require('./constants');

async function main() {
  const Factory = await ethers.getContractFactory('FantomNFTFactory');
  const factory = await Factory.deploy(
    AUCTION,
    MARKETPLACE,
    BUNDLE_MARKETPLACE,
    '10000000000000000000',
    TREASURY_ADDRESS,
    '50000000000000000000'
  );
  await factory.deployed();
  console.log('FantomNFTFactory deployed to:', factory.address);

  const PrivateFactory = await ethers.getContractFactory(
    'FantomNFTFactoryPrivate'
  );
  const privateFactory = await PrivateFactory.deploy(
    AUCTION,
    MARKETPLACE,
    BUNDLE_MARKETPLACE,
    '10000000000000000000',
    TREASURY_ADDRESS,
    '50000000000000000000'
  );
  await privateFactory.deployed();
  console.log('FantomNFTFactoryPrivate deployed to:', privateFactory.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
