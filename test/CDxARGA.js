var { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var { expect } = require("chai");
var { ethers } = require("hardhat");

describe("TokenExchange", () => {
    async function loadTest() {
        var [owner, alice] = await ethers.getSigners();
        var ARGA = await ethers.getContractFactory("Argatio");
        var CONTRACT = await ethers.getContractFactory("TokenExchange");
        var cd = await ARGA.deploy()
        var arga = await ARGA.deploy()
        var contract = await CONTRACT.deploy(cd.target, arga.target)

        return { contract, cd, arga, owner, alice };
    }

    describe("Exchange", () => {
        it("Exchange", async () => {
            var { contract, cd, arga, owner, alice } = await loadFixture(loadTest);

            await expect(contract.connect(alice).exchangeTokens(ethers.parseEther("0"))).to.revertedWithCustomError
            
            await expect(contract.connect(alice).exchangeTokens(ethers.parseEther("1"))).to.revertedWith("Insufficient contract ARGA token balance.")

            await arga.transfer(contract.target, ethers.parseEther("5000"))

            await cd.transfer(alice.address, ethers.parseEther("1"))
            await cd.connect(alice).approve(contract.target, ethers.parseEther("1"))

            await contract.connect(alice).exchangeTokens(ethers.parseEther("1"))

            expect(await cd.balanceOf(alice.address)).to.equal(ethers.parseEther("0"))
            expect(await cd.balanceOf(contract.target)).to.equal(ethers.parseEther("1"))
            expect(await arga.balanceOf(alice.address)).to.equal(ethers.parseEther("1"))
            expect(await arga.balanceOf(contract.target)).to.equal(ethers.parseEther("4999"))

            await expect(contract.connect(alice).revokeAdmin(owner.address)).to.revertedWith("Not admin.")
            await expect(contract.connect(alice).withdrawRemainingTokens()).to.revertedWith("Not admin.")

            await contract.setAdmin(alice.address)

            await contract.connect(alice).revokeAdmin(owner.address)

            await expect(contract.withdrawRemainingTokens()).to.revertedWith("Not admin.")

            await contract.connect(alice).withdrawRemainingTokens()

            expect(await arga.balanceOf(alice.address)).to.equal(ethers.parseEther("5000"))

            // Y así es como Alice se la llevó toda

        });
    });
});