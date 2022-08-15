const { network, get } = require("hardhat");
const { networks } = require("../hardhat.config");
const { verify } = require("../utils/verify");
const {
  networkConfig,
  developmentChains,
} = require("../helper-hardhat-config");

module.exports = async (hre) => {
  const { getNamedAccounts, deployments } = hre;

  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();

  let ethUsdPriceFeed; //from network config

  //getting chainId
  const chainId = network.config.chainId;

  //if chainId is X use priceFeed address Y
  //if chainId is development

  //we want to use a mock when working on the local default hardhat network/node
  //eg from localhost/hardhat to rinkeby

  if (developmentChains.includes(network.name)) {
    mockV3AggregatorContract = await get("MockV3Aggregator");
    ethUsdPriceFeed = mockV3AggregatorContract.address;
  } else {
    ethUsdPriceFeed = networkConfig[chainId]["ethUsdPriceFeed"];
  }

  const args = [ethUsdPriceFeed];

  const fundMe = await deploy("FundMe", {
    from: deployer,
    args: args, //put price feed address
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  log("--------------------------------------------------------");

  //verify contract if not on test
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(fundMe.address, args);
  }
};

module.exports.tags = ["all", "fundme"];
