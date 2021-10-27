// scripts/1_deploy_mockerc20.js
const {
    TREASURY_ADDRESS,
    AUCTION,
    MARKETPLACE,
    BUNDLE_MARKETPLACE,
    PLATFORM_FEE
} = require('../scripts/constants');

async function main () {
    // We get the contract to deploy
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    console.log('Deploying MockERC721...');
    const mockerc20 = await MockERC20.deploy("Fantom Test Token", "FTM", 0);
    await mockerc20.deployed();
    console.log('MockERC20 deployed to:', mockerc20.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });