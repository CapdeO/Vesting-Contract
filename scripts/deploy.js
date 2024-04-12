const { ethers, upgrades } = require("hardhat");

// Amoy
// 0x20cfc5962b1abe4931688ff71de3d5ee053fb283 USDT
// 0xD1e8372C333158331eDf0edd994270AD8896E0a3 USDC
// 0x755B7bd472Eb98cb355A6e9c1588c03c19141471 BUSD
// 0xf88718d191892cde8774dccebc12a024289d96ea DJ

// Polygon
//
//

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

async function dj() {
    var contractDJ = await ethers.deployContract("DreamJunkStudios");
    console.log(`Address del contrato ${await contractDJ.getAddress()}`)

    var res = await contractDJ.waitForDeployment();
    await res.deploymentTransaction().wait(5);

    await hre.run("verify:verify", {
        address: await contractDJ.getAddress(),
        constructorArguments: [],
        contract: "contracts/ERC20.sol:DreamJunkStudios"
    });

    // npx hardhat verify --contract contracts/ERC20.sol:DreamJunkStudios 0xf88718d191892cde8774dccebc12a024289d96ea --network polygonAmoy
}

async function vesting() {
    // Mumbai
    let token = '0xD345D94552C88DD997F117C5987657526616ECB6'
    let stableTokens = ['0x7a6C7a3bab11D57423f9F5690AF6ff38BE2d771f']
    let owner = '0xB9840E6Cd6e7200FDEea1348834c61E6Af53D6A0'

    // Polygon
    // let token = ''
    // let stableTokens = ['']
    // let owner = ''

    var Vesting = await hre.ethers.getContractFactory("Vesting");

    var vesting = await upgrades.deployProxy(
        Vesting, 
        [token, stableTokens, owner],
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

stablecoin().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});