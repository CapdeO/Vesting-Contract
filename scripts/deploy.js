const { ethers, upgrades } = require("hardhat");

// Amoy
// 0x20cfc5962b1abe4931688ff71de3d5ee053fb283 USDT
// 0xD1e8372C333158331eDf0edd994270AD8896E0a3 USDC
// 0x755B7bd472Eb98cb355A6e9c1588c03c19141471 BUSD
// 0xf88718d191892cde8774dccebc12a024289d96ea DRM
// 0x29c55A22976288B226c8D55b2E9fa411EB4657C3 Vesting proxy
// 0x94D323fd50590C49dBbBc563Ca8E4fe331b27ea7 Vesting impl

// Polygon
// 0xecF87992f371f72621e70bdFDd07F698e3f9C6cC DRM
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
    // Amoy
    // let token = '0xf88718d191892cde8774dccebc12a024289d96ea'
    // let stableTokens = ['0x20cfc5962b1abe4931688ff71de3d5ee053fb283', '0xD1e8372C333158331eDf0edd994270AD8896E0a3', '0x755B7bd472Eb98cb355A6e9c1588c03c19141471']
    // let owner = '0xDA81E62c2C428bDde5D3271014DbE0cfd3cfeC26'

    // Polygon
    let token = '0xfA84B0b6d79c0581e4cE19A6548Bd864C200Bf6c'
    let stableTokens = ['0xc2132D05D31c914a87C6611C10748AEb04B58e8F', '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', '0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39']
    let owner = ''

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

DRM().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});