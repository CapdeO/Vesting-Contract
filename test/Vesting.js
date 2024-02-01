var { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var { expect } = require("chai");
var { ethers, upgrades } = require("hardhat");
var { time } = require("@nomicfoundation/hardhat-network-helpers");

const phase0 = [1709251200, 1711929599, 0, ethers.parseEther("0.04"),   ethers.parseEther("8000000"),  ethers.parseEther("400000")]
const phase1 = [1711929600, 1714521599, 0, ethers.parseEther("0.06"),  ethers.parseEther("32000000"), ethers.parseEther("1600000")]
const phase2 = [1714521600, 1717199999, 0, ethers.parseEther("0.07"),   ethers.parseEther("6000000"),  ethers.parseEther("300000")]
const phase3 = [1717200000, 1719791999, 0, ethers.parseEther("0.075"), ethers.parseEther("40000000"), ethers.parseEther("2000000")]
const phase4 = [1719792000, 1722470399, 0, ethers.parseEther("0.08"),  ethers.parseEther("40000000"), ethers.parseEther("2000000")]
const phase5 = [1722470400, 1725148799, 0, ethers.parseEther("0.085"), ethers.parseEther("60000000"), ethers.parseEther("3000000")]
const phase6 = [1725148800, 1727740799, 0, ethers.parseEther("0.09"),  ethers.parseEther("64000000"), ethers.parseEther("3200000")]
const phase7 = [1727740800, 1730419199, 0, ethers.parseEther("0.095"), ethers.parseEther("70000000"), ethers.parseEther("3500000")]
const vestingEnd = 1775001600 // Wednesday, 1 April 2026 0:00:00
const oneMonth = 2629743 // In secs

function toNormal(_number) {
    let number = _number.toString()
    return (number / 10 ** 18).toFixed(2)
}

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
            expect(await dj.balanceOf(vesting)).to.equal(amount)
        });
    });

    describe("Invest", () => {
        it("Invest", async () => {
            var { vesting, usdt, dj, alice, race } = await loadFixture(loadTest);
            let aliceInvestment;

            await vesting.setVestingParams(vestingEnd, oneMonth)
            await dj.approve(vesting, ethers.parseEther("320000000"))
            await usdt.mint(alice, ethers.parseUnits("100", 6))
            await usdt.connect(alice).approve(vesting, ethers.parseUnits("100", 6))

            await vesting.createPhase(...phase0)
            await vesting.createPhase(...phase1)
            await vesting.createPhase(...phase2)
            await vesting.createPhase(...phase3)
            await vesting.createPhase(...phase4)
            await vesting.createPhase(...phase5)
            await vesting.createPhase(...phase6)
            await vesting.createPhase(...phase7)

            await time.increaseTo(1711463881) //  Tuesday, 26 March 2024 14:38:01
            await expect(vesting.connect(alice).invest(usdt.target, ethers.parseUnits("1", 6)))
                .to.emit(vesting, "BuyTokens").withArgs(0, alice.address, ethers.parseEther("1"), ethers.parseEther("25"))
            expect(await usdt.balanceOf(alice)).to.equal(ethers.parseUnits("99", 6))
            expect(await usdt.balanceOf(race)).to.equal(ethers.parseUnits("1",6))
            aliceInvestment = await vesting.getUserInvestment(alice.address, 0)
            expect(aliceInvestment[0]).to.equal(ethers.parseEther("25"))
            expect(aliceInvestment[1]).to.equal(ethers.parseEther("25"))
            expect(aliceInvestment[2]).to.equal(0)

            await time.increaseTo(1714142281) //  Friday, 26 April 2024 14:38:01
            await expect(vesting.connect(alice).invest(usdt.target, ethers.parseUnits("1", 6)))
                .to.emit(vesting, "BuyTokens").withArgs(1, alice.address, ethers.parseEther("1"), "16666666666666666666")
            expect(await usdt.balanceOf(alice)).to.equal(ethers.parseUnits("98", 6))
            expect(await usdt.balanceOf(race)).to.equal(ethers.parseUnits("2", 6))
            aliceInvestment = await vesting.getUserInvestment(alice.address, 1)
            expect(aliceInvestment[0]).to.equal("16666666666666666666")
            expect(aliceInvestment[1]).to.equal("16666666666666666666")
            expect(aliceInvestment[2]).to.equal(0)

            await time.increaseTo(1714563849) //  Wednesday, 1 May 2024 11:44:09
            await expect(vesting.connect(alice).invest(usdt.target, ethers.parseUnits("1", 6)))
                .to.emit(vesting, "BuyTokens").withArgs(2, alice.address, ethers.parseEther("1"), "14285714285714285714")
            expect(await usdt.balanceOf(alice)).to.equal(ethers.parseUnits("97", 6))
            expect(await usdt.balanceOf(race)).to.equal(ethers.parseUnits("3", 6))
            aliceInvestment = await vesting.getUserInvestment(alice.address, 2)
            expect(aliceInvestment[0]).to.equal("14285714285714285714")
            expect(aliceInvestment[1]).to.equal("14285714285714285714")
            expect(aliceInvestment[2]).to.equal(0)

            await time.increaseTo(1717242249) //  Saturday, 1 June 2024 11:44:09
            await expect(vesting.connect(alice).invest(usdt.target, ethers.parseUnits("1", 6)))
                .to.emit(vesting, "BuyTokens").withArgs(3, alice.address, ethers.parseEther("1"), "13333333333333333333")
            expect(await usdt.balanceOf(alice)).to.equal(ethers.parseUnits("96", 6))
            expect(await usdt.balanceOf(race)).to.equal(ethers.parseUnits("4", 6))
            aliceInvestment = await vesting.getUserInvestment(alice.address, 3)
            expect(aliceInvestment[0]).to.equal("13333333333333333333")
            expect(aliceInvestment[1]).to.equal("13333333333333333333")
            expect(aliceInvestment[2]).to.equal(0)

            await time.increaseTo(1719834249) //  Monday, 1 July 2024 11:44:09
            await expect(vesting.connect(alice).invest(usdt.target, ethers.parseUnits("1", 6)))
                .to.emit(vesting, "BuyTokens").withArgs(4, alice.address, ethers.parseEther("1"), ethers.parseEther("12.5"))
            expect(await usdt.balanceOf(alice)).to.equal(ethers.parseUnits("95", 6))
            expect(await usdt.balanceOf(race)).to.equal(ethers.parseUnits("5", 6))
            aliceInvestment = await vesting.getUserInvestment(alice.address, 4)
            expect(aliceInvestment[0]).to.equal(ethers.parseEther("12.5"))
            expect(aliceInvestment[1]).to.equal(ethers.parseEther("12.5"))
            expect(aliceInvestment[2]).to.equal(0)

            await time.increaseTo(1722512649) //  Thursday, 1 August 2024 11:44:09
            await expect(vesting.connect(alice).invest(usdt.target, ethers.parseUnits("1", 6)))
                .to.emit(vesting, "BuyTokens").withArgs(5, alice.address, ethers.parseEther("1"), "11764705882352941176")
            expect(await usdt.balanceOf(alice)).to.equal(ethers.parseUnits("94", 6))
            expect(await usdt.balanceOf(race)).to.equal(ethers.parseUnits("6", 6))
            aliceInvestment = await vesting.getUserInvestment(alice.address, 5)
            expect(aliceInvestment[0]).to.equal("11764705882352941176")
            expect(aliceInvestment[1]).to.equal("11764705882352941176")
            expect(aliceInvestment[2]).to.equal(0)

            await time.increaseTo(1725191049) //  Sunday, 1 September 2024 11:44:09
            await expect(vesting.connect(alice).invest(usdt.target, ethers.parseUnits("1", 6)))
                .to.emit(vesting, "BuyTokens").withArgs(6, alice.address, ethers.parseEther("1"), "11111111111111111111")
            expect(await usdt.balanceOf(alice)).to.equal(ethers.parseUnits("93", 6))
            expect(await usdt.balanceOf(race)).to.equal(ethers.parseUnits("7", 6))
            aliceInvestment = await vesting.getUserInvestment(alice.address, 6)
            expect(aliceInvestment[0]).to.equal("11111111111111111111")
            expect(aliceInvestment[1]).to.equal("11111111111111111111")
            expect(aliceInvestment[2]).to.equal(0)

            await time.increaseTo(1727783049) //  Tuesday, 1 October 2024 11:44:09
            await expect(vesting.connect(alice).invest(usdt.target, ethers.parseUnits("1", 6)))
                .to.emit(vesting, "BuyTokens").withArgs(7, alice.address, ethers.parseEther("1"), "10526315789473684210")
            expect(await usdt.balanceOf(alice)).to.equal(ethers.parseUnits("92", 6))
            expect(await usdt.balanceOf(race)).to.equal(ethers.parseUnits("8", 6))
            aliceInvestment = await vesting.getUserInvestment(alice.address, 7)
            expect(aliceInvestment[0]).to.equal("10526315789473684210")
            expect(aliceInvestment[1]).to.equal("10526315789473684210")
            expect(aliceInvestment[2]).to.equal(0)

            await time.increaseTo(phase7[1] + 1) //  Friday, 1 November 2024 0:00:00
            await expect(vesting.connect(alice).invest(usdt.target, ethers.parseUnits("1", 6))).to.be.revertedWith("No active vesting phase for the current time.")
        });
    });

    describe("Release", () => {
        it("Reverts", async () => {
            var { vesting, dj } = await loadFixture(loadTest);

            await expect(vesting.release(0)).to.be.revertedWith("No vesting phases available.")

            await vesting.setVestingParams(vestingEnd, oneMonth)
            await dj.approve(vesting.target, phase0[4])
            await vesting.createPhase(...phase0)

            await expect(vesting.release(1)).to.be.revertedWith("Invalid phase number.")

            await time.increaseTo(1711463881) // Tuesday, 26 March 2024 14:38:01

            await expect(vesting.release(0)).to.be.revertedWith("This action can only be performed during the vesting period.")

            await time.increaseTo(1711982281) // Monday, 1 April 2024 14:38:01

            await expect(vesting.release(0)).to.be.revertedWith("Vesting: No tokens are due for release yet.")
        });

        it("Release", async () => {
            var { vesting, dj, usdt, alice } = await loadFixture(loadTest);

            await vesting.setVestingParams(vestingEnd, oneMonth)
            await dj.approve(vesting, phase0[4])
            await vesting.createPhase(...phase0)

            await time.increase(2629743 * 1)
            await usdt.mint(alice.address, 4000000)
            await usdt.connect(alice).approve(vesting, 4000000)
            await vesting.connect(alice).invest(usdt.target, 4000000)

            await time.increaseTo(1713190474)
        });
    });

    describe("Read functions", () => {

        it("getPhasesCount", async () => {
            var { vesting, dj } = await loadFixture(loadTest);

            await vesting.setVestingParams(vestingEnd, oneMonth)
            expect(await vesting.getPhasesCount()).to.be.equal(0)
            await dj.approve(vesting, phase0[4])
            await vesting.createPhase(...phase0)
            expect(await vesting.getPhasesCount()).to.be.equal(1)
            await dj.approve(vesting, phase1[4])
            await vesting.createPhase(...phase1)
            expect(await vesting.getPhasesCount()).to.be.equal(2)
        });

        it("Get actual Phase", async () => {
            var { vesting, dj } = await loadFixture(loadTest);

            await expect(vesting.getCurrentPhaseNumber()).to.be.revertedWith("No vesting phases available.")
            await dj.approve(vesting, ethers.parseEther("320000000"))

            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(...phase0)
            await vesting.createPhase(...phase1)
            await vesting.createPhase(...phase2)
            await vesting.createPhase(...phase3)
            await vesting.createPhase(...phase4)
            await vesting.createPhase(...phase5)
            await vesting.createPhase(...phase6)
            await vesting.createPhase(...phase7)

            await expect(vesting.getCurrentPhaseNumber()).to.be.revertedWith("No active vesting phase for the current time.")

            await time.increaseTo(phase0[0])
            expect(await vesting.getCurrentPhaseNumber()).to.equal(0)
            await time.increaseTo(phase0[1])
            expect(await vesting.getCurrentPhaseNumber()).to.equal(0)
            await time.increaseTo(phase1[0])
            expect(await vesting.getCurrentPhaseNumber()).to.equal(1)
            await time.increaseTo(phase1[1])
            expect(await vesting.getCurrentPhaseNumber()).to.equal(1)
            await time.increaseTo(phase2[0])
            expect(await vesting.getCurrentPhaseNumber()).to.equal(2)
            await time.increaseTo(phase2[1])
            expect(await vesting.getCurrentPhaseNumber()).to.equal(2)
            await time.increaseTo(phase3[0])
            expect(await vesting.getCurrentPhaseNumber()).to.equal(3)
            await time.increaseTo(phase3[1])
            expect(await vesting.getCurrentPhaseNumber()).to.equal(3)
            await time.increaseTo(phase4[0])
            expect(await vesting.getCurrentPhaseNumber()).to.equal(4)
            await time.increaseTo(phase4[1])
            expect(await vesting.getCurrentPhaseNumber()).to.equal(4)
            await time.increaseTo(phase5[0])
            expect(await vesting.getCurrentPhaseNumber()).to.equal(5)
            await time.increaseTo(phase5[1])
            expect(await vesting.getCurrentPhaseNumber()).to.equal(5)
            await time.increaseTo(phase6[0])
            expect(await vesting.getCurrentPhaseNumber()).to.equal(6)
            await time.increaseTo(phase6[1])
            expect(await vesting.getCurrentPhaseNumber()).to.equal(6)
            await time.increaseTo(phase7[0])
            expect(await vesting.getCurrentPhaseNumber()).to.equal(7)
            await time.increaseTo(phase7[1])
            expect(await vesting.getCurrentPhaseNumber()).to.equal(7)

            await time.increaseTo(phase7[1] + 1)
            await expect(vesting.getCurrentPhaseNumber()).to.revertedWith("No active vesting phase for the current time.")
            await expect(vesting.getPhase(8)).to.be.revertedWith("Invalid phase number.")
        });

        it("getUserInvestments", async () => {
            var { vesting, usdt, dj, alice } = await loadFixture(loadTest);

            await vesting.setVestingParams(vestingEnd, oneMonth)

            await dj.approve(vesting, phase0[4] + phase1[4] + phase2[4])
            await vesting.createPhase(...phase0)
            await vesting.createPhase(...phase1)
            await vesting.createPhase(...phase2)

            await usdt.mint(alice.address, ethers.parseUnits("1000", 6))
            await usdt.connect(alice).approve(vesting.target, ethers.parseUnits("1000", 6))

            await time.increaseTo(1710512767) // Friday, 15 March 2024 14:26:07
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("500", 6))

            await time.increaseTo(1713191167) // Monday, 15 April 2024 14:26:07
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("300", 6))

            await time.increaseTo(1715783167) // Wednesday, 15 May 2024 14:26:07
            await vesting.connect(alice).invest(usdt.target, ethers.parseUnits("200", 6))

            let aliceInvestments = await vesting.getUserInvestments(alice.address)

            expect(aliceInvestments[0][0]).to.equal(ethers.parseEther("12500"))
            expect(aliceInvestments[0][1]).to.equal(ethers.parseEther("12500"))
            expect(aliceInvestments[0][2]).to.equal(0)
            expect(aliceInvestments[1][0]).to.equal(ethers.parseEther("5000"))
            expect(aliceInvestments[1][1]).to.equal(ethers.parseEther("5000"))
            expect(aliceInvestments[1][2]).to.equal(0)
            expect(aliceInvestments[2][0]).to.be.at.least(ethers.parseEther((200/0.07).toString()))
            expect(aliceInvestments[2][1]).to.be.at.least(ethers.parseEther((200/0.07).toString()))
            expect(aliceInvestments[2][2]).to.equal(0)

            await vesting.connect(alice).release(0)
            aliceInvestments = await vesting.getUserInvestments(alice.address)

            expect(aliceInvestments[0][0]).to.equal(ethers.parseEther("12500"))
            expect(aliceInvestments[0][1]).to.be.at.least(ethers.parseEther("11950"))
            expect(aliceInvestments[0][2]).to.be.at.least(ethers.parseEther("520"))
        });
    });
});