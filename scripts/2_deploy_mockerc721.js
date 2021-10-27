// scripts/2_deploy_mockerc721.js
const {
    TREASURY_ADDRESS,
    AUCTION,
    MARKETPLACE,
    BUNDLE_MARKETPLACE,
    PLATFORM_FEE
} = require('../scripts/constants');

async function main () {
    // We get the contract to deploy
    const MockERC721 = await ethers.getContractFactory('MockERC721');
    console.log('Deploying MockERC721...');
    const mockerc721 = await MockERC721.deploy("Fantom Test NFToken", "FTMNFT");
    await mockerc721.deployed();
    console.log('MockERC721 deployed to:', mockerc721.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });