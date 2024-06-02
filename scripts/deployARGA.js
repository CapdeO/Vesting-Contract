const { ethers, upgrades } = require("hardhat");

// Polygon
// 0xe49A8863cb86f962100767dfD7Dee165E187A571 ARGA

// -----------------> VESTING
// 0xcf164e2e423CC7341Da00E103AD345162D30aDe4 PROXY
// 0x82cf371c60DC372EdEE9C389ce8790827cDc272C IMPL V1
// 0x72121C78f6c791C02620C80ac3289693f70a4398 IMPL V2

// -----------------> TEAM VESTING
// 0x9F06b7aA81c6B1C54063BB7C137997CE0A8310c9 PROXY
// 0x41DE702756c7dCE407331feF870126D9f96F7119 IMPL V1

async function ARGA() {
    var contract = await ethers.deployContract("Argatio");
    console.log(`Address del contrato ${await contract.getAddress()}`)

    var res = await contract.waitForDeployment();
    await res.deploymentTransaction().wait(15);

    await hre.run("verify:verify", {
        address: await contract.getAddress(),
        constructorArguments: [],
        contract: "contracts/ERC20.sol:Argatio"
    });

    // npx hardhat verify --contract contracts/ERC20.sol:Argatio 0xf6a0b489B1690439ec047b6f5a6cee2B15237517 --network polygon
}

async function vesting() {

    // Polygon
    let token = '0xe49A8863cb86f962100767dfD7Dee165E187A571'
    let stableTokens = ['0xc2132D05D31c914a87C6611C10748AEb04B58e8F', '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', '0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39']
    let owner = '0x2a76d2367F3ec78Aa208e186678202a236C1844A'

    var Vesting = await hre.ethers.getContractFactory("contracts/Vesting.sol:Vesting");

    var vesting = await upgrades.deployProxy(
        Vesting,
        [token, stableTokens, owner],
        { kind: "uups" },
    );

    var tx = await vesting.waitForDeployment();
    await tx.deploymentTransaction().wait(15);

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

async function teamVesting() {

    // Polygon
    let token = '0xe49A8863cb86f962100767dfD7Dee165E187A571'
    let owner = '0x2a76d2367F3ec78Aa208e186678202a236C1844A'

    var Vesting = await hre.ethers.getContractFactory("contracts/VestingTeam.sol:VestingTeam");

    var vesting = await upgrades.deployProxy(
        Vesting,
        [token, owner],
        { kind: "uups" },
    );

    var tx = await vesting.waitForDeployment();
    await tx.deploymentTransaction().wait(15);

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

teamVesting().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});