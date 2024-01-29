const { ethers, upgrades } = require("hardhat");

// Mumbai
// 0x7a6C7a3bab11D57423f9F5690AF6ff38BE2d771f USDT
// 0xD345D94552C88DD997F117C5987657526616ECB6 DJ
// 0x8Db673441f806aD20526d8Bb30Af54F03B798F82 Vesting proxy
// 0xDa005Ae70DCf099191de08fb0dE1bf5FD2c4ED50 Vesting Impl v1

// Polygon
//
//

// Test phases
const firstPhase = [1706554332, 1709251199, 0, ethers.parseEther("0.04"),   ethers.parseEther("8000000"),  ethers.parseEther("400000")]
const phase0 = [1709251200, 1711929599, 0, ethers.parseEther("0.04"),   ethers.parseEther("8000000"),  ethers.parseEther("400000")]

const wait = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

async function main() {

    const Vesting = await hre.ethers.getContractFactory("Vesting");
    const vesting = Vesting.attach('0x8Db673441f806aD20526d8Bb30Af54F03B798F82');

    const DreamJunk = await hre.ethers.getContractFactory("DreamJunk");
    const dreamJunk = DreamJunk.attach('0xD345D94552C88DD997F117C5987657526616ECB6');

    // console.log('Establishing vesting parameters...')
    // const setVestingParamsTransaction = await vesting.setVestingParams(
    //     1769711624, // Thursday, 29 January 2026 18:33:44
    //     2629743
    // );
    // await setVestingParamsTransaction.wait()
    // await wait(30000);
    // console.log('Vesting parameters ready.')

    console.log('Approving DJ...')
    const approveTransaction = await dreamJunk.approve(vesting.target, firstPhase[4])
    await approveTransaction.wait()
    await wait(30000)
    console.log('Approval ready.')

    await wait(20000);
    console.log('Creating phase...')
    const createPhaseTransaction = await vesting.createPhase(...firstPhase);
    await createPhaseTransaction.wait()
    await wait(30000)
    console.log('Phase created.')
}



main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});