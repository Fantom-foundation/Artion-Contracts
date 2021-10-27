// scripts/4_deploy_fantomartion.js
const {
    TREASURY_ADDRESS,
    AUCTION,
    MARKETPLACE,
    BUNDLE_MARKETPLACE,
    PLATFORM_FEE
} = require('../scripts/constants');

async function main () {
    // We get the contract to deploy
    const FantomArtion = await ethers.getContractFactory('FantomArtion');
    console.log('Deploying FantomArtion...');
    const fantomartion = await FantomArtion.deploy(TREASURY_ADDRESS, PLATFORM_FEE);
    await fantomartion.deployed();
    console.log('FantomArtion deployed to:', fantomartion.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });