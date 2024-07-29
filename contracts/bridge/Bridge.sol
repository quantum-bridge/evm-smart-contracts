// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "../interfaces/bridge/IBridge.sol";

import "../handlers/ERC20Handler.sol";
import "../handlers/ERC721Handler.sol";
import "../handlers/ERC1155Handler.sol";

contract Bridge is IBridge, Initializable, OwnableUpgradeable, UUPSUpgradeable, ERC20Handler, ERC721Handler, ERC1155Handler {
    using MessageHashUtils for bytes32;
    using ECDSA for bytes32;
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 public thresholdOracleSignatures;
    EnumerableSet.AddressSet internal oraclesAddresses;

    mapping(bytes32 => bool) public hashes; // Stores the keccak256 hash of the transaction + transaction nonce to prevent replay attacks

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner_, address[] calldata oracles_, uint256 thresholdOracleSignatures_) initializer public {
        __Ownable_init(initialOwner_);
        __UUPSUpgradeable_init();

        addOracles(oracles_);
        updateThresholdSignatures(thresholdOracleSignatures_);
    }

    function _authorizeUpgrade(address newImplementation) internal onlyOwner override {}

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

    function _storeHash(bytes32 txHash_, uint256 txNonce_) internal {
        bytes32 nonceHash_ = keccak256(abi.encodePacked(txHash_, txNonce_));

        require(!hashes[nonceHash_], "Bridge: the hash nonce is used");

        hashes[nonceHash_] = true;
    }

    function checkHash(bytes32 txHash_, uint256 txNonce_) external view returns (bool) {
        bytes32 nonceHash_ = keccak256(abi.encodePacked(txHash_, txNonce_));

        return hashes[nonceHash_];
    }

    function _validateOracles(address[] memory oracles_) private view {
        uint256 bitMap;

        for (uint256 i = 0; i < oracles_.length; i++) {
            require(oraclesAddresses.contains(oracles_[i]), "Bridge: oracles are invalid");

            uint256 bitKey = 2**(uint256(uint160(oracles_[i])) >> 152);

            require(bitMap & bitKey == 0, "Bridge: oracles are exist");

            bitMap |= bitKey;
        }

        require(oracles_.length >= thresholdOracleSignatures, "Bridge: threshold is less than signatures");
    }

    function _verifySignatures(bytes32 signHash_, bytes[] calldata signatures_) internal view {
        address[] memory oracles_ = new address[](signatures_.length);

        for (uint256 i = 0; i < signatures_.length; i++) {
            oracles_[i] = signHash_.toEthSignedMessageHash().recover(signatures_[i]);
        }

        _validateOracles(oracles_);
    }

    function updateThresholdSignatures(uint256 thresholdOracleSignatures_) public onlyOwner {
        require(thresholdOracleSignatures_ > 0, "Bridge: invalid threshold value for signatures");

        thresholdOracleSignatures = thresholdOracleSignatures_;
    }

    function addOracles(address[] calldata oracles_) public onlyOwner {
        for (uint256 i = 0; i < oracles_.length; i++) {
            require(oracles_[i] != address(0), "Bridge: oracles addressess cannot be zero");

            oraclesAddresses.add(oracles_[i]);
        }
    }

    function removeOracles(address[] calldata oracles_) public onlyOwner {
        for (uint256 i = 0; i < oracles_.length; i++) {
            oraclesAddresses.remove(oracles_[i]);
        }
    }

    function getOracles() external view returns (address[] memory) {
        return oraclesAddresses.values();
    }
}
