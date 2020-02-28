#### CONTRACT INFORMATION - Endpoint: /info
Returns the contract information currently operating in the following format:

```
{
  "networkId": "3",
  "contractName": "AirCarbon__v0.96k",
  "contractVersion": "0.96k",
  "contractAddress": "0x6494170A9b2C1DA79d4C3B16757836DC53fd026D",
  "availableWhitelabeledAccounts": "14 of 24"
}
```

### IMPORTANT NOTE:

The smart contract will only operate over accounts addresses that are whitelabled. This is done by design.
Each user account created on the system is assigned a whitelabeled account address. There's a limited 
number of whitelabeled accounts, and once the limit is reached no more user accounts can be created.

The response body includes the number of available whitelabaled accounts addresses.

See "availableWhitelabeledAccounts": "14 of 24" on the response body.

In this case there are still 14 WL accounts available of 24 in total.

__On DEV environment, if we hit the limit, we will redeploy contract on Ropsten and reset availability.__

__PRODUCTION environment will have a much higher number of available WL accounts.__
