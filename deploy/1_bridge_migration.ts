import { Deployer, Reporter } from "@solarity/hardhat-migrate";
import { ethers, artifacts } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const OWNER = process.env.BRIDGE_OWNER;
const validators = (process.env.BRIDGE_SIGNERS as string).split(",");
const threshold = parseInt(process.env.BRIDGE_SIGNERS_THRESHOLD as string, 10);

export = async (deployer: Deployer) => {
  const [deployerSigner] = await ethers.getSigners(); // Get the signer

  const BridgeArtifact = await artifacts.readArtifact("Bridge");
  const ERC1967ProxyArtifact = await artifacts.readArtifact("ERC1967Proxy");

  const Bridge = new ethers.ContractFactory(BridgeArtifact.abi, BridgeArtifact.bytecode, deployerSigner); // Use signer
  const ERC1967Proxy = new ethers.ContractFactory(
    ERC1967ProxyArtifact.abi,
    ERC1967ProxyArtifact.bytecode,
    deployerSigner,
  );

  const bridge = await deployer.deploy(Bridge);
  const bridgeAddress = await bridge.getAddress();

  const proxy = await deployer.deploy(ERC1967Proxy, [bridgeAddress, "0x"]);
  const proxyAddress = await proxy.getAddress();

  const bridgeProxy = new ethers.Contract(proxyAddress, BridgeArtifact.abi, deployerSigner); // Use signer here too

  const tx = await bridgeProxy.initialize(OWNER, validators, threshold);

  await Reporter.reportTransactionByHash(tx.hash, "Initialize Bridge");

  Reporter.reportContracts([`Bridge Implementation Address`, bridgeAddress], [`Bridge Proxy Address`, proxyAddress]);
};
