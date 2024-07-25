var { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var { expect } = require("chai");
var { ethers, upgrades } = require("hardhat");
var { time } = require("@nomicfoundation/hardhat-network-helpers");

// 	Monday, 1 July 2024 0:00:00 --> Wednesday, 31 July 2024 23:59:59
const phase0 = [1719792000, 1722470399, 0, ethers.parseEther("0.04"), ethers.parseEther("8000000"), ethers.parseEther("400000")]

// const phase1 = [1711929600, 1714521599, 0, ethers.parseEther("0.06"),  ethers.parseEther("32000000"), ethers.parseEther("1600000")]
// const phase2 = [1714521600, 1717199999, 0, ethers.parseEther("0.07"),   ethers.parseEther("6000000"),  ethers.parseEther("300000")]
// const phase3 = [1717200000, 1719791999, 0, ethers.parseEther("0.075"), ethers.parseEther("40000000"), ethers.parseEther("2000000")]
// const phase4 = [1719792000, 1722470399, 0, ethers.parseEther("0.08"),  ethers.parseEther("40000000"), ethers.parseEther("2000000")]
// const phase5 = [1722470400, 1725148799, 0, ethers.parseEther("0.085"), ethers.parseEther("60000000"), ethers.parseEther("3000000")]
// const phase6 = [1725148800, 1727740799, 0, ethers.parseEther("0.09"),  ethers.parseEther("64000000"), ethers.parseEther("3200000")]
// const phase7 = [1727740800, 1730419199, 0, ethers.parseEther("0.095"), ethers.parseEther("70000000"), ethers.parseEther("3500000")]

const vestingEnd = 1785542400 // Saturday, 1 August 2026 0:00:00
const oneMonth = 2629743 // In secs

function toNormal(_number) {
    let number = _number.toString()
    return (number / 10 ** 18).toFixed(2)
}

describe("Vesting Contract", () => {
    async function loadTest() {
        var [owner, alice, bob, carl, race, donation] = await ethers.getSigners()

        var USDT = await ethers.getContractFactory("TetherUSD")
        var usdt = await USDT.deploy()
        var USDC = await ethers.getContractFactory("USDC")
        var usdc = await USDC.deploy()
        var BUSD = await ethers.getContractFactory("BUSD")
        var busd = await BUSD.deploy()
        var DRM = await ethers.getContractFactory("DreamJunk")
        var drm = await DRM.deploy()

        var VESTING = await ethers.getContractFactory("contracts/VestingAffiliate/VestingAffiliate.sol:VestingAffiliate")
        var vesting = await upgrades.deployProxy(VESTING,
            [
                drm.target,
                usdt.target,
                usdc.target,
                busd.target,
                race.address,
                donation.address
            ],
            { initializer: 'initialize', kind: 'uups' })

        return { vesting, usdt, usdc, busd, drm, owner, alice, bob, carl, race, donation }
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
        it("Params", async () => {
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
        it("Owner receive & totalInvestment struct", async () => {
            var { vesting, drm, usdt, usdc, busd, owner, race, bob, alice } = await loadFixture(loadTest);

            let amount = ethers.parseEther("8000000")
            await drm.approve(vesting.target, amount)
            await usdt.approve(vesting.target, ethers.parseUnits("5", 6))
            await usdc.approve(vesting.target, ethers.parseUnits("5", 6))
            await busd.approve(vesting.target, ethers.parseUnits("5", 18))

            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(...phase0)

            expect(await vesting.invest(usdt.target, ethers.parseUnits("5", 6), "", 0))
                .to.emit(vesting, "BuyTokens")
                .withArgs(0, owner.address, ethers.parseEther("5"), ethers.parseEther("125"))
            await vesting.invest(usdc.target, ethers.parseUnits("5", 6), "", 0)
            await vesting.invest(busd.target, ethers.parseUnits("5", 18), "", 0)

            expect(await usdt.balanceOf(race)).to.equal(ethers.parseUnits("5", 6))
            expect(await usdc.balanceOf(race)).to.equal(ethers.parseUnits("5", 6))
            expect(await busd.balanceOf(race)).to.equal(ethers.parseUnits("5", 18))
            expect((await vesting.affiliates(owner)).totalInvestment).to.equal(ethers.parseEther("15"))

            const investor = await vesting.getUserInvestment(owner, 0)

            expect(investor[0]).to.equal(ethers.parseEther("375"))
        });

        it("Afilliate level 1", async () => {
            var { vesting, drm, usdt, usdc, busd, owner, bob, alice } = await loadFixture(loadTest);

            let amount = ethers.parseEther("8000000")
            await drm.approve(vesting.target, amount)
            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(...phase0)

            await usdt.transfer(bob, ethers.parseUnits("100", 6))
            await usdt.transfer(alice, ethers.parseUnits("100", 6))
            await usdt.connect(bob).approve(vesting.target, ethers.parseUnits("100", 6))
            await usdt.connect(alice).approve(vesting.target, ethers.parseUnits("100", 6))

            await expect(vesting.connect(bob).setReferralCode("bobCode")).to.revertedWith("User without affiliate level.")
            await vesting.connect(bob).invest(usdt.target, ethers.parseUnits("50", 6), "", 0)
            await expect(vesting.connect(bob).setReferralCode("bobCode")).to.revertedWith("User without affiliate level.")
            await vesting.connect(bob).invest(usdt.target, ethers.parseUnits("50", 6), "", 0)

            expect((await vesting.affiliates(bob))[0]).to.equal(1)
            expect((await vesting.affiliates(bob))[1]).to.equal(ethers.parseEther("100"))
            expect((await vesting.affiliates(bob))[4]).to.equal(false)
            await vesting.connect(bob).setReferralCode("bobCode")
            expect((await vesting.affiliates(bob))[4]).to.equal(true)
            expect((await vesting.affiliates(bob))[5]).to.equal("bobCode")
            expect(await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", alice, ethers.parseEther("3"))
            expect(await usdt.balanceOf(bob)).to.equal(ethers.parseUnits("3", 6))
            expect((await vesting.affiliates(bob))[2]).to.equal(ethers.parseEther("3"))
            expect((await vesting.affiliates(bob))[3]).to.equal(1)
        })

        it("Afilliate level 2 at 10 referrals", async () => {
            var { vesting, drm, usdt, usdc, busd, owner, bob, alice } = await loadFixture(loadTest);

            let amount = ethers.parseEther("8000000")
            await drm.approve(vesting.target, amount)
            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(...phase0)

            await usdt.transfer(bob, ethers.parseUnits("100", 6))
            await usdt.transfer(alice, ethers.parseUnits("100", 6))
            await usdt.connect(bob).approve(vesting.target, ethers.parseUnits("100", 6))
            await usdt.connect(alice).approve(vesting.target, ethers.parseUnits("100", 6))

            await vesting.connect(bob).invest(usdt.target, ethers.parseUnits("100", 6), "", 0)
            await vesting.connect(bob).setReferralCode("bobCode")

            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)

            expect((await vesting.affiliates(bob))[0]).to.equal(2)
            expect((await vesting.affiliates(bob))[3]).to.equal(10)

            expect(await usdt.balanceOf(bob)).to.equal(ethers.parseUnits("3", 6))
            expect((await vesting.affiliates(bob))[2]).to.equal(ethers.parseEther("3"))

            await usdt.transfer(alice, ethers.parseUnits("100", 6))
            await usdt.connect(alice).approve(vesting.target, ethers.parseUnits("100", 6))

            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("100", 6), "bobCode", 0)

            expect(await usdt.balanceOf(bob)).to.equal(ethers.parseUnits("8", 6))
            expect((await vesting.affiliates(bob))[2]).to.equal(ethers.parseEther("8"))
            expect((await vesting.affiliates(bob))[3]).to.equal(11)
            expect((await vesting.affiliates(bob))[0]).to.equal(2)
        })

        it("Afilliate level 2 at once", async () => {
            var { vesting, drm, usdt, usdc, busd, owner, bob, alice } = await loadFixture(loadTest);

            let amount = ethers.parseEther("8000000")
            await drm.approve(vesting.target, amount)
            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(...phase0)

            await usdt.transfer(bob, ethers.parseUnits("250", 6))
            await usdt.connect(bob).approve(vesting.target, ethers.parseUnits("250", 6))
            await vesting.connect(bob).invest(usdt.target, ethers.parseUnits("250", 6), "", 0)
            await vesting.connect(bob).setReferralCode("bobCode")
            expect((await vesting.affiliates(bob))[0]).to.equal(2)

            await usdt.transfer(alice, ethers.parseUnits("100", 6))
            await usdt.connect(alice).approve(vesting.target, ethers.parseUnits("100", 6))
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("100", 6), "bobCode", 0)
            expect(await usdt.balanceOf(bob)).to.equal(ethers.parseUnits("5", 6))
        })

        it("Afilliate level 3 at 20 referrals", async () => {
            var { vesting, drm, usdt, usdc, busd, owner, bob, alice } = await loadFixture(loadTest);

            let amount = ethers.parseEther("8000000")
            await drm.approve(vesting.target, amount)
            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(...phase0)

            await usdt.transfer(bob, ethers.parseUnits("100", 6))
            await usdt.transfer(alice, ethers.parseUnits("300", 6))
            await usdt.connect(bob).approve(vesting.target, ethers.parseUnits("100", 6))
            await usdt.connect(alice).approve(vesting.target, ethers.parseUnits("300", 6))
            await usdt.approve(vesting.target, ethers.parseUnits("100", 6))
            await usdc.approve(vesting.target, ethers.parseUnits("100", 6))

            await vesting.connect(bob).invest(usdt.target, ethers.parseUnits("100", 6), "", 0)
            await vesting.connect(bob).setReferralCode("bobCode")

            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.invest(usdc.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)

            expect((await vesting.affiliates(bob))[0]).to.equal(2)
            expect((await vesting.affiliates(bob))[3]).to.equal(10)
            expect((await vesting.affiliates(bob))[2]).to.equal(ethers.parseEther("3"))
            expect(await usdt.balanceOf(bob)).to.equal(ethers.parseUnits("2.7", 6))
            expect(await usdc.balanceOf(bob)).to.equal(ethers.parseUnits("0.3", 6))

            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)
            await vesting.invest(usdt.target, ethers.parseUnits("10", 6), "bobCode", 0)

            expect((await vesting.affiliates(bob))[0]).to.equal(3)
            expect((await vesting.affiliates(bob))[3]).to.equal(20)

            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("100", 6), "bobCode", 0)

            expect((await vesting.affiliates(bob))[0]).to.equal(3)
            expect((await vesting.affiliates(bob))[3]).to.equal(21)
            expect(await usdt.balanceOf(bob)).to.equal(ethers.parseUnits("14.7", 6))
        })

        it("Afilliate level 3 at once", async () => {
            var { vesting, drm, usdt, usdc, busd, owner, bob, alice } = await loadFixture(loadTest);

            let amount = ethers.parseEther("8000000")
            await drm.approve(vesting.target, amount)
            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(...phase0)

            await usdt.transfer(bob, ethers.parseUnits("500", 6))
            await usdt.connect(bob).approve(vesting.target, ethers.parseUnits("500", 6))
            await vesting.connect(bob).invest(usdt.target, ethers.parseUnits("500", 6), "", 0)
            await vesting.connect(bob).setReferralCode("bobCode")
            expect((await vesting.affiliates(bob))[0]).to.equal(3)

            await usdt.transfer(alice, ethers.parseUnits("100", 6))
            await usdt.connect(alice).approve(vesting.target, ethers.parseUnits("100", 6))
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("100", 6), "bobCode", 0)
            expect(await usdt.balanceOf(bob)).to.equal(ethers.parseUnits("7", 6))
        })

        it("Referral code", async () => {
            var { vesting, drm, usdt, usdc, busd, recUSDT, race, bob, alice } = await loadFixture(loadTest);

            let amount = ethers.parseEther("8000000")
            await drm.approve(vesting.target, amount)
            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(...phase0)
            await usdt.transfer(bob, ethers.parseUnits("100", 6))
            await usdt.transfer(alice, ethers.parseUnits("100", 6))
            await usdt.connect(bob).approve(vesting.target, ethers.parseUnits("100", 6))
            await usdt.connect(alice).approve(vesting.target, ethers.parseUnits("100", 6))

            await vesting.connect(bob).invest(usdt.target, ethers.parseUnits("100", 6), "", 0)
            await vesting.connect(bob).setReferralCode("bobCode")
            await expect(vesting.connect(bob).setReferralCode("bobCode2")).to.revertedWith("This address already has a referral code.")

            await expect(vesting.connect(alice).invest(usdt.target, ethers.parseUnits("5", 6), "bobCode2", 0)).to.revertedWith("Invalid referral code.")
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("100", 6), "bobCode", 0)
            await expect(vesting.connect(alice).setReferralCode("bobCode")).to.revertedWith("Referral code already used.")

            expect(await usdt.balanceOf(bob)).to.equal(ethers.parseUnits("3", 6))
            expect(await usdt.balanceOf(race)).to.equal(ethers.parseUnits("197", 6))
        });

        it("Donation", async () => {
            var { vesting, drm, usdt, race, donation, bob, alice } = await loadFixture(loadTest);

            let amount = ethers.parseEther("8000000")
            await drm.approve(vesting.target, amount)
            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(...phase0)
            await usdt.transfer(bob, ethers.parseUnits("130", 6))
            await usdt.connect(bob).approve(vesting.target, ethers.parseUnits("130", 6))

            expect(await vesting.connect(bob).invest(usdt.target, ethers.parseUnits("100", 6), "", 30))
                .to.emit(vesting, "Donation")
                .withArgs(bob, ethers.parseUnits("30", 6))

            expect(await usdt.balanceOf(donation)).to.equal(ethers.parseUnits("30", 6))
            expect(await usdt.balanceOf(race)).to.equal(ethers.parseUnits("100", 6))
        });

        it("Ban", async () => {
            var { vesting, drm, usdt, race, donation, bob, alice } = await loadFixture(loadTest);

            let amount = ethers.parseEther("8000000")
            await drm.approve(vesting.target, amount)
            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(...phase0)
            await usdt.transfer(bob, ethers.parseUnits("100", 6))
            await usdt.connect(bob).approve(vesting.target, ethers.parseUnits("100", 6))

            await vesting.connect(bob).invest(usdt.target, ethers.parseUnits("100", 6), "", 0)
            await vesting.connect(bob).setReferralCode("bobCode")

            await usdt.transfer(alice, ethers.parseUnits("200", 6))
            await usdt.connect(alice).approve(vesting.target, ethers.parseUnits("200", 6))
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("100", 6), "bobCode", 0)
            expect(await usdt.balanceOf(bob)).to.equal(ethers.parseUnits("3", 6))

            await vesting.banAffiliate(bob, 2629743)

            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("100", 6), "bobCode", 0)
            expect(await usdt.balanceOf(bob)).to.equal(ethers.parseUnits("3", 6))

            expect(await usdt.balanceOf(race)).to.equal(ethers.parseUnits("297", 6))
        });

        it("Set level", async () => {
            var { vesting, drm, usdt, race, donation, bob, alice } = await loadFixture(loadTest);

            let amount = ethers.parseEther("8000000")
            await drm.approve(vesting.target, amount)
            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(...phase0)

            await vesting.setLevel(bob, 3)

            await vesting.connect(bob).setReferralCode("bobCode")

            await usdt.transfer(alice, ethers.parseUnits("200", 6))
            await usdt.connect(alice).approve(vesting.target, ethers.parseUnits("200", 6))
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("100", 6), "bobCode", 0)
            expect(await usdt.balanceOf(bob)).to.equal(ethers.parseUnits("7", 6))

            await vesting.setLevel(bob, 1)

            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("100", 6), "bobCode", 0)
            expect(await usdt.balanceOf(bob)).to.equal(ethers.parseUnits("10", 6))

            expect(await usdt.balanceOf(race)).to.equal(ethers.parseUnits("190", 6))
        });
    });

    // describe("V2", () => {
    //     it("setPhaseDates", async () => {
    //         var { vesting, drm, usdt, usdc, busd, recUSDT, recUSDC, recBUSD, bob, alice } = await loadFixture(loadTest);

    //         let amount = ethers.parseEther("8000000")
    //         await drm.approve(vesting.target, amount)
    //         await usdt.approve(vesting.target, ethers.parseUnits("10", 6))

    //         await vesting.setVestingParams(vestingEnd, oneMonth)
    //         await vesting.createPhase(...phase0)

    //         // await time.increaseTo(1719792000) // Monday, 1 July 2024 0:00:00

    //         await vesting.invest(usdt.target, ethers.parseUnits("5", 6), "", 0)

    //         await vesting.setPhaseDates(0, 1722470400, 1725148799)

    //         await expect(vesting.invest(usdt.target, ethers.parseUnits("5", 6), "", 0)).to.revertedWith("No active vesting phase for the current time.")

    //         await time.increaseTo(1722470400)

    //         await vesting.invest(usdt.target, ethers.parseUnits("5", 6), "", 0)
    //     });


    // });
});