import { ethers } from "hardhat";
import { expect } from "chai";
import {BaseContract, Contract, Signer} from "ethers";
import {wei} from "@scripts";
import {personalSign} from "@metamask/eth-sig-util";

describe("Bridge", function () {
  const OWNER_PRIVATE_KEY = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  const SECOND_PRIVATE_KEY = "f214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897"
  const secondAccount = "0xBcd4042DE499D14e55001CcbB24a551F3b954096"
  let ownerAddress: string;
  let amount;
  let largeAmount;
  let network;
  let isMintable;
  let txNonce

  let Bridge: BaseContract & Omit<BaseContract, keyof BaseContract>;
  let ERC20Token: Contract;
  let signers: Signer[];

  beforeEach(async function () {
    // Deploy the Bridge contract and the ERC20 token contract.
    amount = wei("1000000");
    largeAmount = wei("1000000000");
    network = "test-network-1";
    txNonce = 0;
    isMintable = false;

    // Get the signers from the network.
    signers = await ethers.getSigners();
    // Get the owner's address from the first signer.
    ownerAddress = await signers[0].getAddress();

    // Deploy the Bridge contract and the ERC20 token contract.
    const BridgeFactory = await ethers.getContractFactory("Bridge");
    const bridgeImplementation = await BridgeFactory.deploy();

    // Deploy the ERC1967Proxy contract and initialize it with the Bridge contract's address.
    const ERC1967ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");
    const proxy = await ERC1967ProxyFactory.deploy(await bridgeImplementation.getAddress(), "0x");

    // Attach the Bridge contract to the proxy.
    Bridge = BridgeFactory.attach(await proxy.getAddress());

    // Deploy the ERC20 token contract.
    const ERC20TokenFactory = await ethers.getContractFactory("ERC20MintableBurnable");
    ERC20Token = await ERC20TokenFactory.deploy(signers[0].getAddress(), "Test Token", "TST");

    // Initialize the Bridge contract with the owner's address and the second account's address.
    await Bridge.initialize(ownerAddress, [ownerAddress, await signers[1].getAddress()], 1);

    // Mint some tokens to the owner.
    await ERC20Token.mint(ownerAddress, amount);

    // Approve the Bridge contract to spend the owner's tokens
    await ERC20Token.connect(signers[0]).approve(Bridge.getAddress(), amount);

    // Approve the Bridge contract to spend the deployer's tokens
    await ERC20Token.connect(await signers[0]).approve(await Bridge.getAddress(), amount);
  });

  it("should deposit and withdraw ERC20 tokens", async function () {
    // Call the function with all required arguments to deposit tokens to the Bridge contract.
    const tx = await Bridge.connect(signers[0]).depositERC20(await ERC20Token.getAddress(), amount, ownerAddress, network, isMintable);

    // Check the Bridge contract's token balance after deposit.
    let balance = await ERC20Token.balanceOf(await Bridge.getAddress());
    expect(balance.toString()).to.equal(amount.toString());

    // Prepare the withdrawal data and sign it.
    const signHash = await Bridge.getERC20SignHash(await ERC20Token.getAddress(), amount, ownerAddress, tx.hash, txNonce, tx.chainId, isMintable);

    const privateKey = Buffer.from(OWNER_PRIVATE_KEY, 'hex')
    const signature = personalSign(
      {privateKey: privateKey, data: signHash}
    );

    // Withdraw tokens from the Bridge contract to the deployer.
    await Bridge.connect(await signers[0]).withdrawERC20(await ERC20Token.getAddress(), amount, ownerAddress, tx.hash, txNonce, isMintable, [signature]);

    // Check the deployer's token balance after withdrawal.
    balance = await ERC20Token.balanceOf(ownerAddress);
    expect(balance.toString()).to.equal(amount.toString());
  });

  it("should revert when trying to deposit more tokens than the owner's balance", async function () {
    // Attempt to deposit more tokens than the owner's balance.
    await expect(Bridge.connect(signers[0]).depositERC20(ERC20Token.getAddress(), largeAmount, ownerAddress, network, isMintable)).to.be.reverted;
  });

  it("should revert when trying to withdraw more tokens than the Bridge contract's balance", async function () {
    // Call the function with all required arguments to deposit tokens to the Bridge contract.
    const tx = await Bridge.connect(signers[0]).depositERC20(await ERC20Token.getAddress(), amount, ownerAddress, network, isMintable);

    // Get the sign hash and sign it with the owner's private key.
    const signHash = await Bridge.getERC20SignHash(await ERC20Token.getAddress(), largeAmount, ownerAddress, tx.hash, txNonce, tx.chainId, isMintable);
    const signature = personalSign({ privateKey: Buffer.from(OWNER_PRIVATE_KEY, 'hex'), data: signHash });

    // Attempt to withdraw more tokens than the Bridge contract's balance.
    await expect(Bridge.connect(signers[0]).withdrawERC20(await ERC20Token.getAddress(), largeAmount, ownerAddress, tx.hash, txNonce, isMintable, [signature])).to.be.reverted;
  });

  it("should revert when trying to withdraw tokens with an invalid signature", async function () {
    // Call the function with all required arguments to deposit tokens to the Bridge contract.
    const invalidSignature = "0x" + "b".repeat(130);

    // Call the function with all required arguments to deposit tokens to the Bridge contract.
    const tx = await Bridge.connect(signers[0]).depositERC20(await ERC20Token.getAddress(), amount, ownerAddress, network, isMintable);

    // Attempt to withdraw tokens with an invalid signature.
    await expect(Bridge.connect(signers[0]).withdrawERC20(await ERC20Token.getAddress(), amount, ownerAddress, tx.hash, txNonce, isMintable, [invalidSignature])).to.be.reverted;
  });

  it("should revert when trying to deposit or withdraw tokens with signatures from non-signers account", async function () {
    // Approve the Bridge contract to spend the non-signer's tokens.
    await ERC20Token.connect(signers[1]).approve(Bridge.getAddress(), amount);

    // Mint some tokens to the non-signer.
    await ERC20Token.mint(await signers[1].getAddress(), amount);

    // Attempt to deposit tokens from an address that is not a signer.
    await Bridge.connect(signers[1]).depositERC20(ERC20Token.getAddress(), amount, signers[1].getAddress(), network, isMintable);

    // Deposit tokens to the Bridge contract.
    const tx = await Bridge.connect(signers[0]).depositERC20(ERC20Token.getAddress(), amount, ownerAddress, network, isMintable);

    // Prepare the withdrawal data and sign it with the second private key.
    const signHash = await Bridge.getERC20SignHash(ERC20Token.getAddress(), amount, ownerAddress, tx.hash, txNonce, tx.chainId, isMintable);
    const signature = personalSign({ privateKey: Buffer.from(SECOND_PRIVATE_KEY, 'hex'), data: signHash });

    // Attempt to withdraw tokens from the Bridge contract with a signature from a non-signer.
    await expect(
      Bridge.connect(signers[1]).withdrawERC20(ERC20Token.getAddress(), amount, ownerAddress, tx.hash, txNonce, isMintable, [signature])
    ).to.be.reverted;
  });
});
