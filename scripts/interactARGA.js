const { ethers, upgrades } = require("hardhat");

// TEST PARAMS
const vestingEnd = 1778630400 // Wednesday, 13 May 2026 0:00:00
const oneMonth = 2629743

const firstPhase = [1715600974, 1717199999, 0, ethers.parseEther("0.07"),  ethers.parseEther("10000000"),  ethers.parseEther("400000")]
const secondPhase = [1717200000, 1719791999, 0, ethers.parseEther("0.08"),  ethers.parseEther("8000000"),  ethers.parseEther("600000")]
const thirdPhase = [1719792000, 1722470399, 0, ethers.parseEther("0.11"),   ethers.parseEther("5000000"),  ethers.parseEther("800000")]

const wait = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

async function main() {

    const vesting = await hre.ethers.getContractAt(
        "contracts/Vesting.sol:Vesting",
        "0xcf164e2e423CC7341Da00E103AD345162D30aDe4"
    )

    const arga = await hre.ethers.getContractAt(
        "Argatio",
        "0xe49A8863cb86f962100767dfD7Dee165E187A571"
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

    console.log('Approving ARGA...')
    const approveTransaction = await arga.approve(vesting.target, firstPhase[4] + secondPhase[4] + thirdPhase[4])
    await approveTransaction.wait()
    await wait(30000)
    console.log('Approval ready.')

    await wait(20000);
    console.log('Creating phase 1...')
    const createPhaseTransaction1 = await vesting.createPhase(...firstPhase);
    await createPhaseTransaction1.wait()
    await wait(30000)
    console.log('Phase 1 created.')

    await wait(20000);
    console.log('Creating phase 2...')
    const createPhaseTransaction2 = await vesting.createPhase(...secondPhase);
    await createPhaseTransaction2.wait()
    await wait(30000)
    console.log('Phase 2 created.')

    await wait(20000);
    console.log('Creating phase 3...')
    const createPhaseTransaction3 = await vesting.createPhase(...thirdPhase);
    await createPhaseTransaction3.wait()
    await wait(30000)
    console.log('Phase 3 created.')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});