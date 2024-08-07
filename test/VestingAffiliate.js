var { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var { expect } = require("chai");
var { ethers, upgrades } = require("hardhat");
var { time } = require("@nomicfoundation/hardhat-network-helpers");

const pETH = ethers.parseEther
const fETH = ethers.formatEther
const pUNI = ethers.parseUnits
const fUNI = ethers.formatUnits
const log = console.log

// 	Thursday, 1 August 2024 0:00:00 --> Saturday, 31 August 2024 23:59:59
const phase0 = [1722470400, 1725148799, 0, pETH("0.04"), pETH("8000000"), pETH("400000")]

// const phase1 = [1711929600, 1714521599, 0, pETH("0.06"),  pETH("32000000"), pETH("1600000")]
// const phase2 = [1714521600, 1717199999, 0, pETH("0.07"),   pETH("6000000"),  pETH("300000")]
// const phase3 = [1717200000, 1719791999, 0, pETH("0.075"), pETH("40000000"), pETH("2000000")]
// const phase4 = [1719792000, 1722470399, 0, pETH("0.08"),  pETH("40000000"), pETH("2000000")]
// const phase5 = [1722470400, 1725148799, 0, pETH("0.085"), pETH("60000000"), pETH("3000000")]
// const phase6 = [1725148800, 1727740799, 0, pETH("0.09"),  pETH("64000000"), pETH("3200000")]
// const phase7 = [1727740800, 1730419199, 0, pETH("0.095"), pETH("70000000"), pETH("3500000")]

const vestingEnd = 1788220800 // Tuesday, 1 September 2026 0:00:00
const oneMonth = 2629743 // In secs

describe("Vesting Contract", () => {
    async function loadTest() {
        var [owner, alice, bob, carl, clint, race, donation] = await ethers.getSigners()

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

        await drm.approve(vesting.target, pETH("8000000"))
        await vesting.setVestingParams(vestingEnd, oneMonth)
        await vesting.createPhase(...phase0)

        return { vesting, usdt, usdc, busd, drm, owner, alice, bob, carl, clint, race, donation }
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

            expect((await vesting.vestingEnd.call())).to.be.equal(vestingEnd)
            expect((await vesting.interval.call())).to.be.equal(oneMonth)
            expect((await vesting.getPhases.call())[0].startTime).to.be.equal(phase0[0])
            expect(await drm.balanceOf(vesting)).to.equal(pETH("8000000"))
        });
    });

    describe("Invest", () => {
        it("Owner receive & totalInvestment struct", async () => {
            var { vesting, drm, usdt, usdc, busd, owner, race, bob, alice } = await loadFixture(loadTest);

            await usdt.approve(vesting.target, pUNI("5", 6))
            await usdc.approve(vesting.target, pUNI("5", 6))
            await busd.approve(vesting.target, pUNI("5", 18))

            await expect(vesting.invest(usdt.target, pUNI("5", 6), "", 0))
                .to.emit(vesting, "BuyTokens")
                .withArgs(0, owner.address, pETH("5"), pETH("125"))
            await vesting.invest(usdc.target, pUNI("5", 6), "", 0)
            await vesting.invest(busd.target, pUNI("5", 18), "", 0)

            expect(await usdt.balanceOf(race)).to.equal(pUNI("5", 6))
            expect(await usdc.balanceOf(race)).to.equal(pUNI("5", 6))
            expect(await busd.balanceOf(race)).to.equal(pUNI("5", 18))
            expect((await vesting.affiliates(owner)).totalInvestment).to.equal(pETH("15"))

            const investor = await vesting.getUserInvestment(owner, 0)

            expect(investor[0]).to.equal(pETH("375"))
        });

        it("Afilliate common person - first investment", async () => {
            var { vesting, drm, usdt, usdc, busd, owner, bob, alice } = await loadFixture(loadTest);

            await usdt.transfer(bob, pUNI("25", 6))
            await usdt.transfer(alice, pUNI("200", 6))
            await usdt.connect(bob).approve(vesting.target, pUNI("25", 6))
            await usdt.connect(alice).approve(vesting.target, pUNI("200", 6))

            await expect(vesting.connect(bob).setReferralCode("bobCode")).to.revertedWith("Minimum investment of 25 dollars required.")
            await vesting.connect(bob).invest(usdt.target, pUNI("24", 6), "", 0)
            await expect(vesting.connect(bob).setReferralCode("bobCode")).to.revertedWith("Minimum investment of 25 dollars required.")
            await vesting.connect(bob).invest(usdt.target, pUNI("1", 6), "", 0)

            expect((await vesting.affiliates(bob))[0]).to.equal(false)
            expect((await vesting.affiliates(bob))[1]).to.equal(pETH("25"))
            expect((await vesting.affiliates(bob))[8]).to.equal(false)
            await vesting.connect(bob).setReferralCode("bobCode")
            expect((await vesting.affiliates(bob))[8]).to.equal(true)
            expect((await vesting.affiliates(bob))[9]).to.equal("bobCode")
            expect(await usdt.balanceOf(vesting)).to.equal(0)
            await expect(vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", alice, pETH("3"))
            expect(await usdt.balanceOf(vesting)).to.equal(pUNI("3", 6))
            expect((await vesting.affiliates(bob))[2]).to.equal(pETH("3"))
            expect((await vesting.affiliates(bob))[7]).to.equal(1)
            expect((await vesting.affiliates(bob))[3]).to.equal(pUNI("3", 6))
            expect(await vesting.codeUsageCounter(bob, alice)).to.equal(1)

            await expect(vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", alice, 0)

            expect(await usdt.balanceOf(vesting)).to.equal(pUNI("3", 6))
        })

        it("Afilliate common person - second investment", async () => {
            var { vesting, drm, usdt, usdc, busd, owner, bob, alice } = await loadFixture(loadTest);

            await usdt.transfer(bob, pUNI("75", 6))
            await usdt.transfer(alice, pUNI("300", 6))
            await usdt.connect(bob).approve(vesting.target, pUNI("75", 6))
            await usdt.connect(alice).approve(vesting.target, pUNI("300", 6))

            await vesting.connect(bob).invest(usdt.target, pUNI("75", 6), "", 0)

            expect((await vesting.affiliates(bob))[1]).to.equal(pETH("75"))
            await vesting.connect(bob).setReferralCode("bobCode")
            expect(await usdt.balanceOf(vesting)).to.equal(0)
            await expect(vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", alice, pETH("3"))
            expect(await usdt.balanceOf(vesting)).to.equal(pUNI("3", 6))
            await expect(vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", alice, pETH("5"))


            expect(await usdt.balanceOf(vesting)).to.equal(pUNI("8", 6))
            expect((await vesting.affiliates(bob))[2]).to.equal(pETH("8"))
            expect((await vesting.affiliates(bob))[7]).to.equal(2)
            expect((await vesting.affiliates(bob))[3]).to.equal(pUNI("8", 6))
            expect(await vesting.codeUsageCounter(bob, alice)).to.equal(2)
        })

        it("Afilliate common person - third investment", async () => {
            var { vesting, drm, usdt, usdc, busd, owner, bob, alice } = await loadFixture(loadTest);

            await usdt.transfer(bob, pUNI("150", 6))
            await usdt.transfer(alice, pUNI("300", 6))
            await usdt.connect(bob).approve(vesting.target, pUNI("150", 6))
            await usdt.connect(alice).approve(vesting.target, pUNI("300", 6))

            await vesting.connect(bob).invest(usdt.target, pUNI("150", 6), "", 0)

            expect((await vesting.affiliates(bob))[1]).to.equal(pETH("150"))
            await vesting.connect(bob).setReferralCode("bobCode")
            expect(await usdt.balanceOf(vesting)).to.equal(0)
            await expect(vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", alice, pETH("3"))
            expect(await usdt.balanceOf(vesting)).to.equal(pUNI("3", 6))
            await expect(vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", alice, pETH("5"))
            expect(await usdt.balanceOf(vesting)).to.equal(pUNI("8", 6))
            await expect(vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", alice, pETH("7"))
            expect(await usdt.balanceOf(vesting)).to.equal(pUNI("15", 6))

            expect((await vesting.affiliates(bob))[2]).to.equal(pETH("15"))
            expect((await vesting.affiliates(bob))[7]).to.equal(3)
            expect((await vesting.affiliates(bob))[3]).to.equal(pUNI("15", 6))
            expect(await vesting.codeUsageCounter(bob, alice)).to.equal(3)
        })

        it("Afilliate influencer", async () => {
            var { vesting, drm, usdt, usdc, busd, owner, bob, alice, clint } = await loadFixture(loadTest);

            await usdt.transfer(alice, pUNI("1000", 6))
            await usdt.transfer(clint, pUNI("1000", 6))
            await usdt.connect(alice).approve(vesting.target, pUNI("1000", 6))
            await usdt.connect(clint).approve(vesting.target, pUNI("1000", 6))

            await vesting.setInfluencer(bob)

            expect((await vesting.affiliates(bob))[0]).to.equal(true)
            expect((await vesting.affiliates(bob))[1]).to.equal(0)
            await vesting.connect(bob).setReferralCode("bobCode")
            expect(await usdt.balanceOf(vesting)).to.equal(0)
            await expect(vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", alice, pETH("3"))
            expect(await usdt.balanceOf(vesting)).to.equal(pUNI("3", 6))
            await expect(vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", alice, pETH("5"))
            expect(await usdt.balanceOf(vesting)).to.equal(pUNI("8", 6))
            await expect(vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", alice, pETH("7"))
            expect(await usdt.balanceOf(vesting)).to.equal(pUNI("15", 6))

            expect((await vesting.affiliates(bob))[2]).to.equal(pETH("15"))
            expect((await vesting.affiliates(bob))[7]).to.equal(3)
            expect((await vesting.affiliates(bob))[3]).to.equal(pUNI("15", 6))
            expect(await vesting.codeUsageCounter(bob, alice)).to.equal(3)

            await expect(vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", alice, 0)
            await expect(vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", alice, 0)
            await expect(vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", alice, 0)
            await expect(vesting.connect(clint).invest(usdt.target, pUNI("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", clint, pETH("3"))
            await expect(vesting.connect(clint).invest(usdt.target, pUNI("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", clint, pETH("5"))
            await expect(vesting.connect(clint).invest(usdt.target, pUNI("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", clint, pETH("7"))
            await expect(vesting.connect(clint).invest(usdt.target, pUNI("100", 6), "bobCode", 0))
                .to.emit(vesting, "ReferralCodeUsed")
                .withArgs("bobCode", clint, 0)
            expect(await usdt.balanceOf(vesting)).to.equal(pUNI("30", 6))
        })

        it("Withdraw", async () => {
            var { vesting, drm, usdt, usdc, busd, recUSDT, race, bob, alice } = await loadFixture(loadTest);

            await usdt.transfer(bob, pUNI("75", 6))
            await usdt.transfer(alice, pUNI("20000", 6))
            await usdt.connect(bob).approve(vesting, pUNI("75", 6))
            await usdt.connect(alice).approve(vesting, pUNI("20000", 6))

            await vesting.connect(bob).invest(usdt.target, pUNI("75", 6), "", 0)
            await vesting.connect(bob).setReferralCode("bobCode")

            await expect(vesting.connect(bob).withdrawProfits())
                .to.revertedWith("Address without profit.")

            await vesting.connect(alice).invest(usdt.target, pUNI("10000", 6), "bobCode", 0)
            log(`Contract balance ${fUNI(await usdt.balanceOf(vesting), 6)}`)
            log(`Race balance ${fUNI(await usdt.balanceOf(race), 6)}`)

            await expect(vesting.connect(bob).withdrawProfits())
                .to.revertedWith("Address must accumulate 500 dollars in commissions the first time.")

            await vesting.connect(alice).invest(usdt.target, pUNI("4000", 6), "bobCode", 0)
            log(`Contract balance ${fUNI(await usdt.balanceOf(vesting), 6)}`)
            log(`Race balance ${fUNI(await usdt.balanceOf(race), 6)}`)

            await vesting.connect(bob).withdrawProfits()
            log(`Contract balance ${fUNI(await usdt.balanceOf(vesting), 6)}`)
            log(`Bob balance ${fUNI(await usdt.balanceOf(bob), 6)}`)
            log(`Race balance ${fUNI(await usdt.balanceOf(race), 6)}`)

        });

        it("Referral code", async () => {
            var { vesting, drm, usdt, usdc, busd, recUSDT, race, bob, alice } = await loadFixture(loadTest);

            await usdt.transfer(bob, pUNI("100", 6))
            await usdt.transfer(alice, pUNI("100", 6))
            await usdt.connect(bob).approve(vesting, pUNI("100", 6))
            await usdt.connect(alice).approve(vesting, pUNI("100", 6))

            await vesting.connect(bob).invest(usdt, pUNI("100", 6), "", 0)
            await vesting.connect(bob).setReferralCode("bobCode")
            await expect(vesting.connect(bob).setReferralCode("bobCode2")).to.revertedWith("This address already has a referral code.")

            await expect(vesting.connect(alice).invest(usdt, pUNI("5", 6), "bobCode2", 0)).to.revertedWith("Invalid referral code.")
            await vesting.connect(alice).invest(usdt, pUNI("100", 6), "bobCode", 0)
            await expect(vesting.connect(alice).setReferralCode("bobCode")).to.revertedWith("Referral code already used.")

            expect(await usdt.balanceOf(vesting)).to.equal(pUNI("3", 6))
            expect(await usdt.balanceOf(race)).to.equal(pUNI("197", 6))
        });

        it("Donation", async () => {
            var { vesting, drm, usdt, race, donation, bob, alice } = await loadFixture(loadTest);

            await usdt.transfer(bob, pUNI("130", 6))
            await usdt.connect(bob).approve(vesting.target, pUNI("130", 6))

            expect(await vesting.connect(bob).invest(usdt.target, pUNI("100", 6), "", 30))
                .to.emit(vesting, "Donation")
                .withArgs(bob, pUNI("30", 6))

            expect(await usdt.balanceOf(donation)).to.equal(pUNI("30", 6))
            expect(await usdt.balanceOf(race)).to.equal(pUNI("100", 6))
        });

        // it("Ban", async () => {
        //     var { vesting, drm, usdt, race, donation, bob, alice } = await loadFixture(loadTest);

        //     await usdt.transfer(bob, pUNI("100", 6))
        //     await usdt.connect(bob).approve(vesting.target, pUNI("100", 6))

        //     await vesting.connect(bob).invest(usdt.target, pUNI("100", 6), "", 0)
        //     await vesting.connect(bob).setReferralCode("bobCode")

        //     await usdt.transfer(alice, pUNI("200", 6))
        //     await usdt.connect(alice).approve(vesting.target, pUNI("200", 6))
        //     await vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0)
        //     expect(await usdt.balanceOf(bob)).to.equal(pUNI("3", 6))

        //     await vesting.banAffiliate(bob, 2629743)

        //     await vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0)
        //     expect(await usdt.balanceOf(bob)).to.equal(pUNI("3", 6))

        //     expect(await usdt.balanceOf(race)).to.equal(pUNI("297", 6))

        //     expect((await vesting.affiliates(bob))[6]).to.equal(true)
        //     expect((await vesting.affiliates(bob))[8]).to.equal(await time.latest() - 1 + 2629743)
        // });

        // it("Set level", async () => {
        //     var { vesting, drm, usdt, race, donation, bob, alice } = await loadFixture(loadTest);

        //     let amount = pETH("8000000")
        //     await drm.approve(vesting.target, amount)
        //     await vesting.setVestingParams(vestingEnd, oneMonth)
        //     await vesting.createPhase(...phase0)

        //     await vesting.setLevel(bob, 3)

        //     await vesting.connect(bob).setReferralCode("bobCode")

        //     await usdt.transfer(alice, pUNI("200", 6))
        //     await usdt.connect(alice).approve(vesting.target, pUNI("200", 6))
        //     await vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0)
        //     expect(await usdt.balanceOf(bob)).to.equal(pUNI("7", 6))

        //     await vesting.setLevel(bob, 1)

        //     await vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0)
        //     expect(await usdt.balanceOf(bob)).to.equal(pUNI("10", 6))

        //     expect(await usdt.balanceOf(race)).to.equal(pUNI("190", 6))

        //     expect((await vesting.affiliates(bob))[7]).to.equal(true)
        // });

        // it("getAffiliatedList", async () => {
        //     var { vesting, drm, usdt, busd, usdc, race, donation, bob, alice, carl, clint } = await loadFixture(loadTest);

        //     let amount = pETH("8000000")
        //     await drm.approve(vesting.target, amount)
        //     await vesting.setVestingParams(vestingEnd, oneMonth)
        //     await vesting.createPhase(...phase0)

        //     await usdt.transfer(alice, pUNI("100", 6))
        //     await busd.transfer(carl, pETH("100"))
        //     await usdc.transfer(clint, pUNI("100", 6))
        //     await usdt.connect(alice).approve(vesting, pUNI("100", 6))
        //     await busd.connect(carl).approve(vesting, pETH("100"))
        //     await usdc.connect(clint).approve(vesting, pUNI("100", 6))

        //     await vesting.setLevel(bob, 3)
        //     await vesting.connect(bob).setReferralCode("bobCode")
        //     await vesting.connect(alice).invest(usdt.target, pUNI("100", 6), "bobCode", 0)
        //     await vesting.connect(alice).setReferralCode("aliceCode")
        //     await vesting.connect(carl).invest(busd.target, pETH("50"), "bobCode", 0)
        //     await vesting.connect(carl).invest(busd.target, pETH("50"), "aliceCode", 0)
        //     await vesting.connect(carl).setReferralCode("carlCode")
        //     await vesting.connect(clint).invest(usdc.target, pUNI("20", 6), "aliceCode", 0)
        //     await vesting.connect(clint).invest(usdc.target, pUNI("80", 6), "carlCode", 0)
        //     await vesting.connect(clint).setReferralCode("clintCode")

        //     const affiliatedList = await vesting.getAffiliatedList()
        //     expect(affiliatedList.length).to.equal(4)

        //     const bobAffiliatedData = affiliatedList[0]
        //     const bobLevel = bobAffiliatedData[0]; expect(bobLevel).to.equal(3)
        //     const bobTotalInvest = bobAffiliatedData[1]; expect(bobTotalInvest).to.equal(0)
        //     const bobTotalProfit = bobAffiliatedData[2]; expect(bobTotalProfit).to.equal(pETH("10.5"))
        //     const bobCodeUsedCounter = bobAffiliatedData[3]; expect(bobCodeUsedCounter).to.equal(2)
        //     const bobHasReferralCode = bobAffiliatedData[4]; expect(bobHasReferralCode).to.equal(true)
        //     const bobReferralCode = bobAffiliatedData[5]; expect(bobReferralCode).to.equal("bobCode")
        //     const bobBanned = bobAffiliatedData[6]; expect(bobBanned).to.equal(false)
        //     const bobFreezed = bobAffiliatedData[7]; expect(bobFreezed).to.equal(true)
        //     const bobUnbanTime = bobAffiliatedData[8]; expect(bobUnbanTime).to.equal(0)

        //     const aliceAffiliatedData = affiliatedList[1]
        //     const aliceLevel = aliceAffiliatedData[0]; expect(aliceLevel).to.equal(1)
        //     const aliceTotalInvest = aliceAffiliatedData[1]; expect(aliceTotalInvest).to.equal(pETH("100"))
        //     const aliceTotalProfit = aliceAffiliatedData[2]; expect(aliceTotalProfit).to.equal(pETH("2.1"))
        //     const aliceCodeUsedCounter = aliceAffiliatedData[3]; expect(aliceCodeUsedCounter).to.equal(2)
        //     const aliceHasReferralCode = aliceAffiliatedData[4]; expect(aliceHasReferralCode).to.equal(true)
        //     const aliceReferralCode = aliceAffiliatedData[5]; expect(aliceReferralCode).to.equal("aliceCode")
        //     const aliceBanned = aliceAffiliatedData[6]; expect(aliceBanned).to.equal(false)
        //     const aliceFreezed = aliceAffiliatedData[7]; expect(aliceFreezed).to.equal(false)
        //     const aliceUnbanTime = aliceAffiliatedData[8]; expect(aliceUnbanTime).to.equal(0)

        //     const carlAffiliatedData = affiliatedList[2]
        //     const carlLevel = carlAffiliatedData[0]; expect(carlLevel).to.equal(1)
        //     const carlTotalInvest = carlAffiliatedData[1]; expect(carlTotalInvest).to.equal(pETH("100"))
        //     const carlTotalProfit = carlAffiliatedData[2]; expect(carlTotalProfit).to.equal(pETH("2.4"))
        //     const carlCodeUsedCounter = carlAffiliatedData[3]; expect(carlCodeUsedCounter).to.equal(1)
        //     const carlHasReferralCode = carlAffiliatedData[4]; expect(carlHasReferralCode).to.equal(true)
        //     const carlReferralCode = carlAffiliatedData[5]; expect(carlReferralCode).to.equal("carlCode")
        //     const carlBanned = carlAffiliatedData[6]; expect(carlBanned).to.equal(false)
        //     const carlFreezed = carlAffiliatedData[7]; expect(carlFreezed).to.equal(false)
        //     const carlUnbanTime = carlAffiliatedData[8]; expect(carlUnbanTime).to.equal(0)
        // });

    });

});