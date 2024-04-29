var { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var { expect } = require("chai");
var { ethers, upgrades } = require("hardhat");
var { time } = require("@nomicfoundation/hardhat-network-helpers");

// Tuesday, 14 May 2024 0:00:00 --> Monday, 1 July 2024 0:00:00
const phase0 = [1715644800, 1719792000, 0, ethers.parseEther("0.04"), ethers.parseEther("8000000"), ethers.parseEther("400000")]

// const phase1 = [1711929600, 1714521599, 0, ethers.parseEther("0.06"),  ethers.parseEther("32000000"), ethers.parseEther("1600000")]
// const phase2 = [1714521600, 1717199999, 0, ethers.parseEther("0.07"),   ethers.parseEther("6000000"),  ethers.parseEther("300000")]
// const phase3 = [1717200000, 1719791999, 0, ethers.parseEther("0.075"), ethers.parseEther("40000000"), ethers.parseEther("2000000")]
// const phase4 = [1719792000, 1722470399, 0, ethers.parseEther("0.08"),  ethers.parseEther("40000000"), ethers.parseEther("2000000")]
// const phase5 = [1722470400, 1725148799, 0, ethers.parseEther("0.085"), ethers.parseEther("60000000"), ethers.parseEther("3000000")]
// const phase6 = [1725148800, 1727740799, 0, ethers.parseEther("0.09"),  ethers.parseEther("64000000"), ethers.parseEther("3200000")]
// const phase7 = [1727740800, 1730419199, 0, ethers.parseEther("0.095"), ethers.parseEther("70000000"), ethers.parseEther("3500000")]
const vestingEnd = 1778716800 // Thursday, 14 May 2026 0:00:00
const oneMonth = 2629743 // In secs

function toNormal(_number) {
    let number = _number.toString()
    return (number / 10 ** 18).toFixed(2)
}

describe("Vesting Contract", () => {
    async function loadTest() {
        var [owner, alice, bob, carl, race, recUSDT, recUSDC, recBUSD] = await ethers.getSigners();

        var USDT = await ethers.getContractFactory("TetherUSD");
        var usdt = await USDT.deploy();
        var USDC = await ethers.getContractFactory("USDC");
        var usdc = await USDC.deploy();
        var BUSD = await ethers.getContractFactory("BUSD");
        var busd = await BUSD.deploy();
        var DRM = await ethers.getContractFactory("DreamJunk");
        var drm = await DRM.deploy()

        var VESTING = await ethers.getContractFactory("contracts/Vesting2.sol:Vesting");
        var vesting = await upgrades.deployProxy(VESTING,
            [
                drm.target,
                usdt.target,
                usdc.target,
                busd.target,
                race.address,
                recUSDT.address,
                recUSDC.address,
                recBUSD.address
            ],
            { initializer: 'initialize', kind: 'uups' });

        return { vesting, usdt, usdc, busd, drm, owner, alice, bob, carl, race, recUSDT, recUSDC, recBUSD };
    }

    describe("Deploy", () => {
        it("Token addresses", async () => {
            var { vesting, usdt, usdc, busd } = await loadFixture(loadTest);

            expect((await vesting.tokensSupported(usdt.target))).to.be.equal(true)
            expect((await vesting.tokensSupported(usdc.target))).to.be.equal(true)
            expect((await vesting.tokensSupported(busd.target))).to.be.equal(true)

            let ahora = new Date();              // obtener la fecha y hora actual
            let timestamp = await time.latest(); // obtener bloque actual
        });
    });

    describe("Create Phase", () => {
        it("Parameters", async () => {
            var { vesting, drm } = await loadFixture(loadTest);

            let amount = ethers.parseEther("8000000")
            await drm.approve(vesting.target, amount)

            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(...phase0)

            expect((await vesting.vestingEnd.call())).to.be.equal(vestingEnd)
            expect((await vesting.interval.call())).to.be.equal(oneMonth)
            expect((await vesting.getPhases.call())[0].startTime).to.be.equal(phase0[0])
            expect(await drm.balanceOf(vesting)).to.equal(amount)
        });
    });

    describe("Invest", () => {
        it("Invest", async () => {
            var { vesting, drm, usdt, recUSDT } = await loadFixture(loadTest);

            let amount = ethers.parseEther("8000000")
            await drm.approve(vesting.target, amount)
            await usdt.approve(vesting.target, ethers.parseUnits("50", 6))

            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(...phase0)

            await time.increaseTo(1715731200) // Wednesday, 15 May 2024 0:00:00

            await vesting.invest(usdt.target, ethers.parseUnits("50", 6))

            console.log(await usdt.balanceOf(recUSDT))
        });
    });

});