import { Deployer, Reporter } from "@solarity/hardhat-migrate";
import { ethers, artifacts } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const proxyAddress = process.env.PROXY_ADDRESS;

export = async (deployer: Deployer) => {
  try {
    const [deployerSigner] = await ethers.getSigners();

    const BridgeArtifact = await artifacts.readArtifact("Bridge");
    const Bridge = new ethers.ContractFactory(BridgeArtifact.abi, BridgeArtifact.bytecode, deployerSigner);

    const newBridgeImplementation = await deployer.deploy(Bridge);
    const newBridgeAddress = await newBridgeImplementation.getAddress();

    const bridgeProxy = new ethers.Contract(proxyAddress, BridgeArtifact.abi, deployerSigner);

    const data = "0x";

    const txUpgrade = await bridgeProxy.upgradeToAndCall(newBridgeAddress, data, {});

    console.log(`Transaction Bridge Upgrade: Gas used ${txUpgrade.gasUsed}, Hash ${txUpgrade.hash}\n`);

    await Reporter.reportTransactionByHash(txUpgrade.hash, "Bridge Upgrade Transaction");

    Reporter.reportContracts([`New Bridge Implementation Address`, newBridgeAddress]);
  } catch (error) {
    console.error("Upgrade failed:", error);
  }
};
