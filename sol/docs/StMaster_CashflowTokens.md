# SecurityTokenMaster - Cashflow Token - WIP

## Overview

CFT tokens

## Base Functionality
CFT-type STM deployments inherit functionality from base (commodity) STM with these modifications:
* CFTs cannot add currency or token types
* CFTs are constructed with:
   * a single token type ("UNI_TOKEN") and a single ledger currency (ETH)
   * initial issuer values (```StructLib.CashflowArgs```) including CFT type (BOND or EQUITY)

* CFTs can mint only a single token batch (unibatch)

## Cashflow Functionality
* CFTs allow the unibatch originator to update issuer values: ```PayableLib.setIssuerValues```
* CFTs implement a default payable method: ```PayableLib.pay```
   * If paid by the unibatch originator, CFTs processes the payment as an issuer payment
   * If paid by the any other address, CFTs process the payment as a subscription payment

## Example Flow - Native ETH 

* Owner ("OWNER") - The address of the deployer, or owner, of the contract e.g. SingDax
* Issuer ("ISSUER") - The address of the party making the security token issuance, e.g. Worldbridge
* Subscriber 1 ("SUB1") - The address of the 1st party purchasing tokens in the issuance
* Subscriber 2 ("SUB2") - The address of the 2nd party purchasing tokens in the issuance
* Secondary Buyer 1 ("BUYER1") - The address of the 1st party purchasing/receiving tokens from one of the Subscribers
* Secondary Buyer 2 ("BUYER2") - The address of the 2nd party purchasing/receiving tokens from one of the Subscribers
* Assume: ETH/USD = $150.00

  ### Token Setup & Minting
    - **OWNER** deploys CFT with type BOND and mints a uni batch of 1,000,000 tokens and assigns them to the Issuer's ledger
    - **ISSUER** sets initial issuer values: ```TokenPrice = USD 150.00```/ token, ```SaleAllowance = 500,000``` tokens

  ### Subscriptions
    - **SUB1** sends ```1.0 ETH``` to the contract address; ```1``` token is transfered from Issuer to Subscriber 1; ```1.0 ETH``` is forwarded by the contract to Issuer
    - **SUB2** sends ```3.0 ETH``` to the contract address; ```3``` tokens are transfered from Issuer to Subscriber 2; ```3.0 ETH``` is forwarded by the contract to Issuer

  ### Secondary Sales
    - **SUB2** sends ```1``` token to **BUYER1**
    - **SUB2** sends ```1``` token to **BUYER2**

  ### Issuer Payments
    - **ISSUER** sends ```10.0 ETH```to the contract address; ```10.0 ETH``` is pro-rata'd and forwarded by the contract to all current token holders' addresses:
      - **SUB1** holds 1 token out of total supply 4, receives ```1/4 * 10.0 ETH```
      - **SUB2** holds 1 token out of total supply 4, receives ```1/4 * 10.0 ETH```
      - **BUYER1** holds 1 token out of total supply 4, receives ```1/4 * 10.0 ETH```
      - **BUYER2** holds 1 token out of total supply 4, receives ```1/4 * 10.0 ETH```

## Wallet AutoConversion

In the example above, any party may elect to make use of an **OWNER**-provided wallet with ```ETH <-> TUSD``` auto-conversion facilities. In such cases:
  - For version 1 (using third-party "Changelly" conversion service): the estimated charge for the automated conversion from received ETH into TUSD shall be ~1.0%
  - For version 2 (using a bespoke exchange-connected conversion service): the estimated charge for the automated conversion from received ETH into TUSD shall be ~0.1%

## TODO
* issuer payments (basic)
* "issued but not traded until RMO license" - new flag: dissallowSecondarySale? or better: proper ERC1404
* ERC1404 
* onchain KYC/AI: identity -- ERC725 / 735 -- https://hackernoon.com/first-impressions-with-erc-725-and-erc-735-identity-and-claims-4a87ff2509c9
