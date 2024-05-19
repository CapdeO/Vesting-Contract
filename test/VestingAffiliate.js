var { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var { expect } = require("chai");
var { ethers, upgrades } = require("hardhat");
var { time } = require("@nomicfoundation/hardhat-network-helpers");

// Saturday, 1 June 2024 0:00:00 --> Sunday, 30 June 2024 23:59:59
const phase0 = [1717200000, 1719791999, 0, ethers.parseEther("0.04"), ethers.parseEther("8000000"), ethers.parseEther("400000")]

// const phase1 = [1711929600, 1714521599, 0, ethers.parseEther("0.06"),  ethers.parseEther("32000000"), ethers.parseEther("1600000")]
// const phase2 = [1714521600, 1717199999, 0, ethers.parseEther("0.07"),   ethers.parseEther("6000000"),  ethers.parseEther("300000")]
// const phase3 = [1717200000, 1719791999, 0, ethers.parseEther("0.075"), ethers.parseEther("40000000"), ethers.parseEther("2000000")]
// const phase4 = [1719792000, 1722470399, 0, ethers.parseEther("0.08"),  ethers.parseEther("40000000"), ethers.parseEther("2000000")]
// const phase5 = [1722470400, 1725148799, 0, ethers.parseEther("0.085"), ethers.parseEther("60000000"), ethers.parseEther("3000000")]
// const phase6 = [1725148800, 1727740799, 0, ethers.parseEther("0.09"),  ethers.parseEther("64000000"), ethers.parseEther("3200000")]
// const phase7 = [1727740800, 1730419199, 0, ethers.parseEther("0.095"), ethers.parseEther("70000000"), ethers.parseEther("3500000")]

const vestingEnd = 1782864000 // Wednesday, 1 July 2026 0:00:00
const oneMonth = 2629743 // In secs

function toNormal(_number) {
    let number = _number.toString()
    return (number / 10 ** 18).toFixed(2)
}

describe("Vesting Contract", () => {
    async function loadTest() {
        var [owner, alice, bob, carl, race, recUSDT, recUSDC, recBUSD, donation] = await ethers.getSigners();

        var USDT = await ethers.getContractFactory("TetherUSD");
        var usdt = await USDT.deploy();
        var USDC = await ethers.getContractFactory("USDC");
        var usdc = await USDC.deploy();
        var BUSD = await ethers.getContractFactory("BUSD");
        var busd = await BUSD.deploy();
        var DRM = await ethers.getContractFactory("DreamJunk");
        var drm = await DRM.deploy()

        var VESTING = await ethers.getContractFactory("contracts/VestingAffiliate.sol:VestingAffiliate");
        var vesting = await upgrades.deployProxy(VESTING,
            [
                drm.target,
                usdt.target,
                usdc.target,
                busd.target,
                race.address,
                recUSDT.address,
                recUSDC.address,
                recBUSD.address,
                donation.address
            ],
            { initializer: 'initialize', kind: 'uups' });

        return { vesting, usdt, usdc, busd, drm, owner, alice, bob, carl, race, recUSDT, recUSDC, recBUSD, donation };
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
        it("Stablecoin receiver", async () => {
            var { vesting, drm, usdt, usdc, busd, recUSDT, recUSDC, recBUSD, bob, alice } = await loadFixture(loadTest);

            let amount = ethers.parseEther("8000000")
            await drm.approve(vesting.target, amount)
            await usdt.approve(vesting.target, ethers.parseUnits("5", 6))
            await usdc.approve(vesting.target, ethers.parseUnits("5", 6))
            await busd.approve(vesting.target, ethers.parseUnits("5", 18))

            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(...phase0)

            await time.increaseTo(1717200000) // Saturday, 1 June 2024 0:00:00

            await vesting.invest(usdt.target, ethers.parseUnits("5", 6), "", 0)
            await vesting.invest(usdc.target, ethers.parseUnits("5", 6), "", 0)
            await vesting.invest(busd.target, ethers.parseUnits("5", 18), "", 0)

            expect(await usdt.balanceOf(recUSDT)).to.equal(ethers.parseUnits("5", 6))
            expect(await usdc.balanceOf(recUSDC)).to.equal(ethers.parseUnits("5", 6))
            expect(await busd.balanceOf(recBUSD)).to.equal(ethers.parseUnits("5", 18))
        });

        it("Referral code", async () => {
            var { vesting, drm, usdt, usdc, busd, recUSDT, recUSDC, recBUSD, bob, alice } = await loadFixture(loadTest);

            let amount = ethers.parseEther("8000000")
            await drm.approve(vesting.target, amount)
            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(...phase0)
            await usdt.transfer(bob.address, ethers.parseUnits("100", 6))
            await usdt.connect(bob).approve(vesting.target, ethers.parseUnits("100", 6))

            await time.increaseTo(1717200000) // Saturday, 1 June 2024 0:00:00

            await vesting.connect(alice).setReferralCode("aliceCode")
            await expect(vesting.connect(alice).setReferralCode("aliceCode")).to.revertedWith("Referral code already used.")
            await expect(vesting.connect(alice).setReferralCode("aliceCodee")).to.revertedWith("This address already has a referral code.")
            await expect(vesting.connect(bob).invest(usdt.target, ethers.parseUnits("5", 6), "aliceCodee", 0)).to.revertedWith("Invalid referral code.")
            await vesting.connect(bob).invest(usdt.target, ethers.parseUnits("5", 6), "aliceCode", 0)

            let expectedReferralAmount = ethers.parseUnits("5", 6) * BigInt(3) / BigInt(100)
            let expectedReceiverAmount = ethers.parseUnits("5", 6) * BigInt(97) / BigInt(100)
            expect(await usdt.balanceOf(alice.address)).to.equal(expectedReferralAmount)
            expect(await usdt.balanceOf(recUSDT)).to.equal(expectedReceiverAmount)

            await vesting.connect(bob).invest(usdt.target, ethers.parseUnits("5", 6), "aliceCode", 0)

            expectedReferralAmount = expectedReferralAmount + (ethers.parseUnits("5", 6) * BigInt(5) / BigInt(100))
            expectedReceiverAmount = expectedReceiverAmount + (ethers.parseUnits("5", 6) * BigInt(95) / BigInt(100))

            expect(await usdt.balanceOf(alice.address)).to.equal(expectedReferralAmount)
            expect(await usdt.balanceOf(recUSDT)).to.equal(expectedReceiverAmount)

            await vesting.connect(bob).invest(usdt.target, ethers.parseUnits("5", 6), "aliceCode", 0)

            expectedReferralAmount = expectedReferralAmount + (ethers.parseUnits("5", 6) * BigInt(7) / BigInt(100))
            expectedReceiverAmount = expectedReceiverAmount + (ethers.parseUnits("5", 6) * BigInt(93) / BigInt(100))

            expect(await usdt.balanceOf(alice.address)).to.equal(expectedReferralAmount)
            expect(await usdt.balanceOf(recUSDT)).to.equal(expectedReceiverAmount)

            await vesting.connect(bob).invest(usdt.target, ethers.parseUnits("5", 6), "aliceCode", 0)

            expectedReceiverAmount = expectedReceiverAmount + ethers.parseUnits("5", 6)

            expect(await usdt.balanceOf(alice.address)).to.equal(expectedReferralAmount)
            expect(await usdt.balanceOf(recUSDT)).to.equal(expectedReceiverAmount)

            let bobInvestment = await vesting.getUserInvestment(bob.address, 0)

            expect(bobInvestment[0]).to.equal(ethers.parseEther("500"))
            expect(bobInvestment[1]).to.equal(ethers.parseEther("500"))
            expect(bobInvestment[2]).to.equal(0)
        });
    });

});