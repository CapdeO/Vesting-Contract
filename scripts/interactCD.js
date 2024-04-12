const { ethers, upgrades } = require("hardhat");

// Polygon
// Proxy   --> 0x9bfACE4Cf43EDf5abe9b2C2fd75Fe20F5dAf7A61
// Impl V1 --> 0x82cf371c60DC372EdEE9C389ce8790827cDc272C

// Phases
const vestingEnd = 1759276801
const interval = 2629743
const phase5 = [1711367876, 1713997619, 0, ethers.parseEther("0.10"),   ethers.parseEther("16000000"),  ethers.parseEther("500000")]

const wait = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

async function main() {

    const Vesting = await hre.ethers.getContractFactory("Vesting");
    const vesting = Vesting.attach('0x9bfACE4Cf43EDf5abe9b2C2fd75Fe20F5dAf7A61');

    const CD = await hre.ethers.getContractFactory("CryptoDeptoToken");
    const cd = CD.attach('0x86Dcf0116FC6A2e6854e0277054F1E06e38A796e');

    // console.log('Approving CD...')
    // const approveTransaction = await cd.approve(vesting.target, phase5[4])
    // await approveTransaction.wait()
    // await wait(30000)
    // console.log('Approval ready.')

    // await wait(20000);
    console.log('Creating phase...')
    const createPhaseTransaction = await vesting.createPhase(...phase5);
    await createPhaseTransaction.wait()
    await wait(30000)
    console.log('Phase created.')
}



main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});