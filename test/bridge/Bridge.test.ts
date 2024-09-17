import { ethers } from "hardhat";
import { expect } from "chai";
import {BaseContract, Contract, Signer} from "ethers";
import {wei} from "@scripts";
import {personalSign} from "@metamask/eth-sig-util";

describe("Bridge", function () {
  // Private keys for the owner and the second account (second account is not a signer).
  const OWNER_PRIVATE_KEY = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  const SECOND_PRIVATE_KEY = "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
  const NONSIGNER_PRIVATE_KEY = "f214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897"
  const secondAccount = "0xBcd4042DE499D14e55001CcbB24a551F3b954096"
  let ownerAddress: string;
  let tokenId;
  let network;
  let isMintable;
  let txNonce;
  let thresholdSignatures;

  // Contracts and signers.
  let Bridge: BaseContract & Omit<BaseContract, keyof BaseContract>;
  let signers: Signer[];

  beforeEach(async function () {
    network = "test-network-1";
    txNonce = 0;
    isMintable = false;

    // Get the signers from the network.
    signers = await ethers.getSigners();
    // Get the owner's address from the first signer.
    ownerAddress = await signers[0].getAddress();
    // Set the threshold signatures for the Bridge contract.
    thresholdSignatures = 1;
  });

  describe("ERC-20", function () {
    // ERC20 token contract and the amount of tokens to deposit.
    let ERC20Token: Contract;
    let amount;
    let largeAmount;

    beforeEach(async function () {
      // Deploy the Bridge contract and the ERC20 token contract.
      amount = wei("1000000");
      largeAmount = wei("1000000000");

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
      await Bridge.initialize(ownerAddress, [ownerAddress, await signers[1].getAddress()], thresholdSignatures);

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

      const privateKey = Buffer.from(OWNER_PRIVATE_KEY, 'hex');
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
      const signature = personalSign({ privateKey: Buffer.from(NONSIGNER_PRIVATE_KEY, 'hex'), data: signHash });

      // Attempt to withdraw tokens from the Bridge contract with a signature from a non-signer.
      await expect(
        Bridge.connect(signers[1]).withdrawERC20(ERC20Token.getAddress(), amount, ownerAddress, tx.hash, txNonce, isMintable, [signature])
      ).to.be.reverted;
    });

    it("should deposit and withdraw ERC20 tokens with multiple signatures", async function () {
      // Update the threshold signatures to 2.
      const tx = await Bridge.connect(signers[0]).updateThresholdSignatures(2);

      // Call the function with all required arguments to deposit tokens to the Bridge contract.
      await Bridge.connect(signers[0]).depositERC20(await ERC20Token.getAddress(), amount, ownerAddress, network, isMintable);

      // Prepare the withdrawal data and sign it with the owner's private key.
      const signHash = await Bridge.getERC20SignHash(await ERC20Token.getAddress(), amount, ownerAddress, tx.hash, txNonce, tx.chainId, isMintable);
      const signature = personalSign({ privateKey: Buffer.from(OWNER_PRIVATE_KEY, 'hex'), data: signHash });

      // Prepare the withdrawal data and sign it with the second private key.
      const signHash2 = await Bridge.getERC20SignHash(await ERC20Token.getAddress(), amount, ownerAddress, tx.hash, txNonce, tx.chainId, isMintable);
      const signature2 = personalSign({ privateKey: Buffer.from(SECOND_PRIVATE_KEY, 'hex'), data: signHash2 });

      // Withdraw tokens from the Bridge contract to the deployer.
      await Bridge.connect(signers[0]).withdrawERC20(await ERC20Token.getAddress(), amount, ownerAddress, tx.hash, txNonce, isMintable, [signature, signature2]);
    });

    it("should revert when withdrawing tokens with a signature from a non-signer account", async function () {
      // Update the threshold signatures to 2.
      const tx = await Bridge.connect(signers[0]).updateThresholdSignatures(2);

      // Call the function with all required arguments to deposit tokens to the Bridge contract.
      await Bridge.connect(signers[0]).depositERC20(await ERC20Token.getAddress(), amount, ownerAddress, network, isMintable);

      // Prepare the deposit data and sign it with the second private key.
      const signHash = await Bridge.getERC20SignHash(await ERC20Token.getAddress(), amount, ownerAddress, tx.hash, txNonce, tx.chainId, isMintable);
      const signature = personalSign({ privateKey: Buffer.from(NONSIGNER_PRIVATE_KEY, 'hex'), data: signHash });

      // Attempt to withdraw tokens from the Bridge contract with a signature from a non-signer.
      await expect(Bridge.connect(signers[1]).withdrawERC20(await ERC20Token.getAddress(), amount, ownerAddress, tx.hash, txNonce, isMintable, [signature])).to.be.reverted;
    });

    it("should sign and withdraw with a signature if the threshold is 1 and signer is not owner", async function () {
      // Call the function with all required arguments to deposit tokens to the Bridge contract.
      const tx = await Bridge.connect(signers[0]).depositERC20(await ERC20Token.getAddress(), amount, ownerAddress, network, isMintable);

      // Prepare the withdrawal data and sign it with the second private key.
      const signHash = await Bridge.getERC20SignHash(await ERC20Token.getAddress(), amount, ownerAddress, tx.hash, txNonce, tx.chainId, isMintable);
      const signature = personalSign({ privateKey: Buffer.from(SECOND_PRIVATE_KEY, 'hex'), data: signHash });

      // Withdraw tokens from the Bridge contract to the deployer.
      await Bridge.connect(signers[1]).withdrawERC20(await ERC20Token.getAddress(), amount, ownerAddress, tx.hash, txNonce, isMintable, [signature]);
    });
  });

  describe("ERC-721", function () {
    let ERC721Token: Contract;
    let uri;

    beforeEach(async function () {
      // Deploy the Bridge contract and the ERC721 token contract.
      tokenId = 1;
      uri = "https://test-uri.com/";

      // Deploy the Bridge contract and the ERC721 token contract.
      const BridgeFactory = await ethers.getContractFactory("Bridge");
      const bridgeImplementation = await BridgeFactory.deploy();

      // Deploy the ERC1967Proxy contract and initialize it with the Bridge contract's address.
      const ERC1967ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");
      const proxy = await ERC1967ProxyFactory.deploy(await bridgeImplementation.getAddress(), "0x");

      // Attach the Bridge contract to the proxy.
      Bridge = BridgeFactory.attach(await proxy.getAddress());

      // Deploy the ERC721 token contract.
      const ERC721TokenFactory = await ethers.getContractFactory("ERC721MintableBurnable");
      ERC721Token = await ERC721TokenFactory.deploy(ownerAddress,"Test Token", "TST", uri);

      // Initialize the Bridge contract with the owner's address and the second account's address.
      await Bridge.initialize(ownerAddress, [ownerAddress, await signers[1].getAddress()], thresholdSignatures);

      // Mint some tokens to the owner.
      await ERC721Token.safeMint(ownerAddress, tokenId, uri);

      // Approve the Bridge contract to spend the owner's tokens
      await ERC721Token.connect(signers[0]).approve(Bridge.getAddress(), tokenId);

      // Approve the Bridge contract to spend the deployer's tokens
      await ERC721Token.connect(await signers[0]).approve(await Bridge.getAddress(), tokenId);
    });

    it("should deposit and withdraw ERC721 tokens", async function () {
      // Call the function with all required arguments to deposit tokens to the Bridge contract.
      const tx = await Bridge.connect(signers[0]).depositERC721(await ERC721Token.getAddress(), tokenId, ownerAddress, network, isMintable);

      // Check the Bridge contract's token balance after deposit.
      let owner = await ERC721Token.ownerOf(tokenId);
      expect(owner).to.equal(await Bridge.getAddress());

      // Prepare the withdrawal data and sign it.
      const signHash = await Bridge.getERC721SignHash(await ERC721Token.getAddress(), tokenId, ownerAddress, tx.hash, txNonce, tx.chainId, uri, isMintable);

      const privateKey = Buffer.from(OWNER_PRIVATE_KEY, 'hex');
      const signature = personalSign(
        {privateKey: privateKey, data: signHash}
      );

      // Withdraw tokens from the Bridge contract to the deployer.
      await Bridge.connect(await signers[0]).withdrawERC721(await ERC721Token.getAddress(), tokenId, ownerAddress, tx.hash, txNonce, uri, isMintable, [signature]);

      // Check the deployer's token balance after withdrawal.
      owner = await ERC721Token.ownerOf(tokenId);
      expect(owner).to.equal(ownerAddress);
    });

    it("should revert when trying to deposit a non-existent token", async function () {
      // Attempt to deposit a non-existent token.
      await expect(Bridge.connect(signers[0]).depositERC721(ERC721Token.getAddress(), 9999, ownerAddress, network, isMintable)).to.be.reverted;
    });

    it("should revert when trying to withdraw a non-existent token", async function () {
      // Call the function with all required arguments to deposit tokens to the Bridge contract.
      const tx = await Bridge.connect(signers[0]).depositERC721(await ERC721Token.getAddress(), tokenId, ownerAddress, network, isMintable);

      // Get the sign hash and sign it with the owner's private key.
      const signHash = await Bridge.getERC721SignHash(await ERC721Token.getAddress(), 9999, ownerAddress, tx.hash, txNonce, tx.chainId, uri, isMintable);
      const signature = personalSign({ privateKey: Buffer.from(OWNER_PRIVATE_KEY, 'hex'), data: signHash });

      // Attempt to withdraw a non-existent token.
      await expect(Bridge.connect(signers[0]).withdrawERC721(await ERC721Token.getAddress(), 9999, ownerAddress, tx.hash, txNonce, uri, isMintable, [signature])).to.be.reverted;
    });

    it("should revert when trying to withdraw tokens with an invalid signature", async function () {
      // Call the function with all required arguments to deposit tokens to the Bridge contract.
      const invalidSignature = "0x" + "b".repeat(130);

      // Call the function with all required arguments to deposit tokens to the Bridge contract.
      const tx = await Bridge.connect(signers[0]).depositERC721(await ERC721Token.getAddress(), tokenId, ownerAddress, network, isMintable);

      // Attempt to withdraw tokens with an invalid signature.
      await expect(Bridge.connect(signers[0]).withdrawERC721(await ERC721Token.getAddress(), tokenId, ownerAddress, tx.hash, txNonce, uri, isMintable, [invalidSignature])).to.be.reverted;
    });

    it("should revert when trying to deposit or withdraw tokens with signatures from non-signers account", async function () {
      // Mint some tokens to the non-signer account.
      const nonSignerTokenId = 2;

      // Mint some tokens to the non-signer.
      await ERC721Token.safeMint(await signers[1].getAddress(), nonSignerTokenId, uri);

      // Approve the Bridge contract to spend the non-signer's tokens
      await ERC721Token.connect(signers[1]).approve(Bridge.getAddress(), nonSignerTokenId);

      // Attempt to deposit tokens from an address that is not a signer.
      await Bridge.connect(signers[1]).depositERC721(ERC721Token.getAddress(), nonSignerTokenId, signers[1].getAddress(), network, isMintable);

      // Deposit tokens to the Bridge contract.
      const tx = await Bridge.connect(signers[0]).depositERC721(ERC721Token.getAddress(), tokenId, ownerAddress, network, isMintable);

      // Prepare the withdrawal data and sign it with the second private key.
      const signHash = await Bridge.getERC721SignHash(ERC721Token.getAddress(), tokenId, ownerAddress, tx.hash, txNonce, tx.chainId, uri, isMintable);
      const signature = personalSign({ privateKey: Buffer.from(NONSIGNER_PRIVATE_KEY, 'hex'), data: signHash });

      // Attempt to withdraw tokens from the Bridge contract with a signature from a non-signer.
      await expect(
        Bridge.connect(signers[1]).withdrawERC721(ERC721Token.getAddress(), tokenId, ownerAddress, tx.hash, txNonce, uri, isMintable, [signature])
      ).to.be.reverted;
    });

    it("should deposit and withdraw ERC721 tokens with multiple signatures", async function () {
      // Update the threshold signatures to 2.
      const tx = await Bridge.connect(signers[0]).updateThresholdSignatures(2);

      // Call the function with all required arguments to deposit tokens to the Bridge contract.
      await Bridge.connect(signers[0]).depositERC721(await ERC721Token.getAddress(), tokenId, ownerAddress, network, isMintable);

      // Prepare the withdrawal data and sign it with the owner's private key.
      const signHash = await Bridge.getERC721SignHash(await ERC721Token.getAddress(), tokenId, ownerAddress, tx.hash, txNonce, tx.chainId, uri, isMintable);
      const signature = personalSign({ privateKey: Buffer.from(OWNER_PRIVATE_KEY, 'hex'), data: signHash });

      // Prepare the withdrawal data and sign it with the second private key.
      const signHash2 = await Bridge.getERC721SignHash(await ERC721Token.getAddress(), tokenId, ownerAddress, tx.hash, txNonce, tx.chainId, uri, isMintable);
      const signature2 = personalSign({ privateKey: Buffer.from(SECOND_PRIVATE_KEY, 'hex'), data: signHash2 });

      // Withdraw tokens from the Bridge contract to the deployer.
      await Bridge.connect(signers[0]).withdrawERC721(await ERC721Token.getAddress(), tokenId, ownerAddress, tx.hash, txNonce, uri, isMintable, [signature, signature2]);
    });

    it("should revert when withdrawing tokens with a signature from a non-signer account", async function () {
      // Update the threshold signatures to 2.
      const tx = await Bridge.connect(signers[0]).updateThresholdSignatures(2);

      // Call the function with all required arguments to deposit tokens to the Bridge contract.
      await Bridge.connect(signers[0]).depositERC721(await ERC721Token.getAddress(), tokenId, ownerAddress, network, isMintable);

      // Prepare the deposit data and sign it with the second private key.
      const signHash = await Bridge.getERC721SignHash(await ERC721Token.getAddress(), tokenId, ownerAddress, tx.hash, txNonce, tx.chainId, uri, isMintable);
      const signature = personalSign({ privateKey: Buffer.from(NONSIGNER_PRIVATE_KEY, 'hex'), data: signHash });

      // Attempt to withdraw tokens from the Bridge contract with a signature from a non-signer.
      await expect(Bridge.connect(signers[1]).withdrawERC721(await ERC721Token.getAddress(), tokenId, ownerAddress, tx.hash, txNonce, uri, isMintable, [signature])).to.be.reverted;
    });

    it("should sign and withdraw with a signature if the threshold is 1 and signer is not owner", async function () {
      // Call the function with all required arguments to deposit tokens to the Bridge contract.
      const tx = await Bridge.connect(signers[0]).depositERC721(await ERC721Token.getAddress(), tokenId, ownerAddress, network, isMintable);

      // Prepare the withdrawal data and sign it with the second private key.
      const signHash = await Bridge.getERC721SignHash(await ERC721Token.getAddress(), tokenId, ownerAddress, tx.hash, txNonce, tx.chainId, uri, isMintable);
      const signature = personalSign({ privateKey: Buffer.from(SECOND_PRIVATE_KEY, 'hex'), data: signHash });

      // Withdraw tokens from the Bridge contract to the deployer.
      await Bridge.connect(signers[1]).withdrawERC721(await ERC721Token.getAddress(), tokenId, ownerAddress, tx.hash, txNonce, uri, isMintable, [signature]);
    });
  });

  describe("Signatures", function () {
    beforeEach(async function () {
      // Deploy the Bridge contract.
      const BridgeFactory = await ethers.getContractFactory("Bridge");
      const bridgeImplementation = await BridgeFactory.deploy();

      // Deploy the ERC1967Proxy contract and initialize it with the Bridge contract's address.
      const ERC1967ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");
      const proxy = await ERC1967ProxyFactory.deploy(await bridgeImplementation.getAddress(), "0x");

      // Attach the Bridge contract to the proxy.
      Bridge = BridgeFactory.attach(await proxy.getAddress());

      // Initialize the Bridge contract with the owner's address and the second account's address.
      await Bridge.initialize(ownerAddress, [ownerAddress, await signers[1].getAddress()], thresholdSignatures);
    });

    it("should update the threshold signatures", async function () {
      const newThreshold = 2;
      // Update the threshold signatures to 2.
      await Bridge.connect(signers[0]).updateThresholdSignatures(newThreshold);

      // Check the threshold signatures after update.
      const bridgeSigners = await Bridge.getSigners();
      expect(bridgeSigners.length).to.equal(newThreshold);
    });

    it("should revert when trying to update the threshold signatures with an invalid number", async function () {
      // Attempt to update the threshold signatures with an invalid number.
      await expect(Bridge.connect(signers[0]).updateThresholdSignatures(0)).to.be.reverted;
    });

    it("should revert when trying to update the threshold signatures with a number greater than the number of signers", async function () {
      // Attempt to update the threshold signatures with a number greater than the number of signers.
      await expect(Bridge.connect(signers[0]).updateThresholdSignatures(3)).to.be.reverted;
    });

    it("should revert when trying to update the threshold signatures from a not owner account", async function () {
      // Attempt to update the threshold signatures from a non-signer account.
      await expect(Bridge.connect(signers[1]).updateThresholdSignatures(2)).to.be.reverted;
    });

    it ("should add a one new signer", async function () {
      // Get the new signer's address from the third signer.
      const newSigner = await signers[2].getAddress();
      // Add a new signer to the Bridge contract.
      await Bridge.connect(signers[0]).addSigners([newSigner]);

      // Check the new signer after adding.
      const bridgeSigners = await Bridge.getSigners();
      expect(bridgeSigners).to.include(newSigner);
    });

    it ("should add multiple new signers", async function () {
      // Add multiple new signers to the Bridge contract.
      const newSigners = [await signers[2].getAddress(), await signers[3].getAddress(), await signers[4].getAddress()];
      // Add multiple new signers to the Bridge contract.
      await Bridge.connect(signers[0]).addSigners(newSigners);

      // Check the new signers after adding.
      const bridgeSigners = await Bridge.getSigners();
      expect(bridgeSigners).to.include(newSigners[0]);
      expect(bridgeSigners).to.include(newSigners[1]);
      expect(bridgeSigners).to.include(newSigners[2]);
    });

    it("should revert when trying to add a new signer from a not owner account", async function () {
      // Attempt to add a new signer from a non-signer account.
      await expect(Bridge.connect(signers[1]).addSigners([await signers[2].getAddress()])).to.be.reverted;
    });

    it("should revert when trying to add a new signer that is already a signer", async function () {
      // Get the new signer's address from the first signer.
      const newSigner = await signers[3].getAddress();
      // Add a new signer to the Bridge contract.
      await Bridge.connect(signers[0]).addSigners([newSigner]);

      // Attempt to add a new signer that is already a signer to the Bridge contract.
      await expect(Bridge.connect(signers[0]).addSigners([newSigner])).to.be.reverted;
    });

    it("should remove a signer", async function () {
      // Add a new signer to the Bridge contract.
      const newSigners = [await signers[2].getAddress(), await signers[3].getAddress(), await signers[4].getAddress()];
      await Bridge.connect(signers[0]).addSigners(newSigners);

      // Remove a signer from the Bridge contract.
      await Bridge.connect(signers[0]).removeSigners([newSigners[0]]);

      // Check the new signers after removing.
      const bridgeSigners = await Bridge.getSigners();
      expect(bridgeSigners).to.not.include(newSigners[0]);
    });

    it("should remove multiple signers", async function () {
      // Add multiple new signers to the Bridge contract.
      const newSigners = [await signers[2].getAddress(), await signers[3].getAddress(), await signers[4].getAddress()];
      await Bridge.connect(signers[0]).addSigners(newSigners);

      // Remove multiple signers from the Bridge contract.
      await Bridge.connect(signers[0]).removeSigners([newSigners[0], newSigners[1]]);

      // Check the new signers after removing.
      const bridgeSigners = await Bridge.getSigners();
      expect(bridgeSigners).to.not.include(newSigners[0]);
      expect(bridgeSigners).to.not.include(newSigners[1]);
    });
  });
});
