/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { isNumber } from 'lodash';
import { either } from 'fp-ts/lib/Either';

// represents a Date from an ISO string
export const DateFromString = new t.Type<Date, string, unknown>(
  'DateFromString',
  // detect the type
  (value): value is Date => value instanceof Date,
  (valueToDecode, context) =>
    either.chain(
      // validate this is a string
      t.string.validate(valueToDecode, context),
      // decode
      value => {
        const decoded = new Date(value);
        return isNaN(decoded.getTime()) ? t.failure(valueToDecode, context) : t.success(decoded);
      }
    ),
  valueToEncode => valueToEncode.toISOString()
);

export const PositiveNumberFromString = new t.Type<number, string, unknown>(
  'PositiveNumberFromString',
  // detect the type
  (value): value is number => isNumber(value),
  (valueToDecode, context) =>
    either.chain(
      // validate this is a string
      t.string.validate(valueToDecode, context),
      // decode
      value => {
        const decoded = parseInt(value, 10);
        return isNaN(decoded) || decoded < 0
          ? t.failure(valueToDecode, context)
          : t.success(decoded);
      }
    ),
  valueToEncode => `${valueToEncode}`
);
