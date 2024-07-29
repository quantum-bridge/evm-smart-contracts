const Bridge = artifacts.require("Bridge");
const ERC1967Proxy = artifacts.require("ERC1967Proxy");

const OWNER = process.env.BRIDGE_OWNER;
const validators = process.env.BRIDGE_VALIDATORS.split(",");
const threshold = parseInt(process.env.BRIDGE_THRESHOLD, 10);

module.exports = async (deployer) => {
    const bridge = await deployer.deploy(Bridge);
    const proxy = await deployer.deploy(ERC1967Proxy, bridge.address, []);

    const bridgeProxy = await Bridge.at(proxy.address);

    console.log(`Implementation address: ${bridge.address}`);
    console.log(`ERC1967Proxy address: ${bridgeProxy.address}`);

    const tx = await bridgeProxy.initialize(OWNER, validators, threshold)

    console.log(`Transaction Bridge Initialize: Gas used ${tx.receipt.gasUsed}, Hash ${tx.tx}\n`);
};
