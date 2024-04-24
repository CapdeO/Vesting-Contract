const { ethers, upgrades } = require("hardhat");

// Amoy
// 0x20cfc5962b1abe4931688ff71de3d5ee053fb283 USDT
// 0xD1e8372C333158331eDf0edd994270AD8896E0a3 USDC
// 0x755B7bd472Eb98cb355A6e9c1588c03c19141471 BUSD
// 0xf88718d191892cde8774dccebc12a024289d96ea DJ
// 0x29c55A22976288B226c8D55b2E9fa411EB4657C3 Vesting proxy
// 0x94D323fd50590C49dBbBc563Ca8E4fe331b27ea7 Vesting impl

// Polygon
//
//

// TEST PARAMS
const vestingEnd = 1776557047 // Sunday, 19 April 2026 0:04:07
const oneMonth = 2629743

const firstPhase = [1711929600, 1714521599, 0, ethers.parseEther("0.04"),   ethers.parseEther("8000000"),  ethers.parseEther("400000")]

const wait = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

async function main() {

    const vesting = await hre.ethers.getContractAt(
        "Vesting",
        "0x29c55A22976288B226c8D55b2E9fa411EB4657C3"
    )

    const dreamJunk = await hre.ethers.getContractAt(
        "DreamJunkStudios",
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

    // await wait(20000);
    // console.log('Creating phase...')
    // const createPhaseTransaction = await vesting.createPhase(...firstPhase);
    // await createPhaseTransaction.wait()
    // await wait(30000)
    // console.log('Phase created.')

    const end = await dreamJunk.balanceOf('0x61D4d1Ab7eA7B3A54C7B2D646Eb8189faD7B1050')
    console.log(end)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});