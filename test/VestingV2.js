var { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var { expect } = require("chai");
var { ethers, upgrades } = require("hardhat");
var { time } = require("@nomicfoundation/hardhat-network-helpers");

const vestingEnd = 1778630400 // Wednesday, 13 May 2026 0:00:00
const oneMonth = 2629743 // In secs

const firstPhase = [1715600974, 1717199999, 0, ethers.parseEther("0.07"),  ethers.parseEther("10000000"),  ethers.parseEther("400000")]
const secondPhase = [1717200000, 1719791999, 0, ethers.parseEther("0.08"),  ethers.parseEther("8000000"),  ethers.parseEther("600000")]
const thirdPhase = [1719792000, 1722470399, 0, ethers.parseEther("0.11"),   ethers.parseEther("5000000"),  ethers.parseEther("800000")]

const showInvestment = (_investment, _userName) => {
    console.log(`${_userName} total ${ethers.formatEther(_investment[0])}`)
    console.log(`${_userName} balance ${ethers.formatEther(_investment[1])}`)
    console.log(`${_userName} released ${ethers.formatEther(_investment[2])}`)
}

function timestampToDateString(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toUTCString();
}

describe("Vesting Contract", () => {
    async function loadTest() {
        var [owner, alice, bob, carl, mati] = await ethers.getSigners();
        var ARGA = await ethers.getContractFactory("Argatio");
        var arga = await ARGA.deploy()
        var USDT = await ethers.getContractFactory("TetherUSD");
        var usdt = await USDT.deploy();

        var VESTING = await ethers.getContractFactory("contracts/Vesting - v2.sol:Vesting");
        var vesting = await upgrades.deployProxy(VESTING, 
            [arga.target, [usdt.target], mati.address],
            { initializer: 'initialize', kind: 'uups' });

        return { vesting, arga, usdt, owner, alice, bob, carl, mati };
    }

    async function increaseOneMonth() {
        await time.increase(oneMonth)
        console.log(' ')
        console.log(`One month later --> ${timestampToDateString(await time.latest())}`)
    }

    async function userInteract(_vesting, _user, _userName, _release) {
        console.log(`${_userName} could release ${ethers.formatUnits(await _vesting.connect(_user).releasableAmount(0))}`)
        console.log(`${_userName} vested ${ethers.formatUnits(await _vesting.connect(_user).vestedAmount(0))}`)

        if(_release) {
            await _vesting.connect(_user).release(0)
            console.log(`---- ${_userName} release ----`)
            showInvestment(await _vesting.getUserInvestment(_user, 0), _userName)
        }
    }

    describe("Release function", () => {
        it("Release", async () => {
            var { vesting, arga, usdt, alice, bob } = await loadFixture(loadTest);

            await arga.approve(vesting.target, firstPhase[4])
            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(...firstPhase)
            await usdt.transfer(bob.address, ethers.parseUnits("7", 6))
            await usdt.connect(bob).approve(vesting.target, ethers.parseUnits("7", 6))

            await vesting.setInvestment(alice.address, ethers.parseEther("100"))
            await vesting.connect(bob).invest(usdt.target, ethers.parseUnits("7", 6))

            await expect(vesting.connect(bob).setInvestment(bob.address, ethers.parseEther("100"))).to.revertedWithCustomError

            await time.increaseTo(1717200000)

            await userInteract(vesting, alice, 'Alice', false)
            await userInteract(vesting, bob, 'Bob', false)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', true)
            await userInteract(vesting, bob, 'Bob', false)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', true)
            await userInteract(vesting, bob, 'Bob', true)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', true)
            await userInteract(vesting, bob, 'Bob', true)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', true)
            await userInteract(vesting, bob, 'Bob', true)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', true)
            await userInteract(vesting, bob, 'Bob', true)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', true)
            await userInteract(vesting, bob, 'Bob', true)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', true)
            await userInteract(vesting, bob, 'Bob', true)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', true)
            await userInteract(vesting, bob, 'Bob', true)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', true)
            await userInteract(vesting, bob, 'Bob', true)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', true)
            await userInteract(vesting, bob, 'Bob', true)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', true)
            await userInteract(vesting, bob, 'Bob', true)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', true)
            await userInteract(vesting, bob, 'Bob', true)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', false)
            await userInteract(vesting, bob, 'Bob', false)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', false)
            await userInteract(vesting, bob, 'Bob', false)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', false)
            await userInteract(vesting, bob, 'Bob', false)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', false)
            await userInteract(vesting, bob, 'Bob', false)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', false)
            await userInteract(vesting, bob, 'Bob', false)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', false)
            await userInteract(vesting, bob, 'Bob', false)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', false)
            await userInteract(vesting, bob, 'Bob', false)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', false)
            await userInteract(vesting, bob, 'Bob', false)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', false)
            await userInteract(vesting, bob, 'Bob', false)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', false)
            await userInteract(vesting, bob, 'Bob', false)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', false)
            await userInteract(vesting, bob, 'Bob', false)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', false)
            await userInteract(vesting, bob, 'Bob', false)

            await increaseOneMonth()
            await userInteract(vesting, alice, 'Alice', true)
            await userInteract(vesting, bob, 'Bob', true)
            

            console.log(' ')
            console.log(`Alice balance: ${ethers.formatEther(await arga.balanceOf(alice.address))}`)
            console.log(`Bob balance: ${ethers.formatEther(await arga.balanceOf(bob.address))}`)
            console.log(`Contract balance: ${ethers.formatEther(await arga.balanceOf(vesting.target))}`)
        });
    });
});