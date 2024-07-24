const { ethers, upgrades } = require("hardhat");

// Amoy
// 0x16db05939731946aBd9720eB8ee937bA3dBE1eBD Vesting proxy
// 0xCF2685A28041bBD7Ea2cFb598153A162Ae8435Ce Vesting impl

const testnetDRM = '0xf88718d191892cde8774dccebc12a024289d96ea'
const testnetUSDT = '0x20cfc5962b1abe4931688ff71de3d5ee053fb283'
const testnetUSDC = '0xD1e8372C333158331eDf0edd994270AD8896E0a3'
const testnetBUSD = '0x755B7bd472Eb98cb355A6e9c1588c03c19141471'

// Polygon
//  Vesting proxy
//  Vesting impl

const _DRM = '0xecF87992f371f72621e70bdFDd07F698e3f9C6cC'
const _USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
const _USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
const _BUSD = '0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39'
const _owner = '0x4dbac2F163832F3878281854F489dcc8D1B6F328'
// --------------------> CAMBIAR
const _donation = '0x792950dB951525c36526383Ce9200e9E540F1a68'

async function vesting() {

    let token = testnetDRM
    let addressUSDT = testnetUSDT
    let addressUSDC = testnetUSDC
    let addressBUSD = testnetBUSD
    let owner = _owner
    let donation = _donation

    var Vesting = await hre.ethers.getContractFactory("contracts/VestingAffiliate/VestingAffiliate.sol:VestingAffiliate");

    var vesting = await upgrades.deployProxy(
        Vesting, 
        [token, addressUSDT, addressUSDC, addressBUSD, owner, donation],
        // {kind: "uups" },
        {kind: "uups", txOverrides: { gasPrice: '9200000000' } },
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