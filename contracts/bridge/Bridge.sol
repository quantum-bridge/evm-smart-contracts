// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {IBridge} from "../interfaces/bridge/IBridge.sol";
import {ERC20Handler} from "../handlers/ERC20Handler.sol";
import {ERC721Handler} from "../handlers/ERC721Handler.sol";
import {ERC1155Handler} from "../handlers/ERC1155Handler.sol";
import {NativeHandler} from "../handlers/NativeHandler.sol";

import "../errors/Errors.sol";

contract Bridge is
    IBridge,
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ERC20Handler,
    ERC721Handler,
    ERC1155Handler,
    NativeHandler
{
    using MessageHashUtils for bytes32;
    using ECDSA for bytes32;
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 public thresholdSignerSignatures;
    EnumerableSet.AddressSet internal signersAddresses;

    mapping(bytes32 => bool) public hashes; // Stores the keccak256 hash of the transaction + transaction nonce to prevent replay attacks

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner_,
        address[] calldata signers_,
        uint256 thresholdSignerSignatures_
    ) public initializer {
        __Ownable_init(initialOwner_);
        __UUPSUpgradeable_init();

        addSigners(signers_);
        updateThresholdSignatures(thresholdSignerSignatures_);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function withdrawERC20(
        address token_,
        uint256 amount_,
        address to_,
        bytes32 txHash_,
        uint256 txNonce_,
        bool isMintable_,
        bytes[] calldata signatures_
    ) external override {
        bytes32 signHash_ = getERC20SignHash(
            token_,
            amount_,
            to_,
            txHash_,
            txNonce_,
            block.chainid,
            isMintable_
        );

        _storeHash(txHash_, txNonce_);
        _verifySignatures(signHash_, signatures_);

        _withdrawERC20(token_, amount_, to_, isMintable_);
    }

    function withdrawERC721(
        address token_,
        uint256 tokenId_,
        address to_,
        bytes32 txHash_,
        uint256 txNonce_,
        string calldata tokenURI_,
        bool isMintable_,
        bytes[] calldata signatures_
    ) external override {
        bytes32 signHash_ = getERC721SignHash(
            token_,
            tokenId_,
            to_,
            txHash_,
            txNonce_,
            block.chainid,
            tokenURI_,
            isMintable_
        );

        _storeHash(txHash_, txNonce_);
        _verifySignatures(signHash_, signatures_);

        _withdrawERC721(token_, tokenId_, to_, tokenURI_, isMintable_);
    }

    function withdrawERC1155(
        address token_,
        uint256 tokenId_,
        uint256 amount_,
        address to_,
        bytes32 txHash_,
        uint256 txNonce_,
        string calldata tokenURI_,
        bool isMintable_,
        bytes[] calldata signatures_
    ) external override {
        bytes32 signHash_ = getERC1155SignHash(
            token_,
            tokenId_,
            amount_,
            to_,
            txHash_,
            txNonce_,
            block.chainid,
            tokenURI_,
            isMintable_
        );

        _storeHash(txHash_, txNonce_);
        _verifySignatures(signHash_, signatures_);

        _withdrawERC1155(token_, tokenId_, amount_, to_, tokenURI_, isMintable_);
    }

    function withdrawNative(
        uint256 amount_,
        address to_,
        bytes32 txHash_,
        uint256 txNonce_,
        bytes[] calldata signatures_
    ) external override {
        bytes32 signHash_ = getNativeSignHash(
            amount_,
            to_,
            txHash_,
            txNonce_,
            block.chainid
        );

        _storeHash(txHash_, txNonce_);
        _verifySignatures(signHash_, signatures_);

        _withdrawNative(amount_, to_);
    }

    function _storeHash(bytes32 txHash_, uint256 txNonce_) internal {
        bytes32 nonceHash_ = keccak256(abi.encodePacked(txHash_, txNonce_));

        if (hashes[nonceHash_]) revert HashNonceUsed();

        hashes[nonceHash_] = true;
    }

    function checkHash(bytes32 txHash_, uint256 txNonce_) external view returns (bool) {
        bytes32 nonceHash_ = keccak256(abi.encodePacked(txHash_, txNonce_));

        return hashes[nonceHash_];
    }

    function _validateSigners(address[] memory signers_) private view {
        uint256 bitMap;

        for (uint256 i = 0; i < signers_.length; i++) {
            if (!signersAddresses.contains(signers_[i])) revert InvalidSigners();

            uint256 bitKey = 2 ** (uint256(uint160(signers_[i])) >> 152);

            if (bitMap & bitKey != 0) revert SignersExist();

            bitMap |= bitKey;
        }

        if (signers_.length < thresholdSignerSignatures) revert ThresholdLessThanSignatures();
    }

    function _verifySignatures(bytes32 signHash_, bytes[] calldata signatures_) internal view {
        address[] memory signers_ = new address[](signatures_.length);

        for (uint256 i = 0; i < signatures_.length; i++) {
            signers_[i] = signHash_.toEthSignedMessageHash().recover(signatures_[i]);
        }

        _validateSigners(signers_);
    }

    function updateThresholdSignatures(uint256 thresholdSignerSignatures_) public onlyOwner {
        if (thresholdSignerSignatures_ == 0) revert InvalidThresholdSignatures();

        thresholdSignerSignatures = thresholdSignerSignatures_;
    }

    function addSigners(address[] calldata signers_) public onlyOwner {
        for (uint256 i = 0; i < signers_.length; i++) {
            if (signers_[i] == address(0)) revert SignersAddressCannotBeZero();

            signersAddresses.add(signers_[i]);
        }
    }

    function removeSigners(address[] calldata signers_) public onlyOwner {
        for (uint256 i = 0; i < signers_.length; i++) {
            signersAddresses.remove(signers_[i]);
        }
    }

    function getSigners() external view returns (address[] memory) {
        return signersAddresses.values();
    }
}
