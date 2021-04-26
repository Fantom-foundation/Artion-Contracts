const {
    TREASURY_ADDRESS,
} = require('./constants');

async function main() {
    const [deployer] = await ethers.getSigners()
    const deployerAddress = await deployer.getAddress()
    console.log('Deploying auction with address:', deployerAddress)
  
    const auction = await ethers.getContractFactory('FantomAuction')
    const contract = await auction.deploy(TREASURY_ADDRESS);
  
    await contract.deployed()
  
    console.log('Auction deployed at', contract.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error)
    process.exit(1)
})
  