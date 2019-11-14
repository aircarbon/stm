pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

contract StTransferable is Owned, StLedger {
    event TransferedLedgerCcy(address from, address to, uint256 ccyTypeId, uint256 amount, bool isFee);
    event TransferedFullSecToken(address from, address to, uint256 stId, uint256 mergedToSecTokenId, /*uint256 tokenTypeId,*/ uint256 qty, bool isFee);
    event TransferedPartialSecToken(address from, address to, uint256 splitFromSecTokenId, uint256 newSecTokenId, uint256 mergedToSecTokenId, /*uint256 tokenTypeId,*/ uint256 qty, bool isFee);

    /**
     * Global Fee Structure
     * NOTE: fees are applied ON TOP OF the supplied transfer amounts to the transfer() fn.
     *       i.e. transfer amounts are not inclusive of fees, they are additional
     */
    // FIXED FEES - TOKENS
    mapping(uint256 => uint256) public fee_tokenType_Fixed; // fixed token qty fee per transfer
    event SetFeeSecTokenTypeFixed(uint256 tokenTypeId, uint256 fee_tokenQty_Fixed);
    function setFee_SecTokenType_Fixed(uint256 tokenTypeId, uint256 fee_tokenQty_Fixed) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(tokenTypeId >= 0 && tokenTypeId < _count_tokenTypes, "Invalid ST type");
        fee_tokenType_Fixed[tokenTypeId] = fee_tokenQty_Fixed;
        fee_tokenType_PercBips[tokenTypeId] = 0;
        emit SetFeeSecTokenTypeFixed(tokenTypeId, fee_tokenQty_Fixed);
    }
    // FIXED FEES - CCY
    mapping(uint256 => uint256) public fee_ccyType_Fixed; // fixed currency fee per transfer
    event SetFeeCcyTypeFixed(uint256 ccyTypeId, uint256 fee_ccy_Fixed);
    function setFee_CcyType_Fixed(uint256 ccyTypeId, uint256 fee_ccy_Fixed) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(ccyTypeId >= 0 && ccyTypeId < _count_ccyTypes, "Invalid currency type");
        fee_ccyType_Fixed[ccyTypeId] = fee_ccy_Fixed;
        fee_ccyType_PercBips[ccyTypeId] = 0;
        emit SetFeeCcyTypeFixed(ccyTypeId, fee_ccy_Fixed);
    }

    // PERCENTAGE FEES (BASIS POINTS, 1/100 of 1%) - TOKENS
    mapping(uint256 => uint256) public fee_tokenType_PercBips; // bips (0-10000) token qty fee per transfer
    event SetFeeSecTokenTypePerc(uint256 tokenTypeId, uint256 fee_token_PercBips);
    function setFee_SecTokenType_Perc(uint256 tokenTypeId, uint256 fee_token_PercBips) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(tokenTypeId >= 0 && tokenTypeId < _count_tokenTypes, "Invalid ST type");
        require(fee_token_PercBips < 10000, "Invalid fee basis points");
        fee_tokenType_PercBips[tokenTypeId] = fee_token_PercBips;
        fee_tokenType_Fixed[tokenTypeId] = 0;
        emit SetFeeSecTokenTypePerc(tokenTypeId, fee_token_PercBips);
    }
    // PERCENTAGE FEES (BASIS POINTS, 1/100 of 1%) - CCY
    mapping(uint256 => uint256) public fee_ccyType_PercBips; // bips (0-10000) currency fee per transfer
    event SetFeeCcyTypePerc(uint256 ccyTypeId, uint256 fee_ccy_PercBips);
    function setFee_CcyType_PercBips(uint256 ccyTypeId, uint256 fee_ccy_PercBips) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(ccyTypeId >= 0 && ccyTypeId < _count_ccyTypes, "Invalid currency type");
        require(fee_ccy_PercBips < 10000, "Invalid fee percentage");
        fee_ccyType_PercBips[ccyTypeId] = fee_ccy_PercBips;
        fee_ccyType_Fixed[ccyTypeId] = 0;
        emit SetFeeCcyTypePerc(ccyTypeId, fee_ccy_PercBips);
    }

    /**
     * @dev Returns the global total quantity of token fees paid, in the contract base unit
     */
    // DEMO TMP: remove for easier migration (todo - separate contracts?)
    function getSecToken_totalFeesPaidQty() external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return _tokens_totalFeesPaidQty;
    }

    /**
     * @dev Returns the global total amount of currency fees paid, for the supplied currency
     */
    function getCcy_totalFeesPaidAmount(uint256 ccyTypeId) external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return _ccyType_totalFeesPaid[ccyTypeId];
    }

    /**
     * @dev Transfers or trades assets between ledger accounts
     * @dev allows: one-sided transfers, transfers of same asset types, and transfers (trades) of different asset types
     * @dev disallows: movement from a single origin of more than one asset-type
     * @dev optionally applies: fees per the current fee structure, and paying them to contract owner's ledger entry
     * @param ledger_A Ledger owner A
     * @param ledger_B Ledger owner B
     * @param qty_A Token quantity to move from A to B
     * @param tokenTypeId_A ST type to move from A to B
     * @param qty_B Token quantity to move from B to A
     * @param tokenTypeId_B ST type to move from B to A
     * @param ccy_amount_A Amount of currency to move from A to B
     * @param ccyTypeId_A Currency type to move from A to B
     * @param ccy_amount_B Amount of currency to move from B to A
     * @param ccyTypeId_B Currency type to move from B to A
     * @param applyFees Whether or not to apply fees (both legs, on top of the supplied ccy/token transfer amounts), per the global fee structure
     */
     struct TransferArgs {
        address ledger_A;
        address ledger_B;

        uint256 qty_A;           // ST quantity moving from A (excluding fees, if any)
        uint256 tokenTypeId_A;   // ST type moving from A
        uint256 qty_B;           // " from B
        uint256 tokenTypeId_B;   // " from B

        int256  ccy_amount_A;    // currency amount moving from A (excluding fees, if any) -- (signed value: ledger ccyType_balance supports (theoretical) -ve balances)
        uint256 ccyTypeId_A;     // currency type moving from A
        int256  ccy_amount_B;    // " from B                                               -- (signed value: ledger ccyType_balance supports (theoretical) -ve balances)
        uint256 ccyTypeId_B;     // " from B

        bool    applyFees;       // apply global fee structure to the transfer (both legs)
    }
    function transfer(TransferArgs memory a) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");

        require(_ledger[a.ledger_A].exists == true, "Invalid ledger owner A");
        require(_ledger[a.ledger_B].exists == true, "Invalid ledger owner B");
        require(a.ledger_A != a.ledger_B, "Self transfer disallowed");
        require(a.qty_A > 0 || a.qty_B > 0 || a.ccy_amount_A > 0 || a.ccy_amount_B > 0, "Invalid transfer");
        require(!(a.ccy_amount_A < 0 || a.ccy_amount_B < 0), "Invalid currency amounts"); // disallow negative ccy transfers

        // prevent single origin muliple asset type movement
        require(!((a.qty_A > 0 && a.ccy_amount_A > 0) || (a.qty_B > 0 && a.ccy_amount_B > 0)), "Same origin multiple asset transfer disallowed");

        // validate currency balances
        require(sufficientCcy(a.ledger_A, a.ccyTypeId_A, a.ccy_amount_A,
                              (
                                   int256(fee_ccyType_Fixed[a.ccyTypeId_A]) // fixed ccy fee from A
                                 + int256(((uint256(a.ccy_amount_A)*1000000 / 10000) * fee_ccyType_PercBips[a.ccyTypeId_A]) / 1000000) // bips ccy fee from A
                              )
                              * (a.applyFees && a.ccy_amount_A > 0 ? 1 : 0)), "Insufficient currency held by ledger owner A");
        require(sufficientCcy(a.ledger_B, a.ccyTypeId_B, a.ccy_amount_B,
                              (
                                  int256(fee_ccyType_Fixed[a.ccyTypeId_B]) // fixed ccy fee from A
                                + int256(((uint256(a.ccy_amount_B)*1000000 / 10000) * fee_ccyType_PercBips[a.ccyTypeId_B]) / 1000000) // bips ccy fee from B
                              )
                              * (a.applyFees && a.ccy_amount_B > 0 ? 1 : 0)), "Insufficient currency held by ledger owner B");

        // validate token balances
        require(sufficientTokens(a.ledger_A, a.tokenTypeId_A, a.qty_A,
                             ((fee_tokenType_Fixed[a.tokenTypeId_A]                                                       // fixed token fee from A
                              + ((uint256(a.qty_A)*1000000 / 10000) * fee_tokenType_PercBips[a.tokenTypeId_A]) / 1000000) // bips token fee from A
                             )
                             * (a.applyFees && a.qty_A > 0 ? 1 : 0)), "Insufficient tokens held by ledger owner A");
        require(sufficientTokens(a.ledger_B, a.tokenTypeId_B, a.qty_B,
                             ((fee_tokenType_Fixed[a.tokenTypeId_B]                                                       // fixed token fee from B
                              + ((uint256(a.qty_B)*1000000 / 10000) * fee_tokenType_PercBips[a.tokenTypeId_B]) / 1000000) // bips token fee from B
                             )
                             * (a.applyFees && a.qty_B > 0 ? 1 : 0)), "Insufficient tokens held by ledger owner B");

        // transfer currencies
        if (a.ccy_amount_A > 0) {
            if (a.applyFees) {
                if (fee_ccyType_Fixed[a.ccyTypeId_A] > 0) { // fixed fee: ccy from A
                    transferCcy(TransferCcyArgs({ from: a.ledger_A, to: owner, ccyTypeId: a.ccyTypeId_A,
                        amount: fee_ccyType_Fixed[a.ccyTypeId_A],
                         isFee: true }));
                }
                if (fee_ccyType_PercBips[a.ccyTypeId_A] > 0) { // bips fee: ccy from A (x1000000 for adequate int precision)
                    transferCcy(TransferCcyArgs({ from: a.ledger_A, to: owner, ccyTypeId: a.ccyTypeId_A,
                        amount: ((uint256(a.ccy_amount_A) * 1000000 / 10000) * fee_ccyType_PercBips[a.ccyTypeId_A]) / 1000000,
                         isFee: true }));
                }
            }
            transferCcy(TransferCcyArgs({ from: a.ledger_A, to: a.ledger_B, ccyTypeId: a.ccyTypeId_A, amount: uint256(a.ccy_amount_A), isFee: false }));
        }
        if (a.ccy_amount_B > 0) {
            if (a.applyFees) {
                if (fee_ccyType_Fixed[a.ccyTypeId_B] > 0) { // fixed fee: ccy from B
                    transferCcy(TransferCcyArgs({ from: a.ledger_B, to: owner, ccyTypeId: a.ccyTypeId_B,
                        amount: fee_ccyType_Fixed[a.ccyTypeId_B],
                         isFee: true }));
                }
                if (fee_ccyType_PercBips[a.ccyTypeId_B] > 0) { // bips fee: ccy from B (x1000000 for adequate int precision)
                    transferCcy(TransferCcyArgs({ from: a.ledger_B, to: owner, ccyTypeId: a.ccyTypeId_B,
                        amount: ((uint256(a.ccy_amount_B)*1000000 / 10000) * fee_ccyType_PercBips[a.ccyTypeId_B]) / 1000000,
                         isFee: true }));
                }
            }
            transferCcy(TransferCcyArgs({ from: a.ledger_B, to: a.ledger_A, ccyTypeId: a.ccyTypeId_B, amount: uint256(a.ccy_amount_B), isFee: false }));
        }

        // transfer tokens
        if (a.qty_A > 0) {
            if (a.applyFees) {
                if (fee_tokenType_Fixed[a.tokenTypeId_A] > 0) { // fixed fee
                    transferSplitSecTokens(TransferSplitArgs({ from: a.ledger_A, to: owner, tokenTypeId: a.tokenTypeId_A,
                        qtyUnit: fee_tokenType_Fixed[a.tokenTypeId_A],
                          isFee: true }));
                }
                if (fee_tokenType_PercBips[a.tokenTypeId_A] > 0) { // bips fee
                    transferSplitSecTokens(TransferSplitArgs({ from: a.ledger_A, to: owner, tokenTypeId: a.tokenTypeId_A,
                        qtyUnit: ((uint256(a.qty_A)*1000000 / 10000) * fee_tokenType_PercBips[a.tokenTypeId_A]) / 1000000,
                          isFee: true }));
                }
            }
            transferSplitSecTokens(TransferSplitArgs({ from: a.ledger_A, to: a.ledger_B, tokenTypeId: a.tokenTypeId_A, qtyUnit: a.qty_A, isFee: false }));
        }
        if (a.qty_B > 0) {
            if (a.applyFees) {
                if (fee_tokenType_Fixed[a.tokenTypeId_B] > 0) { // fixed fee
                    transferSplitSecTokens(TransferSplitArgs({ from: a.ledger_B, to: owner, tokenTypeId: a.tokenTypeId_B, qtyUnit: fee_tokenType_Fixed[a.tokenTypeId_B], isFee: true }));
                }
                if (fee_tokenType_PercBips[a.tokenTypeId_B] > 0) { // bips fee
                    transferSplitSecTokens(TransferSplitArgs({ from: a.ledger_B, to: owner, tokenTypeId: a.tokenTypeId_B,
                        qtyUnit: ((uint256(a.qty_B)*1000000 / 10000) * fee_tokenType_PercBips[a.tokenTypeId_B]) / 1000000,
                          isFee: true }));
                }
            }
            transferSplitSecTokens(TransferSplitArgs({ from: a.ledger_B, to: a.ledger_A, tokenTypeId: a.tokenTypeId_B, qtyUnit: a.qty_B, isFee: false }));
        }
    }

    /**
     * @dev Transfers currency across ledger owners
     * @param a args
     */
    struct TransferCcyArgs {
        address from;
        address to;
        uint256 ccyTypeId;
        uint256 amount;
        bool isFee;
    }
    function transferCcy(TransferCcyArgs memory a) private {
        _ledger[a.from].ccyType_balance[a.ccyTypeId] -= int256(a.amount);
        _ledger[a.to].ccyType_balance[a.ccyTypeId] += int256(a.amount);
        _ccyType_totalTransfered[a.ccyTypeId] += a.amount;
        emit TransferedLedgerCcy(a.from, a.to, a.ccyTypeId, a.amount, a.isFee);

        if (a.isFee) {
            _ccyType_totalFeesPaid[a.ccyTypeId] += a.amount;
        }
    }

    /**
     * @dev Transfers STs across ledger owners, splitting (soft-minting) the last ST as necessary
     * @dev (the residual amount left in the origin's last ST after splitting is similar to a UTXO change output)
     * @param a args
     */
    struct TransferSplitArgs {
        address from;
        address to;
        uint256 tokenTypeId;
        uint256 qtyUnit;
        bool isFee;
    }
    function transferSplitSecTokens(TransferSplitArgs memory a) private {

        // transfer sufficient STs (last one may get split)
        uint256 ndx = 0;
        uint256 remainingToTransfer = uint256(a.qtyUnit);
        while (remainingToTransfer > 0) {
            uint256[] storage from_stIds = _ledger[a.from].tokenType_stIds[a.tokenTypeId];
            uint256[] storage to_stIds = _ledger[a.to].tokenType_stIds[a.tokenTypeId];
            uint256 stId = from_stIds[ndx];
            uint256 stQty = _sts_currentQty[stId];

            if (remainingToTransfer >= stQty) {
                // reassign the full ST across the ledger entries

                // remove from origin
                from_stIds[ndx] = from_stIds[from_stIds.length - 1];
                from_stIds.length--;
                //_ledger[from].tokenType_sumQty[a.tokenTypeId] -= stQty;            //* gas - DROP DONE - only used internally, validation params

                // assign to destination
                // while minting >1 ST is disallowed, the merge condition below can never be true:

                    // MERGE - if any existing destination ST is from same batch
                    // bool mergedExisting = false;
                    // for (uint i = 0; i < to_stIds.length; i++) {
                    //     if (_sts_batchId[to_stIds[i]] == batchId) {

                    //         // resize (grow) the destination ST
                    //         _sts_currentQty[to_stIds[i]] += stQty;                // TODO gas - pack/combine
                    //         _sts_mintedQty[to_stIds[i]] += stQty;                 // TODO gas - pack/combine

                    //         // retire the old ST from the main list
                    //         _sts_currentQty[stId] = 0;
                    //         _sts_mintedQty[stId] = 0;

                    //         mergedExisting = true;
                    //         emit TransferedFullSecToken(a.from, a.to, stId, to_stIds[i], stQty/*, a.tokenTypeId*/, isFee);
                    //         break;
                    //     }
                    // }
                    // TRANSFER - if no existing destination ST from same batch
                    //if (!mergedExisting) {
                        to_stIds.push(stId);
                        emit TransferedFullSecToken(a.from, a.to, stId, 0, /*a.tokenTypeId,*/ stQty, a.isFee);
                    //}

                //_ledger[to].tokenType_sumQty[tokenTypeId] += stQty;                //* gas - DROP DONE - only used internally, validation params

                remainingToTransfer -= stQty;
            }
            else {
                // split the last ST across the ledger entries, soft-minting a new ST in the destination
                // note: the parent (origin) ST's minted qty also gets split across the two ST;
                //         this is so the total minted in the system is unchanged,
                //         and also so the total burned amount in the ST can still be calculated by _sts_mintedQty[x] - _sts_currentQty[x]
                // note: both parent and child ST point to each other (double-linked list)

                // assign new ST to destination

                    // MERGE - if any existing destination ST is from same batch
                    bool mergedExisting = false;
                    for (uint i = 0; i < to_stIds.length; i++) {
                        if (_sts_batchId[to_stIds[i]] == _sts_batchId[stId]) {
                            // resize (grow) the destination ST
                            _sts_currentQty[to_stIds[i]] += remainingToTransfer;         // TODO gas - pack/combine
                            _sts_mintedQty[to_stIds[i]] += remainingToTransfer;          // TODO gas - pack/combine

                            mergedExisting = true;
                            emit TransferedPartialSecToken(a.from, a.to, stId, 0, to_stIds[i], /*a.tokenTypeId,*/ remainingToTransfer, a.isFee);
                            break;
                        }
                    }
                    // SOFT-MINT - if no existing destination ST from same batch
                    if (!mergedExisting) {
                        uint256 newId = _tokens_currentMax_id + 1;
                        _sts_batchId[newId] = _sts_batchId[stId];                        // inherit batch from parent ST  // TODO gas - pack/combine
                        _sts_currentQty[newId] = remainingToTransfer;                    // TODO gas - pack/combine
                        _sts_mintedQty[newId] = remainingToTransfer;                     // TODO gas - pack/combine
                        //_sts_mintedTimestamp[newId] = block.timestamp;                 // gas - DROP DONE - can fetch from events
                        //_sts_splitFrom_id[newId] = stId;                               // gas - DROP DONE - can fetch from events
                        to_stIds.push(newId);
                        _tokens_currentMax_id++;
                        //_ledger[to].tokenType_sumQty[tokenTypeId] += remainingToTransfer;    // gas - DROP DONE - only used internally, validation params

                        emit TransferedPartialSecToken(a.from, a.to, stId, newId, 0, /*a.tokenTypeId,*/ remainingToTransfer, a.isFee);
                    }

                // resize (shrink) the origin ST
                _sts_currentQty[stId] -= remainingToTransfer;                            // TODO gas - pack/combine
                _sts_mintedQty[stId] -= remainingToTransfer;                             // TODO gas - pack/combine
                //_sts_splitTo_id[stId] = newId;                                         // gas - DROP DONE - can index from events
                //_ledger[from].tokenType_sumQty[tokenTypeId] -= remainingToTransfer;    // gas - DROP DONE - only used internally, validation params

                remainingToTransfer = 0;
            }
        }
        _tokens_totalTransferedQty += a.qtyUnit;

        if (a.isFee) {
            _tokens_totalFeesPaidQty += a.qtyUnit;
        }
    }

    /**
     * @dev Returns the total global currency amount transfered for the supplied currency
     */
    function getCcy_totalTransfered(uint256 ccyTypeId) external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return _ccyType_totalTransfered[ccyTypeId];
    }

    /**
     * @dev Returns the total global tonnage of carbon transfered
     */
    function getSecToken_totalTransfered() external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return _tokens_totalTransferedQty;
    }
}
