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

    describe("Vesting example", () => {

        it("Release", async () => {
            var { vesting, dj, usdt, alice } = await loadFixture(loadTest);

            await vesting.setVestingParams(vestingEnd, oneMonth)
            await dj.approve(vesting, phase0[4])
            await vesting.createPhase(...phase0)

            await time.increase(2629743 * 1)
            await usdt.mint(alice.address, 4000000)
            await usdt.connect(alice).approve(vesting, 4000000)
            console.log('Alice compra 100 tokens con 4 dolares')
            await vesting.connect(alice).invest(usdt.target, 4000000)

            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))

            console.log('------------------------ 1 mes después')
            await time.increaseTo(1713190474)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            await vesting.connect(alice).release(0)
            console.log('Alice retiró. Balance Alice ------>  ' + toNormal(await dj.balanceOf(alice.address)))
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            await vesting.connect(alice).release(0)
            console.log('Alice retiró. Balance Alice ------>  ' + toNormal(await dj.balanceOf(alice.address)))

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

            await vesting.connect(alice).release(0)
            console.log('Alice retiró. Balance Alice ------>  ' + toNormal(await dj.balanceOf(alice.address)))
            
            console.log('------------------------ 1 mes después')
            await time.increase(2629743)
            console.log('Releasable: ' + toNormal(await vesting.connect(alice).releasableAmount(0)))
            console.log('En el contrato: ' + toNormal((await vesting.getUserInvestment(alice.address, 0))[1]))
            console.log('Vested: ' + toNormal(await vesting.connect(alice).vestedAmount(0)))
            console.log('')

        });
    });
});