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
      polygonMumbai: process.env.API_KEY_POLYGONSCAN
    },
  },
};
