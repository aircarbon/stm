## Data migration

Step 1:

Backup:
-s=SOURCE_CONTRACT_ADDRESS
-h=[onchain/offchain] generate ledger hash code onchain or offchain

```sh
export INSTANCE_ID=UAT_97_AC && truffle exec contract_upgrade/backup.js -h=offchain -s='cada1b5846aa836d60c00f1ed77d04401c9e421e' --network=bsc_testnet_bn --compile
```

Step 2:
Deploy:
RESTORE_CONTRACT=YES Tell deployment script to skip the defaults

```sh
export INSTANCE_ID=UAT_80001_AC && node process_sol_js && truffle compile && export RESTORE_CONTRACT=YES && truffle migrate --network matic_testnet -f 2 --to 2
```

Step 3:
Restore:
-s=BACKUP_SET
-t=NEW_DEPLOY_CONTRACT_ADDRESS
-h=[onchain/offchain] generate ledger hash code onchain or offchain

```sh
export INSTANCE_ID=UAT_80001_AC && truffle exec contract_upgrade/restore.js -s='cada1b5846aa836d60c00f1ed77d04401c9e421e' -t='924A23F713a9Bf75Aae4f2F794C7BDc364Bd7C84' -h=offchain --network=matic_testnet --compile

```

Step4:
Migrate new indexer (copy old indexer), add new column: networkId=97

```sh
cd contract_upgrade/cli
yarn install
cp .env.example .env
# Change .env file to correct env
yarn migrate:up
```
