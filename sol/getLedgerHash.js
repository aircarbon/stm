const { soliditySha3 } = require('web3-utils');

// implement get ledger hash
// Refer to: getLedgerHashcode on LedgerLib.sol
function getLedgerHash(data, mod, n) {
  // hash currency types & exchange currency fees
  let ledgerHash = '';
  const ccyTypes = data?.ccyTypes ?? [];
  const ccyFees = data?.ccyFees ?? [];
  for (let index = 0; index < ccyTypes.length; index++) {
    const ccyType = ccyTypes[index];
    if (ccyType.id % mod !== n) {
      continue;
    }
    ledgerHash = soliditySha3(ledgerHash, ccyType.id, ccyType.name, ccyType.unit, ccyType.decimals);
    if (
      ccyFees[index]?.fee_fixed ||
      ccyFees[index]?.fee_percBips ||
      ccyFees[index]?.fee_min ||
      ccyFees[index]?.fee_max ||
      ccyFees[index]?.ccy_perMillion ||
      ccyFees[index]?.ccy_mirrorFee
    ) {
      ledgerHash = soliditySha3(
        ledgerHash,
        ccyFees[index].fee_fixed,
        ccyFees[index].fee_percBips,
        ccyFees[index].fee_min,
        ccyFees[index].fee_max,
        ccyFees[index].ccy_perMillion,
        ccyFees[index].ccy_mirrorFee,
      );
    }
  }

  // hash token types & exchange token fees
  const tokenTypes = data?.tokenTypes ?? [];
  const tokenFees = data?.tokenFees ?? [];
  for (let index = 0; index < tokenTypes.length; index++) {
    const tokenType = tokenTypes[index];
    if (tokenType.id % mod !== n) {
      continue;
    }
    ledgerHash = soliditySha3(
      ledgerHash,
      tokenType.name,
      tokenType.settlementType,
      tokenType.ft.expiryTimestamp,
      tokenType.ft.underlyerTypeId,
      tokenType.ft.refCcyId,
      tokenType.ft.initMarginBips,
      tokenType.ft.varMarginBips,
      tokenType.ft.contractSize,
      tokenType.ft.feePerContract,
      tokenType.cashflowBaseAddr,
    );
    if (
      tokenFees[index]?.fee_fixed ||
      tokenFees[index]?.fee_percBips ||
      tokenFees[index]?.fee_min ||
      tokenFees[index]?.fee_max ||
      tokenFees[index]?.ccy_perMillion ||
      tokenFees[index]?.ccy_mirrorFee
    ) {
      ledgerHash = soliditySha3(
        ledgerHash,
        tokenFees[index].fee_fixed,
        tokenFees[index].fee_percBips,
        tokenFees[index].fee_min,
        tokenFees[index].fee_max,
        tokenFees[index].ccy_perMillion,
        tokenFees[index].ccy_mirrorFee,
      );
    }
  }

  // hash whitelist
  const whitelistAddresses = data?.whitelistAddresses ?? [];
  whitelistAddresses
    .filter((_address, index) => Number(index) % mod !== n)
    .forEach((address) => {
      ledgerHash = soliditySha3(ledgerHash, address);
    });

  // hash batches
  const batches = data?.batches ?? [];
  batches
    .filter((batch) => Number(batch.id) % mod !== n)
    .forEach((batch) => {
      ledgerHash = soliditySha3(
        ledgerHash,
        batch.id,
        batch.mintedTimestamp,
        batch.tokTypeId,
        batch.mintedQty,
        batch.burnedQty,
        ...batch.metaKeys,
        ...batch.metaValues,
        batch.origTokFee.fee_fixed,
        batch.origTokFee.fee_percBips,
        batch.origTokFee.fee_min,
        batch.origTokFee.fee_max,
        batch.origTokFee.ccy_perMillion,
        batch.origTokFee.ccy_mirrorFee,
        batch.origCcyFee_percBips_ExFee,
        batch.originator,
      );
    });

  // hash ledgers
  const ledgers = data?.ledgers ?? [];
  const ledgerOwners = data?.ledgerOwners ?? [];
  for (let index = 0; index < ledgers.length; index++) {
    if (index % mod !== n) {
      continue;
    }

    if (index !== 0) {
      ledgerHash = soliditySha3(ledgerHash, ledgerOwners[index]);
    }
    const legerEntry = ledgers[index];
    ledgerHash = soliditySha3(
      ledgerHash,
      legerEntry.spot_sumQty,
      legerEntry.spot_sumQtyMinted,
      legerEntry.spot_sumQtyBurned,
    );

    const ccys = legerEntry.ccys ?? [];
    ccys.forEach((ccy) => {
      ledgerHash = soliditySha3(ledgerHash, ccy.ccyTypeId, ccy.name, ccy.unit, ccy.balance, ccy.reserved);
    });

    const tokens = legerEntry.tokens ?? [];
    tokens.forEach((token) => {
      ledgerHash = soliditySha3(
        ledgerHash,
        token.stId,
        token.tokTypeId,
        token.tokTypeName,
        token.batchId,
        token.mintedQty,
        token.currentQty,
        token.ft_price,
        token.ft_ledgerOwner,
        token.ft_lastMarkPrice,
        token.ft_PL,
      );
    });
  }

  return ledgerHash;
}

exports.getLedgerHash = getLedgerHash;
