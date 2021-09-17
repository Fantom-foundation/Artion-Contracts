async function main() {
  const ArtTradable = await ethers.getContractFactory('FantomArtTradable')
  const nft = await ArtTradable.deploy(
    'FantomArt',
    'FART',
    '20000000000000000000',
    '0x9B2Bb6290fb910a960Ec344cDf2ae60ba89647f6',
    '0x19fD7C9B72cd944f987E0aB1FdD33fF8f68Cf87C',
    '0x0EeB6B95B52dfDFb86CcF960F8408a211555b63b'
  );
  await nft.deployed();
  console.log('FantomArt deployed to:', nft.address);

  const ArtTradablePrivate = await ethers.getContractFactory('FantomArtTradablePrivate')
  const nftPrivate = await ArtTradablePrivate.deploy(
    'FantomArt',
    'FART',
    '20000000000000000000',
    '0x9B2Bb6290fb910a960Ec344cDf2ae60ba89647f6',
    '0x19fD7C9B72cd944f987E0aB1FdD33fF8f68Cf87C',
    '0x0EeB6B95B52dfDFb86CcF960F8408a211555b63b'
  );
  await nftPrivate.deployed();
  console.log('FantomArt deployed to:', nftPrivate.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error)
  process.exit(1)
})
