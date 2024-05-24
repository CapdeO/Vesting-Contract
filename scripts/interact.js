const { ethers, upgrades } = require("hardhat");

// Amoy
// 0x20cfc5962b1abe4931688ff71de3d5ee053fb283 USDT
// 0xD1e8372C333158331eDf0edd994270AD8896E0a3 USDC
// 0x755B7bd472Eb98cb355A6e9c1588c03c19141471 BUSD
// 0xf88718d191892cde8774dccebc12a024289d96ea DRM
// 0x7a6C7a3bab11D57423f9F5690AF6ff38BE2d771f Vesting proxy
// 0xF2A22fcFa312f91a432fad606937D5Ab17278Dc0 Vesting impl

// Polygon
// 0xecF87992f371f72621e70bdFDd07F698e3f9C6cC DRM
//

// TEST PARAMS
const vestingEnd = 1782863999 // Tuesday, 30 June 2026 23:59:59
const oneMonth = 2629743

const firstPhase = [1714521600, 1717199999, 0, ethers.parseEther("0.04"),   ethers.parseEther("8000000"),  ethers.parseEther("400000")]
const secondPhase = [1714521600, 1717200000, 0, ethers.parseEther("0.06"),   ethers.parseEther("32000000"),  ethers.parseEther("1600000")]

const wait = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

async function main() {

    const vesting = await hre.ethers.getContractAt(
        "contracts/VestingAffiliate.sol:VestingAffiliate",
        "0x7a6C7a3bab11D57423f9F5690AF6ff38BE2d771f"
    )

    const dreamJunk = await hre.ethers.getContractAt(
        "DreamJunk",
        "0xf88718d191892cde8774dccebc12a024289d96ea"
    )

    // console.log('Establishing vesting parameters...')
    // const setVestingParamsTransaction = await vesting.setVestingParams(
    //     vestingEnd,
    //     oneMonth
    // );
    // await setVestingParamsTransaction.wait()
    // await wait(30000);
    // console.log('Vesting parameters ready.')

    // const end = await vesting.vestingEnd()
    // console.log(end)

    // console.log('Approving DJ...')
    // const approveTransaction = await dreamJunk.approve(vesting.target, firstPhase[4])
    // await approveTransaction.wait()
    // await wait(30000)
    // console.log('Approval ready.')

    await wait(20000);
    console.log('Creating phase...')
    const createPhaseTransaction = await vesting.createPhase(...firstPhase);
    await createPhaseTransaction.wait()
    await wait(30000)
    console.log('Phase created.')

    const end = await dreamJunk.balanceOf('0x7a6C7a3bab11D57423f9F5690AF6ff38BE2d771f')
    console.log(end)

    const phase = await vesting.getCurrentPhaseNumber()
    console.log(phase)

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});