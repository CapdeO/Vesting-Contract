var { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var { expect } = require("chai");
var { ethers, upgrades } = require("hardhat");
var { time } = require("@nomicfoundation/hardhat-network-helpers");

const phases = [
    [1706745600, 1709251199, "0.04",   "8000000",  "400000", ], // Private Sale
    [1709251200, 1711929599, "0.06",  "32000000", "1600000", ], // Phase 1
    [1711929600, 1709251199, "0.07",   "6000000",  "300000", ], // Phase 2
    [1714521600, 1709251199, "0.075", "40000000", "2000000", ], // Phase 3
    [1717200000, 1709251199, "0.08",  "40000000", "2000000", ], // Phase 4
    [1719792000, 1709251199, "0.085", "60000000", "3000000", ], // Phase 5
    [1722470400, 1709251199, "0.09",  "64000000", "3200000", ], // Phase 6
    [1706745600, 1709251199, "0.095", "70000000", "3500000", ], // Phase 7
]

describe("Vesting Contract", () => {
    async function loadTest() {
        var [owner, alice, bob, carl] = await ethers.getSigners();
        var USDT = await ethers.getContractFactory("TetherUSD");
        var usdt = await USDT.deploy();
        var DJ = await ethers.getContractFactory("DreamJunk");
        var dj = await DJ.deploy()

        var VESTING = await ethers.getContractFactory("Vesting");
        var vesting = await upgrades.deployProxy(VESTING, 
            [dj.target, [usdt.target]],
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
            
            let startTime = 1706745600
            let endTime = 1709251199
            let tokenPrice = "0.04"
            let initialBalance = "8000000"
            let maxTokensPerInvestor = "400000"

            let amount = ethers.parseEther("8000000")

            await dj.approve(vesting, amount)
            await vesting.createPhase(startTime, endTime, ethers.parseEther(tokenPrice), ethers.parseEther(initialBalance), ethers.parseEther(maxTokensPerInvestor))

            expect((await vesting.getPhases.call())[0].startTime).to.be.equal(startTime)
            expect(await dj.balanceOf(vesting)).to.be.equal(amount)
        });
    });

    describe("Invest", () => {
        it("Invest in phase ", async () => {
            var { vesting, usdt, dj } = await loadFixture(loadTest);

            let phasesList = await vesting.getPhases.call()
            console.log(phasesList.length)

            await dj.approve(vesting, ethers.parseEther("8000000"))
            await vesting.createPhase(1706745600, ethers.parseEther("0.04"), ethers.parseEther("8000000"), ethers.parseEther("400000"))

            phasesList = await vesting.getPhases.call()
            console.log(phasesList.length)
        });
    });

});