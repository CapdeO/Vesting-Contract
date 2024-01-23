var { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var { expect } = require("chai");
var { ethers, upgrades } = require("hardhat");
var { time } = require("@nomicfoundation/hardhat-network-helpers");

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
            let tokenPrice = "0.04"
            let initialBalance = "8000000"
            let maxTokensPerInvestor = "400000"

            let amount = ethers.parseEther("8000000")

            await dj.approve(vesting, amount)
            await vesting.createPhase(startTime, ethers.parseEther(tokenPrice), ethers.parseEther(initialBalance), ethers.parseEther(maxTokensPerInvestor))

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