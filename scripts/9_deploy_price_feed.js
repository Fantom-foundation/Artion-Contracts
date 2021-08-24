async function main() {
  const Contract = await ethers.getContractFactory('FantomPriceFeed')
  const contract = await Contract.deploy('0xdb24731e07Ace2430486681aC9118BEBb365d871', '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83')

  await contract.deployed()

  console.log('FantomPriceFeed deployed to', contract.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
