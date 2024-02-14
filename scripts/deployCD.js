const { ethers, upgrades } = require("hardhat");

// Polygon
// Proxy   --> 0x9bfACE4Cf43EDf5abe9b2C2fd75Fe20F5dAf7A61
// Impl V1 --> 0x82cf371c60DC372EdEE9C389ce8790827cDc272C

async function vesting() {

    // Polygon
    let token = '0x86Dcf0116FC6A2e6854e0277054F1E06e38A796e'
    let stableTokens = [
        '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
        '0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39'
    ]
    let owner = '0x2a76d2367F3ec78Aa208e186678202a236C1844A'

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

vesting().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});