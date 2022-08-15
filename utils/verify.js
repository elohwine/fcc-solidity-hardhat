const { run } = require("hardhat");
//auto etherscan verification
async function verify(contractAddress, constructorArgs) {
  try {
    console.log("Verifying contract, please wait");
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
    });
  } catch (e) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Contract already verified!");
    } else {
      console.log(e);
    }
  }
}

module.exports = { verify };
