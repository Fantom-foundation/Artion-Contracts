const {
  TREASURY_ADDRESS,
  PLATFORM_FEE,
} = require('./constants');

async function main() {
  const Factory = await ethers.getContractFactory('FantomArtFactory')
  const factory = await Factory.deploy(
    '0x19fD7C9B72cd944f987E0aB1FdD33fF8f68Cf87C',
    '0x0EeB6B95B52dfDFb86CcF960F8408a211555b63b',
    '20000000000000000000',
    TREASURY_ADDRESS,
    '10000000000000000000',
  );
  await factory.deployed();
  console.log('FantomArtFactory deployed to:', factory.address);

  const PrivateFactory = await ethers.getContractFactory('FantomArtFactoryPrivate')
  const privateFactory = await PrivateFactory.deploy(
    '0x19fD7C9B72cd944f987E0aB1FdD33fF8f68Cf87C',
    '0x0EeB6B95B52dfDFb86CcF960F8408a211555b63b',
    '20000000000000000000',
    TREASURY_ADDRESS,
    '10000000000000000000',
  );
  await privateFactory.deployed();
  console.log('FantomArtFactoryPrivate deployed to:', privateFactory.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error)
  process.exit(1)
})
