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
// 0x14C2455794AC6FA93a5B4d2E19d269d0Ea491BAA Vesting proxy
// 0x57fFe867AF2913EfCB8500D02DA33Ff4ec891EdF Vesting impl
// 0x57fFe867AF2913EfCB8500D02DA33Ff4ec891EdF Vesting impl v2

// TEST PARAMS
// const vestingEnd = 1782863999 // Tuesday, 30 June 2026 23:59:59
// const oneMonth = 2629743

const vestingEnd = 1785542399 // Friday, 31 July 2026 23:59:59
const oneMonth = 2629743

// const firstPhase = [1714521600, 1717199999, 0, ethers.parseEther("0.04"),   ethers.parseEther("8000000"),  ethers.parseEther("400000")]
// const secondPhase = [1717200000, 1719791999, 0, ethers.parseEther("0.06"),   ethers.parseEther("32000000"),  ethers.parseEther("1600000")]

const firstPhase = [1717200000, 1719791999, 0, ethers.parseEther("0.04"),   ethers.parseEther("8000000"),  ethers.parseEther("400000")]
const secondPhase = [1717200000, 1719791999, 0, ethers.parseEther("0.06"),   ethers.parseEther("32000000"),  ethers.parseEther("1600000")]

const wait = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

async function main() {

    const vesting = await hre.ethers.getContractAt(
        "contracts/VestingAffiliate.sol:VestingAffiliate",
        "0x14C2455794AC6FA93a5B4d2E19d269d0Ea491BAA"
    )

    // const dreamJunk = await hre.ethers.getContractAt(
    //     "DreamJunk",
    //     "0xecF87992f371f72621e70bdFDd07F698e3f9C6cC"
    // )

    // console.log('Establishing vesting parameters...')
    // const setVestingParamsTransaction = await vesting.setVestingParams(
    //     vestingEnd,
    //     oneMonth
    // );
    // await setVestingParamsTransaction.wait()
    // await wait(30000);
    // console.log('Vesting parameters ready.')

    // const end = await vesting.vestingEnd()
    // console.log(`Vesting end --> ${end}`)

    // console.log('Approving DRM...')
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

    // const phase = await vesting.getCurrentPhaseNumber()
    // console.log(`Current phase --> ${phase}`)

    var phase0 = await vesting.getPhase(0)
    console.log(phase0)

    await vesting.setPhaseDates(0, 1719792000, 1722470399)

    phase0 = await vesting.getPhase(0)
    console.log(phase0)
}

async function upgrade() {
    var proxyAddress = '0x14C2455794AC6FA93a5B4d2E19d269d0Ea491BAA';
    // var Contract2 = await ethers.getContractFactory("contracts/VestingAffiliate.sol:VestingAffiliate");
    // var contract2 = await upgrades.upgradeProxy(proxyAddress, Contract2);

    var implV2 = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log('Address implV2: ', implV2);

    await hre.run("verify:verify", {
        address: implV2,
        constructorArguments: [],
    })
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});