var { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var { expect } = require("chai");
var { ethers, upgrades } = require("hardhat");
var { time } = require("@nomicfoundation/hardhat-network-helpers");

const phases = [
    [1706745600, 1709251199, ethers.parseEther("0.04"),   ethers.parseEther("8000000"),  ethers.parseEther("400000"), ], // Private Sale
    [1709251200, 1711929599, ethers.parseEther("0.06"),  ethers.parseEther("32000000"), ethers.parseEther("1600000"), ], // Phase 1
    [1711929600, 1714521599, ethers.parseEther("0.07"),   ethers.parseEther("6000000"),  ethers.parseEther("300000"), ], // Phase 2
    [1714521600, 1717199999, ethers.parseEther("0.075"), ethers.parseEther("40000000"), ethers.parseEther("2000000"), ], // Phase 3
    [1717200000, 1719791999, ethers.parseEther("0.08"),  ethers.parseEther("40000000"), ethers.parseEther("2000000"), ], // Phase 4
    [1719792000, 1722470399, ethers.parseEther("0.085"), ethers.parseEther("60000000"), ethers.parseEther("3000000"), ], // Phase 5
    [1722470400, 1725148799, ethers.parseEther("0.09"),  ethers.parseEther("64000000"), ethers.parseEther("3200000"), ], // Phase 6
    [1725148800, 1727740799, ethers.parseEther("0.095"), ethers.parseEther("70000000"), ethers.parseEther("3500000"), ], // Phase 7
]

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

        return { vesting, usdt, dj, owner, alice, bob, carl };
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

            await dj.approve(vesting, amount)
            await vesting.createPhase(phases[0][0], phases[0][1], phases[0][2], phases[0][3], phases[0][4],)

            expect((await vesting.getPhases.call())[0].startTime).to.be.equal(phases[0][0])
            expect(await dj.balanceOf(vesting)).to.be.equal(amount)
        });

        it("Get actual Phase", async () => {
            var { vesting, dj } = await loadFixture(loadTest);

            await expect(vesting.getCurrentPhaseNumber()).to.be.revertedWith("No vesting phases available.")

            await dj.approve(vesting, phases[0][3])
            await vesting.createPhase(phases[0][0], phases[0][1], phases[0][2], phases[0][3], phases[0][4])

            await dj.approve(vesting, phases[1][3])
            await vesting.createPhase(phases[1][0], phases[1][1], phases[1][2], phases[1][3], phases[1][4])

            await dj.approve(vesting, phases[2][3])
            await vesting.createPhase(phases[2][0], phases[2][1], phases[2][2], phases[2][3], phases[2][4])

            await expect(vesting.getCurrentPhaseNumber()).to.be.revertedWith("No active vesting phase for the current time.")

            await time.increaseTo(phases[0][0])

            expect(await vesting.getCurrentPhaseNumber.call()).to.be.equal(0)

            await time.increaseTo(phases[1][0])

            expect(await vesting.getCurrentPhaseNumber.call()).to.be.equal(1)

            await time.increaseTo(phases[2][1] + 1)

            await expect(vesting.getCurrentPhaseNumber()).to.be.revertedWith("No active vesting phase for the current time.")

            await expect(vesting.getPhase(3)).to.be.revertedWith("Invalid phase number.")
        });
    });

    describe("Invest", () => {
        it("Invest in phase ", async () => {
            var { vesting, usdt, dj, owner, alice } = await loadFixture(loadTest);

            await dj.approve(vesting, phases[0][3])
            await vesting.createPhase(phases[0][0], phases[0][1], phases[0][2], phases[0][3], phases[0][4])

            await time.increaseTo(1707561121)
            let phaseNumber = await vesting.getCurrentPhaseNumber()

            console.log(await usdt.balanceOf(owner.address))

            // console.log(await vesting.getPhase(phaseNumber))

            // await usdt.mint(alice, 10)
            // console.log(await usdt.balanceOf(alice))

            // await usdt.connect(alice).approve(vesting, 10)
            // await vesting.connect(alice).invest(usdt.target, 10)

            // console.log(await usdt.balanceOf(alice))

            // console.log(await vesting.getPhase(phaseNumber))
        });
    });

});