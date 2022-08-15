require("dotenv").config();
const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat"); //get the latest deploymets from hardhat
const {
  isCallTrace,
} = require("hardhat/internal/hardhat-network/stack-traces/message-trace");
//let deployer;
describe("Fund Me Tests", async function () {
  //other way
  let fundMe;
  let deployer;
  let mockV3Aggregator;
  beforeEach(async function () {
    //deploy contracts before any testing actually happens
    //deployments has a fixture which takes tags and run all specified deploy scripts
    [deployer, user1, user2] = await ethers.getSigners();
    // deployer = await getNamedAccounts().deployer;
    await deployments.fixture("all");
    //deployer = await getNamedAccounts().deployer;
   // console.log(deployer.address);

    // const accounts = await ethers.getSigners(); //returns the account confgrd in the network section of hardhat config
    // const signer = accounts[0];
    // deployer = accounts[0];
    fundMe = await ethers.getContract("FundMe", deployer.address); //ethers used to get the latest contract deployed by address deployer,defined in config
    mockV3Aggregator = (
      await ethers.getContract("MockV3Aggregator", deployer.address)
    ).address; //ethers used to get the latest contract deployed by address deployer,defined in config
  });

  describe("Constructor", async function () {
    //make sure constructor gets the correct feed
    it("make sure constructor gets the correct feed", async function () {
      const feedAddr = await fundMe.s_priceFeed();
      assert.equal(mockV3Aggregator, feedAddr);
    });
  });

  describe("fundMe() function", async function () {
    it("make sure txnz sent with value (eth/matic)", async function () {
      // await(expect(fundMe.fund({"value":ethers.utils.parseEther("1")})).to.be.revertedWith("hauna kana cash"));
      await expect(fundMe.fund()).to.be.revertedWith(
        "You need to spend more ETH shaa!"
      );
    });

    it("Correctly updates the addressToAmnt data structure", async function () {
      await fundMe.fund({ value: ethers.utils.parseEther("1") });
      const response = await fundMe.s_addressToAmountFunded(deployer.address);
      assert.equal(
        response.toString(),
        ethers.utils.parseEther("1").toString()
      );
    });

    it("Adds funder to funders array", async function () {
      await fundMe.fund({ value: ethers.utils.parseEther("1") });
      let funder = await fundMe.s_funders(0);
      assert.equal(deployer.address, funder);
    });
  });

  describe("withdraw() function", async function () {
    //beforeEach to fund the contract before withdraw
    beforeEach(async function () {
      await fundMe.fund({ value: ethers.utils.parseEther("1") });
    });
    it("Withdraw Eth from a single funder", async function () {
      //1.arrange,get initial contract and deployer balances
      const initialContractBal = await fundMe.provider.getBalance(
        fundMe.address
      );

      const initialDeployerBal = await fundMe.provider.getBalance(
        deployer.address
      );
      //2.act,call withdraw
      const txResult = await fundMe.withdraw();
      const txReceipt = await txResult.wait(1);
      const { gasUsed, effectiveGasPrice } = txReceipt;

      //Get account balances,,ethers.provider.getBalance(addr) also works
      const endingDeployerBal = await fundMe.provider.getBalance(
        deployer.address
      );
      const endingContractBal = await fundMe.provider.getBalance(
        fundMe.address
      );
      const totalGas = gasUsed.mul(effectiveGasPrice);
      //3.assert,, compare the finalBalances, including gas cost
      assert.equal(endingContractBal, 0); //ending balance should be zero
      assert.equal(
        initialDeployerBal.add(initialContractBal).toString(),
        endingDeployerBal.add(totalGas).toString()
      );
    });

    it("Withdraw Eth from multiple funders", async function () {
      //1.arrange
      //Call fund() with different accounts,before getting balances
      const accounts = await ethers.getSigners();
      for (let i = 1; i < 6; i++) {
        let connectedAccount = await fundMe.connect(accounts[i]);
        await connectedAccount.fund({ value: ethers.utils.parseEther("1") });
      }
      //,get initial contract and deployer balances
      const initialContractBal = await fundMe.provider.getBalance(
        fundMe.address
      );

      const initialDeployerBal = await fundMe.provider.getBalance(
        deployer.address
      );

      //2.act,call withdraw
      const txResult = await fundMe.withdraw();
      const txReceipt = await txResult.wait(1);
      const { gasUsed, effectiveGasPrice } = txReceipt;

      //Get account balances,,ethers.provider.getBalance(addr) also works
      const endingDeployerBal = await fundMe.provider.getBalance(
        deployer.address
      );
      const endingContractBal = await fundMe.provider.getBalance(
        fundMe.address
      );
      const totalGas = gasUsed.mul(effectiveGasPrice);
      //3.assert,, compare the finalBalances, including gas cost
      assert.equal(endingContractBal, 0); //ending balance should be zero
      assert.equal(
        initialDeployerBal.add(initialContractBal).toString(),
        endingDeployerBal.add(totalGas).toString()
      );
      //make sure funders are reset properly
      await expect(fundMe.s_funders(0)).to.be.reverted;
      //make sure all funders balances are reset to zero in the addressToAmnt mapping
      for (i = 0; i < 6; i++) {
        assert.equal(
          await fundMe.s_addressToAmountFunded(accounts[i].address),
          0
        );
      }
    });

    it("Should revert if not owner calls it", async function () {
      const accounts = await ethers.getSigners();
      const attacker = accounts[1];
      const connectedAttacker = await fundMe.connect(attacker);

      await expect(connectedAttacker.withdraw()).to.be.revertedWith("FundMe_NotOwner()");
    });
  });
});
