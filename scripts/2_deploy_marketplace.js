require('dotenv').config();
const { TREASURY_ADDRESS, PLATFORM_FEE } = require('./constants');

async function main() {
  const ProxyAdmin = await ethers.getContractFactory('ProxyAdmin');
  const proxyAdmin = await ProxyAdmin.deploy();
  await proxyAdmin.deployed();

  console.log('ProxyAdmin deployed to:', proxyAdmin.address);

  const Marketplace = await ethers.getContractFactory('FantomMarketplace');
  const marketplaceImpl = await Marketplace.deploy();
  await marketplaceImpl.deployed();

  console.log('FantomMarketplace deployed to:', marketplaceImpl.address);

  const AdminUpgradeabilityProxyFactory = await ethers.getContractFactory(
    'AdminUpgradeabilityProxy'
  );

  // Mainnet
  const marketplaceProxy = await AdminUpgradeabilityProxyFactory.deploy(
    marketplaceImpl.address,
    proxyAdmin.address, //ProxyAdmin
    []
  );

  // // Testnet
  // const marketplaceProxy = await AdminUpgradeabilityProxyFactory.deploy(
  //   marketplaceImpl.address,
  //   proxyAdmin.address,
  //   []
  // );

  await marketplaceProxy.deployed();
  console.log('Marketplace Proxy deployed at ', marketplaceProxy.address);

  const marketplace = await ethers.getContractAt(
    'FantomMarketplace',
    marketplaceProxy.address
  );
  await marketplace.initialize(TREASURY_ADDRESS, PLATFORM_FEE);
  console.log('Marketplace Proxy initialized');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
