const {
  TREASURY_ADDRESS,
} = require('./constants');

async function main() {
  const Auction = await ethers.getContractFactory('FantomAuction')
  const auctionImpl = await Auction.deploy();
  await auctionImpl.deployed();
  console.log('Auction deployed to:', auctionImpl.address);

  // const AdminUpgradeabilityProxyFactory = await ethers.getContractFactory("AdminUpgradeabilityProxy");
  // mainnet
  // const auctionProxy = await AdminUpgradeabilityProxyFactory.deploy(auctionImpl.address, '0xde13797eC0C654bFF3B10896b176F2c901a84022', []);
  // testnet
  // const auctionProxy = await AdminUpgradeabilityProxyFactory.deploy(auctionImpl.address, '0xF6eD2c50fcEF4FDe67f2819a4Cd8af282733B25a', []);
  // await auctionProxy.deployed();
  // console.log("Auction Proxy deployed at ", auctionProxy.address);

  // const auction = await ethers.getContractAt("FantomAuction", auctionProxy.address);
  // await auction.initialize(TREASURY_ADDRESS);
  // console.log("Auction Proxy initialized");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error)
  process.exit(1)
})
