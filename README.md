# EVM Smart Contracts

This repository contains the source code for the EVM smart contracts that are used in the Quantum Bridge.

## Contracts
### Bridge.sol
This contract is the main contract that is used to interact with the bridge. It contains the logic for the bridge to work. This contract is Upgradeable with UUPS Proxy.

## How to use

The template works out of the box. To clean up the repo, you may need to delete the mock contracts, tests and migration files.

### Compilation

To compile the contracts, use the next script:

```bash
npm run compile
```

### Test

To run the tests, execute the following command:

```bash
npm run test
```

Or to see the coverage, run:

```bash
npm run coverage
```

### Local deployment

To deploy the contracts locally, run the following commands (in the different terminals):

```bash
npm run private-network
npm run deploy-localhost
```

### Bindings

The command to generate the bindings is as follows:

```bash
npm run generate-types
```

> See the full list of available commands in the `package.json` file.
