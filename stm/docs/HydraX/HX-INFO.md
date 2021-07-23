#### CONTRACT INFORMATION - Endpoint: /info
Returns the contract information currently operating in the following format:

```json
{
  "networkId": "3",
  "contractName": "AirCarbon__v0.96k",
  "contractVersion": "0.96k",
  "contractAddress": "0x6494170A9b2C1DA79d4C3B16757836DC53fd026D",
  "availableWhitelistAccounts": "14",
  "totalWhitelistAccounts": "24",
}
```

### IMPORTANT NOTE:

The smart contract will only operate over accounts addresses that are whitelisted. This is done by design.
Each user account created on the system is assigned a whitelisted account address. There's a limited 
number of whitelisted accounts, and once the limit is reached no more user accounts can be created.

The response body includes the number of available and total whitelisted accounts addresses.

__On DEV environment, if we hit the limit, we will redeploy contract on Ropsten and reset availability.__

__PRODUCTION environment will have a much higher number of available WL accounts.__
