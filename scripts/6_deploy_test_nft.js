const { TREASURY_ADDRESS } = require('./constants');

async function main() {
  // const NFTTradable = await ethers.getContractFactory('FantomNFTTradable')
  // const nft = await NFTTradable.deploy(
  //   'Artion',
  //   'ART',
  //   '0xdb404BF33c90b51176cA3db85288296B8594D134',
  //   '0x19fD7C9B72cd944f987E0aB1FdD33fF8f68Cf87C',
  //   '0x0EeB6B95B52dfDFb86CcF960F8408a211555b63b',
  //   '10000000000000000000',
  //   '0x9B2Bb6290fb910a960Ec344cDf2ae60ba89647f6'
  // );
  // await nft.deployed();
  // console.log('Artion deployed to:', nft.address);

  const NFTTradablePrivate = await ethers.getContractFactory(
    'FantomNFTTradablePrivate'
  );
  const nftPrivate = await NFTTradablePrivate.deploy(
    'IArtion',
    'IART',
    '0xdb404BF33c90b51176cA3db85288296B8594D134',
    '0x19fD7C9B72cd944f987E0aB1FdD33fF8f68Cf87C',
    '0x0EeB6B95B52dfDFb86CcF960F8408a211555b63b',
    '10000000000000000000',
    TREASURY_ADDRESS
  );
  await nftPrivate.deployed();
  console.log('IArtion deployed to:', nftPrivate.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
