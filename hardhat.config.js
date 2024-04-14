require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    polygonAmoy: {
      chainId: 80002,
      url: process.env.AMOY_TESTNET_URL,
      accounts: [process.env.PRIVATE_KEY],
      allowUnlimitedContractSize: false,
      timeout: 1000 * 60,
      gasPrice: 6200000000
    },
    mumbai: {
      chainId: 80001,
      url: process.env.MUMBAI_TESNET_URL,
      accounts: [process.env.PRIVATE_KEY],
      allowUnlimitedContractSize: false,
      timeout: 1000 * 60,
    },
    polygon: {
      chainId: 137,
      url: process.env.POLYGON_NODE,
      accounts: [process.env.PRIVATE_KEY],
      allowUnlimitedContractSize: false,
      timeout: 1000 * 60,
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.OKLINK_API_KEY,
      mumbai: process.env.API_KEY_POLYGONSCAN,
      polygon:process.env.API_KEY_POLYGONSCAN
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://www.oklink.com/api/explorer/v1/contract/verify/async/api/polygonAmoy",
          browserURL: "https://www.oklink.com/polygonAmoy"
        },
      }
    ]
  },
};
