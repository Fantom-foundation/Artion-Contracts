// scripts/14_deploy_fantomauction.js
const {
    TREASURY_ADDRESS,
    AUCTION,
    MARKETPLACE,
    BUNDLE_MARKETPLACE,
    PLATFORM_FEE
} = require('../scripts/constants');

async function main () {
    // We get the contract to deploy
    const FantomAuction = await ethers.getContractFactory('FantomAuction');
    console.log('Deploying FantomAuction...');
    const fantomauction = await FantomAuction.deploy();
    await fantomauction.deployed();
    console.log('FantomAuction deployed to:', box.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });