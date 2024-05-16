var { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var { expect } = require("chai");
var { ethers, upgrades } = require("hardhat");
var { time } = require("@nomicfoundation/hardhat-network-helpers");

const vestingEnd = 1778630400 // Wednesday, 13 May 2026 0:00:00
// const phaseStart = 1715558400 // Monday, 13 May 2024 0:00:00
const phaseStart = 1744502400 // Sunday, 13 April 2025 0:00:00
const phaseEnd = 1747094400 // Tuesday, 13 May 2025 0:00:00
const oneMonth = 2629743 // In secs

function toNormal(_number) {
    let number = _number.toString()
    return (number / 10 ** 18).toFixed(2)
}

describe("Vesting Contract", () => {
    async function loadTest() {
        var [owner, alice, bob, carl, mati] = await ethers.getSigners();
        var ARGA = await ethers.getContractFactory("Argatio");
        var arga = await ARGA.deploy()

        var VESTING = await ethers.getContractFactory("VestingTeam");
        var vesting = await upgrades.deployProxy(VESTING, 
            [arga.target, mati.address],
            { initializer: 'initialize', kind: 'uups' });

        return { vesting, arga, owner, alice, bob, carl, mati };
    }

    describe("Initialize contract", () => {
        it("Parameters", async () => {
            var { vesting, arga, alice, owner } = await loadFixture(loadTest);

            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(phaseStart, phaseEnd, 0)
            
            let totalAmount = ethers.parseEther("300")
            await arga.approve(vesting, totalAmount)

            await vesting.allocateTokens(totalAmount, [alice.address])

            let aliceInvestment = await vesting.getUserInvestment(alice)

            console.log(`Alice total ${ethers.formatEther(aliceInvestment[0])}`)
            console.log(`Alice balance ${ethers.formatEther(aliceInvestment[1])}`)
            console.log(`Alice released ${ethers.formatEther(aliceInvestment[2])}`)

            let contractBalance = await arga.balanceOf(vesting.target)

            console.log(`Contract balance ${ethers.formatUnits(contractBalance)}`)

            await time.increaseTo(1747094400)
            console.log('Acelerando tiempo a 13 May 2025')
            console.log(`Alice puede retirar ${ethers.formatUnits(await vesting.connect(alice).vestedAmount())}`)

            await time.increase(oneMonth)
            console.log('Acelerando un mes')
            console.log(`Alice puede retirar ${ethers.formatUnits(await vesting.connect(alice).vestedAmount())}`)

            await time.increase(oneMonth)
            console.log('Acelerando un mes')
            console.log(`Alice puede retirar ${ethers.formatUnits(await vesting.connect(alice).vestedAmount())}`)

            await time.increase(oneMonth)
            console.log('Acelerando un mes')
            console.log(`Alice puede retirar ${ethers.formatUnits(await vesting.connect(alice).vestedAmount())}`)

            console.log(await vesting.phase())

        });
    });
});