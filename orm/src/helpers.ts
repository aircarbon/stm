import { isBN, isBigNumber } from 'web3-utils';

// NOTE: It should have both number key and field name in the array
export function isWeb3ReturnData(values: Record<string, any> | Array<Record<string | number, any>> | null): boolean {
  if (Array.isArray(values)) {
    let hasKeyNumber = false;
    let hasFieldName = false;
    Object.entries(values).forEach(([key]) => {
      if (Number.isNaN(Number(key))) {
        hasFieldName = true;
      }
      if (!Number.isNaN(Number(key))) {
        hasKeyNumber = true;
      }
    });
    return hasFieldName && hasKeyNumber;
  }

  const keys = Object.keys(values || {});
  return keys.length > 0 && Number.isInteger(Number(keys[0])) && keys.length % 2 === 0;
}

/**
 * Is that single array with same data type
 * @param values
 */
export function isSameArrayDataType(values: Array<any>) {
  if (Array.isArray(values)) {
    // just for the case empty array
    if (values.length === 0) return true;

    const dataType = typeof values[0];

    if (!['string', 'number'].includes(dataType)) return false;

    return !values.some((item) => typeof item !== dataType);
  }

  return false;
}

/**
 * Decode web3 return data and keep the same field name as smart contract
 * @param values
 */
export function decodeWeb3Object(values: any): any {
  // skip decode for those cases: string, number, array<string|number>
  if (
    !values || // null, undefined
    ['string', 'number'].includes(typeof values) || // number or string
    isBN(values) || // big number
    isBigNumber(values) || // big number
    (Array.isArray(values) && isSameArrayDataType(values)) // Array[string | number]
  )
    return values;

  if (Array.isArray(values)) {
    const result: Record<string, any> = {};

    const entries = Object.entries(values);
    if (entries.length === 1 && values[0]) {
      // NOTE: process edge case if return array with number
      return decodeWeb3Object(values[0]);
    }

    entries.forEach(([key, value]) => {
      if (Number.isNaN(Number(key))) {
        if (Array.isArray(value)) {
          // same singular data type
          if (isSameArrayDataType(value)) {
            result[key] = Array.from(value);
          } else {
            let items: any;
            Object.entries(value).forEach(([childKey, childVal]) => {
              if (isWeb3ReturnData(childVal)) {
                if (!items) {
                  items = [];
                }
                items.push(decodeWeb3Object(childVal));
              } else if (Number.isNaN(Number(childKey))) {
                if (!items) items = {};
                items[childKey] = childVal;
              }
            });
            result[key] = items;
          }
        } else {
          result[key] = value;
        }
      }
    });

    return result;
  }

  const result: Record<string, any> = {};

  Object.keys(values || {}).forEach((field) => {
    if (Number.isNaN(Number(field))) result[field] = decodeWeb3Object(values[field]);
  });
  return result;
}

export default {
  decodeWeb3Object,
  isSameArrayDataType,
  isWeb3ReturnData,
};
