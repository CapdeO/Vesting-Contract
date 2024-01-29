const { ethers, upgrades } = require("hardhat");

// Mumbai
// 0x7a6C7a3bab11D57423f9F5690AF6ff38BE2d771f USDT
// 0xD345D94552C88DD997F117C5987657526616ECB6 DJ
// 0x8Db673441f806aD20526d8Bb30Af54F03B798F82 Vesting proxy
// 0xDa005Ae70DCf099191de08fb0dE1bf5FD2c4ED50 Vesting Impl v1

// Polygon
//
//

async function dj() {
    var contractDJ = await ethers.deployContract("DreamJunk");
    console.log(`Address del contrato ${await contractDJ.getAddress()}`)

    var res = await contractDJ.waitForDeployment();
    await res.deploymentTransaction().wait(5);

    await hre.run("verify:verify", {
        address: await contractDJ.getAddress(),
        constructorArguments: [],
        contract: "contracts/ERC20.sol:DreamJunk"
    });
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

vesting().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});