var { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var { expect } = require("chai");
var { ethers, upgrades } = require("hardhat");
var { time } = require("@nomicfoundation/hardhat-network-helpers");

const vestingEnd = 1778630400 // Wednesday, 13 May 2026 0:00:00
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

            let amount = ethers.parseEther("30000000")

            await vesting.setVestingParams(vestingEnd, oneMonth)
            await arga.approve(vesting, amount)
            await vesting.createPhase(1715803324, 1715889724, 1747094400, amount)

            expect(await arga.balanceOf(vesting)).to.equal(amount)

            console.log(await vesting.getUserInvestment(owner))

            await vesting.allocateTokens()
        });
    });

    describe("Release", () => {
        it("Release after one year", async () => {
            var { vesting, usdt, dj, alice, race } = await loadFixture(loadTest);
            let aliceInvestment;

        });
    });
});