// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Custom errors for gas optimization and lower bytecode size.

// Token errors
error ReceiverNotSet();
error TokenNotSet();
error InvalidAmount();
error ZeroToken();
error ZeroReceiver();
error ZeroAmount();
error NotApprovedForBurning();

// Bridge errors
error HashNonceUsed();
error InvalidSigners();
error SignersExist();
error ThresholdLessThanSignatures();
error InvalidThresholdSignatures();
error SignersAddressCannotBeZero();
