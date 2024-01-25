var { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var { expect } = require("chai");
var { ethers, upgrades } = require("hardhat");
var { time } = require("@nomicfoundation/hardhat-network-helpers");

const phase0 = [1706745600, 1709251199, 0, ethers.parseEther("0.04"),   ethers.parseEther("8000000"),  ethers.parseEther("400000")]
const phase1 = [1709251200, 1711929599, 0, ethers.parseEther("0.06"),  ethers.parseEther("32000000"), ethers.parseEther("1600000")]
const phase2 = [1711929600, 1714521599, 0, ethers.parseEther("0.07"),   ethers.parseEther("6000000"),  ethers.parseEther("300000")]
const phase3 = [1714521600, 1717199999, 0, ethers.parseEther("0.075"), ethers.parseEther("40000000"), ethers.parseEther("2000000")]
const phase4 = [1717200000, 1719791999, 0, ethers.parseEther("0.08"),  ethers.parseEther("40000000"), ethers.parseEther("2000000")]
const phase5 = [1719792000, 1722470399, 0, ethers.parseEther("0.085"), ethers.parseEther("60000000"), ethers.parseEther("3000000")]
const phase6 = [1722470400, 1725148799, 0, ethers.parseEther("0.09"),  ethers.parseEther("64000000"), ethers.parseEther("3200000")]
const phase7 = [1725148800, 1727740799, 0, ethers.parseEther("0.095"), ethers.parseEther("70000000"), ethers.parseEther("3500000")]
const vestingEnd = 1772323199 // Saturday, 28 February 2026 23:59:59
const oneMonth = 2629743 // In secs

describe("Vesting Contract", () => {
    async function loadTest() {
        var [owner, alice, bob, carl, race] = await ethers.getSigners();
        var USDT = await ethers.getContractFactory("TetherUSD");
        var usdt = await USDT.deploy();
        var DJ = await ethers.getContractFactory("DreamJunk");
        var dj = await DJ.deploy()

        var VESTING = await ethers.getContractFactory("Vesting");
        var vesting = await upgrades.deployProxy(VESTING, 
            [dj.target, [usdt.target], race.address],
            { initializer: 'initialize', kind: 'uups' });

        return { vesting, usdt, dj, owner, alice, bob, carl, race };
    }

    describe("Deploy", () => {
        it("Token addresses", async () => {
            var { vesting, usdt } = await loadFixture(loadTest);

            expect((await vesting.getTokensSupportedList.call())[0]).to.be.equal(usdt.target)

            let ahora = new Date();              // obtener la fecha y hora actual
            let timestamp = await time.latest(); // obtener bloque actual
        });
    });

    describe("Create Phase", () => {
        it("Parameters", async () => {
            var { vesting, dj } = await loadFixture(loadTest);

            let amount = ethers.parseEther("8000000")

            await vesting.setVestingParams(vestingEnd, oneMonth)
            await dj.approve(vesting, amount)
            await vesting.createPhase(...phase0)

            expect((await vesting.getPhases.call())[0].startTime).to.be.equal(phase0[0])
            expect(await dj.balanceOf(vesting)).to.be.equal(amount)
        });

        it("Get actual Phase", async () => {
            var { vesting, dj } = await loadFixture(loadTest);

            await expect(vesting.getCurrentPhaseNumber()).to.be.revertedWith("No vesting phases available.")

            await vesting.setVestingParams(vestingEnd, oneMonth)
            await dj.approve(vesting, phase0[4])
            await vesting.createPhase(...phase0)

            await dj.approve(vesting, phase1[4])
            await vesting.createPhase(...phase1)

            await dj.approve(vesting, phase2[4])
            await vesting.createPhase(...phase2)

            await expect(vesting.getCurrentPhaseNumber()).to.be.revertedWith("No active vesting phase for the current time.")

            await time.increaseTo(phase0[0])

            expect(await vesting.getCurrentPhaseNumber.call()).to.be.equal(0)

            await time.increaseTo(phase1[0])

            expect(await vesting.getCurrentPhaseNumber.call()).to.be.equal(1)

            await time.increaseTo(phase2[1] + 1)

            await expect(vesting.getCurrentPhaseNumber()).to.be.revertedWith("No active vesting phase for the current time.")

            await expect(vesting.getPhase(3)).to.be.revertedWith("Invalid phase number.")
        });
    });

    describe("Invest", () => {
        it("Invest in phase ", async () => {
            var { vesting, usdt, dj, alice, race } = await loadFixture(loadTest);

            await vesting.setVestingParams(vestingEnd, oneMonth)
            await dj.approve(vesting, phase0[4])
            await vesting.createPhase(...phase0)

            await dj.approve(vesting, phase1[4])
            await vesting.createPhase(...phase1)

            let amount = 1000000 // ONE DOLLAR
            await time.increaseTo(1707561121) // Saturday, 10 February 2024 10:32:01
            let currentPhaseNumber = await vesting.getCurrentPhaseNumber()
            let tokensToReceive = ethers.parseEther("25")

            await usdt.mint(alice, amount)
            await usdt.connect(alice).approve(vesting, amount)
            await expect(vesting.connect(alice).invest(usdt.target, amount))
                .to.emit(vesting, "BuyTokens").withArgs(currentPhaseNumber, alice.address, ethers.parseEther("1"), tokensToReceive)
            
            expect(await usdt.balanceOf(alice)).to.be.equal(0)
            expect(await usdt.balanceOf(race)).to.be.equal(amount)

            let aliceInvestment = await vesting.getUserInvestment(alice.address, currentPhaseNumber)

            expect(aliceInvestment[0]).to.be.equal(tokensToReceive)
            expect(aliceInvestment[1]).to.be.equal(tokensToReceive)
            expect(aliceInvestment[2]).to.be.equal(0)

            await time.increaseTo(1711621921) // Thursday, 28 March 2024 10:32:01
            currentPhaseNumber = await vesting.getCurrentPhaseNumber()

            amount = 300000000 // 300 DOLLARS
            tokensToReceive = ethers.parseEther("5000") 

            await usdt.mint(alice, amount)
            await usdt.connect(alice).approve(vesting, amount)

            await expect(vesting.connect(alice).invest(usdt.target, amount))
                .to.emit(vesting, "BuyTokens").withArgs(currentPhaseNumber, alice.address, ethers.parseEther("300"), tokensToReceive)

            aliceInvestment = await vesting.getUserInvestment(alice.address, currentPhaseNumber)

            expect(aliceInvestment[0]).to.be.equal(tokensToReceive)
            expect(aliceInvestment[1]).to.be.equal(tokensToReceive)
            expect(aliceInvestment[2]).to.be.equal(0)

            expect(await usdt.balanceOf(race)).to.be.equal(1000000 + 300000000)
        });
    });
});