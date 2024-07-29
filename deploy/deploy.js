const TruffleDeployer = require("@truffle/deployer");
const TruffleReporter = require("@truffle/reporters").migrationsV5;
const fs = require("fs");
const path = require("path");

class Verifier {
    async verify(...contractsWithArgs) {
        hre.config.contractSizer.runOnCompile = false;

        for (let i = 0; i < contractsWithArgs.length; i++) {
            const contract = contractsWithArgs[i][0];
            const fileName = contract.constructor._hArtifact.sourceName;
            const contractName = contract.constructor._hArtifact.contractName;
            const args = contractsWithArgs[i].slice(1);

            try {
                await hre.run("verify:verify", {
                    address: contract.address,
                    constructorArguments: args,
                    contract: fileName + ":" + contractName,
                });

                await hre.run("compile", {
                    quiet: true,
                });
            } catch (e) {
                console.log(e.message);
            }
        }
    }
}

class Deployer {
    async startMigration(verify, confirmations = 0) {
        try {
            let chainId = await web3.eth.getChainId();
            let networkType = await web3.eth.net.getNetworkType();

            this.reporter = new TruffleReporter();
            this.deployer = new TruffleDeployer({
                logger: console,
                confirmations: confirmations,
                provider: web3.currentProvider,
                networks: { chainId: networkType },
                network: "",
                network_id: chainId,
            });

            if (!this.deployer.logger) {
                this.deployer.logger = console;
            }

            if (verify) {
                this.verifier = new Verifier();
            }

            this.reporter.confirmations = confirmations;
            this.reporter.setMigration({ dryRun: false });
            this.reporter.setDeployer(this.deployer);

            this.reporter.listen();
            this.deployer.start();

            this.reporter.preMigrate({
                isFirst: true,
                file: "Contracts:",
                network: networkType,
                networkId: chainId,
                blockLimit: (await web3.eth.getBlock("latest")).gasLimit,
            });
        } catch (e) {
            console.log(e.message);
        }
    }

    async deploy(Instance, ...args) {
        try {
            const instance = await this.deployer.deploy(Instance, ...args);

            Instance.setAsDeployed(instance);

            if (this.verifier) {
                await this.verifier.verify([instance, ...args]);
            }

            return instance;
        } catch (e) {
            console.log(e.message);
        }
    }

    async finishMigration() {
        try {
            this.reporter.postMigrate({
                isLast: true,
            });

            this.deployer.finish();
        } catch (e) {
            console.log(e.message);
        }
    }
}

class Migrations {
    getMigrationFiles() {
        const migrationsDir = "./deploy/migrations/";
        const directoryContents = fs.readdirSync(migrationsDir);

        let files = directoryContents
            .filter((file) => !isNaN(parseInt(path.basename(file))))
            .filter((file) => fs.statSync(migrationsDir + file).isFile())
            .sort((a, b) => {
                return parseInt(path.basename(a)) - parseInt(path.basename(b));
            });

        return files;
    }

    confirmations() {
        return process.env.CONFIRMATIONS;
    }

    getParams() {
        const verify = process.env.VERIFY == "true";
        let confirmations = 0;

        if (verify) {
            console.log("\nAUTO VERIFICATION IS ON");

            confirmations = 5;
        }

        if (this.confirmations() !== undefined) {
            confirmations = this.confirmations();
        }

        return [verify, confirmations];
    }

    async migrate() {
        try {
            const migrationFiles = this.getMigrationFiles();
            const deployer = new Deployer();

            await deployer.startMigration(...this.getParams());

            console.log(migrationFiles);

            for (let i = 0; i < migrationFiles.length; i++) {
                const migration = require("./migrations/" + migrationFiles[i]);

                await migration(deployer);
            }

            await deployer.finishMigration();

            process.exit(0);
        } catch (e) {
            console.log(e.message);
            process.exit(1);
        }
    }
}

let migrations = new Migrations();

migrations.migrate().then();
