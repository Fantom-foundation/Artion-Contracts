const {
  TREASURY_ADDRESS,
  PLATFORM_FEE,
} = require('./constants');

async function main() {
  const [deployer] = await ethers.getSigners()
  const deployerAddress = await deployer.getAddress()
  console.log('Deploying marketplace with address:', deployerAddress)

  const marketplace = await ethers.getContractFactory('FantomBundleMarketplace')
  const contract = await marketplace.deploy(
    TREASURY_ADDRESS,
    PLATFORM_FEE
  );

  await contract.deployed()

  console.log('Marketplace deployed at', contract.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error)
  process.exit(1)
})
