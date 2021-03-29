require('dotenv').config()
usePlugin('@nomiclabs/buidler-waffle')
usePlugin('@nomiclabs/buidler-truffle5')
usePlugin('buidler-gas-reporter')
usePlugin('solidity-coverage')
usePlugin('@nomiclabs/buidler-solhint')
usePlugin('buidler-contract-sizer')

const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID
const PRIVATE_KEY = process.env.PRIVATE_KEY
const RPC_URI = process.env.RPC_URI

module.exports = {
  solc: {
    version: '0.6.12',
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
  gasReporter: {
    currency: 'USD',
    enabled: false,
    gasPrice: 50,
  },
  networks: {
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY}`],
      gasPrice: 120000000000,
    },
    testnet: {
      url: `${RPC_URI}`,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    coverage: {
      url: 'http://localhost:8555',
    },
  },
}
