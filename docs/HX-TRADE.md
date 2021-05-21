### TRADE - USAGE

#### FIRST STEP - AUTHENTICATION
The API requires the following key in order to access endpoints:
282fba18-f680-4de8-a2fb-17f39c22d7da

If using the API viewer, click on Authorize button and enter the key.

#### TRADING - Endpoint: /trade/transfer
Request body schema:
```json
{
  "ccySender": {
    "addr": "string",  // Address of buyer
    "ccyTypeId": 0,    // Currency type ID
    "ccyValue": 0      // Currency amount to be paid
  },
  "tokSender": {
    "addr": "string",  // Address of seller
    "tokTypeId": 0,  // Token type ID
    "tokenQty": 0      // Token quantity to be sold
  }
}
```

How to test on the API viewer:
1. Click on end point (expand view)
2. Click on Try it out
3. Enter transaction body. You may test with this data:
  ```json
  {
    "ccySender": {
      "addr": "0xBA9e2F4653657DdC9F3d5721bf6B785Cdb6B52bc",
      "ccyTypeId": 1,
      "ccyValue": 8000
    },
    "tokSender": {
      "addr": "0x28F4D53563aC6adBC670Ef5Ad00f47375f87841C",
      "tokenTypeId": 1,
      "tokenQty": 1000
    }
  }
  ```
4. Click on Execute
5. If successfull, 'Response body' should return transaction hash.

__Useful information__
Token Types:
```
  {id: 1, type: "AirCarbon CORSIA Token"}
  {id: 2, type: "AirCarbon Nature Token"}
  {id: 3, type: "AirCarbon Premium Token"}
```

Currency Types:
```
  {id: 1, type: "USD", unit: "cents", decimal: 2}
  {id: 2, type: "ETH", unit: "Wei", decimal: 18}
  {id: 3, type: "BTC", unit: "Satoshi", decimal: 8}
```