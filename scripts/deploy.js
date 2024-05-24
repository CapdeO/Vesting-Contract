const { ethers, upgrades } = require("hardhat");

// Amoy
// 0x7a6C7a3bab11D57423f9F5690AF6ff38BE2d771f Vesting proxy
// 0xF2A22fcFa312f91a432fad606937D5Ab17278Dc0 Vesting impl

const testnetDRM = '0xf88718d191892cde8774dccebc12a024289d96ea'
const testnetUSDT = '0x20cfc5962b1abe4931688ff71de3d5ee053fb283'
const testnetUSDC = '0xD1e8372C333158331eDf0edd994270AD8896E0a3'
const testnetBUSD = '0x755B7bd472Eb98cb355A6e9c1588c03c19141471'

// Polygon
// 0xecF87992f371f72621e70bdFDd07F698e3f9C6cC DRM
// 

const _owner = '0x792950dB951525c36526383Ce9200e9E540F1a68'
const _receiverUSDT = '0x0DB7B729f42e485CDac9641F833e5d530922Fef4'
const _receiverUSDC = '0x7B27567EE121e0e9e69D0372EB17A9A10Ee0af86'
const _receiverBUSD = '0x59fc182B1836725EeB82874269262C11702563b6'
const _donation = '0x792950dB951525c36526383Ce9200e9E540F1a68'

async function stablecoin() {
    var contract = await ethers.deployContract("USDC", {gasPrice: '3200000000'});
    console.log(`Address del contrato ${await contract.getAddress()}`)

    var res = await contract.waitForDeployment();
    await res.deploymentTransaction().wait(5);

    await hre.run("verify:verify", {
        address: await contract.getAddress(),
        constructorArguments: [],
        contract: "contracts/Stablecoin.sol:USDC"
    });
}

async function DRM() {
    var contractDRM = await ethers.deployContract("DreamJunk");
    console.log(`Address del contrato ${await contractDRM.getAddress()}`)

    var res = await contractDRM.waitForDeployment();
    await res.deploymentTransaction().wait(5);

    await hre.run("verify:verify", {
        address: await contractDRM.getAddress(),
        constructorArguments: [],
        contract: "contracts/ERC20.sol:DreamJunk"
    });

    // npx hardhat verify --contract contracts/ERC20.sol:DreamJunk 0xecF87992f371f72621e70bdFDd07F698e3f9C6cC --network polygon
}

async function vesting() {

    let token = testnetDRM
    let addressUSDT = testnetUSDT
    let addressUSDC = testnetUSDC
    let addressBUSD = testnetBUSD
    let owner = _owner
    let receiverUSDT = _receiverUSDT
    let receiverUSDC = _receiverUSDC
    let receiverBUSD = _receiverBUSD
    let donation = _donation

    // Polygon
    // let token = '0xfA84B0b6d79c0581e4cE19A6548Bd864C200Bf6c'
    // let stableTokens = ['0xc2132D05D31c914a87C6611C10748AEb04B58e8F', '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', '0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39']
    // let owner = ''

    var Vesting = await hre.ethers.getContractFactory("VestingAffiliate");

    var vesting = await upgrades.deployProxy(
        Vesting, 
        [token, addressUSDT, addressUSDC, addressBUSD, owner, receiverUSDT, receiverUSDC, receiverBUSD, donation],
        {kind: "uups"},
    );

    var tx = await vesting.waitForDeployment();
    await tx.deploymentTransaction().wait(5);

    var impVestingAdd = await upgrades.erc1967.getImplementationAddress(
        await vesting.getAddress()
    );

    console.log(`Address del Proxy es: ${await vesting.getAddress()}`);
    console.log(`Address de Impl es: ${impVestingAdd}`);

    await hre.run("verify:verify", {
        address: impVestingAdd,
        constructorArguments: [],
    });
}

vesting().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});