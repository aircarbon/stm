import { BN } from 'ethereumjs-util';
import { fromWei, toBN, Hex, toWei } from 'web3-utils';

/**
 *
 * @param value
 * @param decimals
 */
export function convertUnit(value: { _hex: Hex } | number | undefined, decimals = 0): number {
  let inputValue = 0;
  if (typeof value === 'number') {
    inputValue = value;
  } else {
    inputValue = Number(toBN(value?._hex ?? 0).toString());
  }

  return Number(inputValue / 10 ** decimals);
}

/**
 *
 * @param value
 */
export function hex2int(value: { _hex: Hex }): number {
  return convertUnit(value);
}

/**
 *
 * @param val
 */
export function centsToUsd(val: number): number {
  return Number(val / 100);
}

/**
 *
 * @param cents
 */
export function hex2usd(cents: { _hex: Hex }): number {
  return !cents?._hex ? 0 : centsToUsd(Number(toBN(cents._hex).toString()));
}

/**
 *
 * @param wei
 */
export function hex2eth(wei: { _hex: Hex }): number | string {
  return !wei?._hex ? 0 : fromWei(toBN(wei._hex), 'ether');
}

/**
 *
 * @param val
 */
export function usdToCents(val: number): number {
  return Number(val * 100);
}

/**
 *
 * @param val
 */
export function ethToWei(val: number): BN {
  // @ts-ignore Property 'modrn' is missing in type 'import("/stm/node_modules/@types/bn.js/index")' but required in type 'import("/stm/node_modules/ethereumjs-util/node_modules/@types/bn.js/index")'.ts(2741)
  return toWei(toBN(val * 10 ** 18), 'wei');
}

/**
 *
 * @param s
 * @param n
 */
export function truncateMiddle(s: string, n = 16): string {
  return s?.length > n && s?.length > 0
    ? `${s.substr(0, s.length / 2 - (s.length - n) / 2)}…${s.substr(s.length / 2 + (s.length - n) / 2)}`
    : s;
}

/**
 *
 * @param number
 * @param blockTime
 */
export function dateFromBlocks(number: number, blockTime = 15): string {
  return `${Math.floor((number * blockTime) / 60 / 60 / 24)} days`;
}

export default {
  hex2eth,
  hex2int,
  hex2usd,
  centsToUsd,
  usdToCents,
  ethToWei,
  convertUnit,
  truncateMiddle,
  dateFromBlocks,
};
