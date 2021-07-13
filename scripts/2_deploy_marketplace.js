require('dotenv').config();
const {
  TREASURY_ADDRESS,
  PLATFORM_FEE,
} = require('./constants');

async function main() {
  // const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
  // const proxyAdmin = await ProxyAdmin.deploy();
  // await proxyAdmin.deployed();

  const Marketplace = await ethers.getContractFactory("FantomMarketplace")
  const marketplaceImpl = await Marketplace.deploy();
  await marketplaceImpl.deployed();
  console.log("Marketplace deployed to:", marketplaceImpl.address);

  const AdminUpgradeabilityProxyFactory = await ethers.getContractFactory("AdminUpgradeabilityProxy");
  // mainnet
  const marketplaceProxy = await AdminUpgradeabilityProxyFactory.deploy(marketplaceImpl.address, '0xde13797eC0C654bFF3B10896b176F2c901a84022', []);
  // testnet
  // const marketplaceProxy = await AdminUpgradeabilityProxyFactory.deploy(marketplaceImpl.address, '0xF6eD2c50fcEF4FDe67f2819a4Cd8af282733B25a', []);
  await marketplaceProxy.deployed();
  console.log("Marketplace Proxy deployed at ", marketplaceProxy.address);

  const marketplace = await ethers.getContractAt("FantomMarketplace", marketplaceProxy.address);
  await marketplace.initialize(
    TREASURY_ADDRESS,
    PLATFORM_FEE
  );
  console.log("Marketplace Proxy initialized");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error)
  process.exit(1)
})
