var { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var { expect } = require("chai");
var { ethers, upgrades } = require("hardhat");
var { time } = require("@nomicfoundation/hardhat-network-helpers");

const vestingEnd = 1778630400 // Wednesday, 13 May 2026 0:00:00
// const phaseStart = 1715558400 // Monday, 13 May 2024 0:00:00
const phaseStart = 1744502400 // Sunday, 13 April 2025 0:00:00
const phaseEnd = 1747094400 // Tuesday, 13 May 2025 0:00:00
const oneMonth = 2629743 // In secs

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

        var VESTING = await ethers.getContractFactory("VestingTeam");
        var vesting = await upgrades.deployProxy(VESTING, 
            [arga.target, mati.address],
            { initializer: 'initialize', kind: 'uups' });

        return { vesting, arga, owner, alice, bob, carl, mati };
    }

    async function increaseOneMonth() {
        await time.increase(oneMonth)
        console.log(' ')
        console.log(`One month later --> ${timestampToDateString(await time.latest())}`)
    }

    async function userInteract(_vesting, _user, _userName, _release) {
        console.log(`${_userName} could release ${ethers.formatUnits(await _vesting.connect(_user).releasableAmount())}`)
        console.log(`${_userName} vested ${ethers.formatUnits(await _vesting.connect(_user).vestedAmount())}`)

        if(_release) {
            await _vesting.connect(_user).release()
            console.log(`---- ${_userName} release ----`)
            showInvestment(await _vesting.getUserInvestment(_user), _userName)
        }
    }

    describe("Release function", () => {
        it("Release", async () => {
            var { vesting, arga, alice, bob } = await loadFixture(loadTest);

            await vesting.setVestingParams(vestingEnd, oneMonth)
            await vesting.createPhase(phaseStart, phaseEnd, 0)
            
            let totalAmount = ethers.parseEther("300")
            await arga.approve(vesting, totalAmount)

            await vesting.allocateTokens(totalAmount, [alice.address, bob.address])

            await time.increaseTo(1747094400)

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
            

            console.log(' ')
            console.log(`Alice balance: ${ethers.formatEther(await arga.balanceOf(alice.address))}`)
            console.log(`Bob balance: ${ethers.formatEther(await arga.balanceOf(bob.address))}`)
            console.log(`Contract balance: ${ethers.formatEther(await arga.balanceOf(vesting.target))}`)
        });
    });
});