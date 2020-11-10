/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { clog } from './clog';
import { font } from './font';
import { variableSet } from './var_set';
import { variable } from './var';
import { AnyExpressionFunctionDefinition } from '../types';
import { theme } from './theme';
import { cumulativeSum } from './cumulative_sum';
import { derivative } from './derivative';
import { movingAverage } from './moving_average';

export const functionSpecs: AnyExpressionFunctionDefinition[] = [
  clog,
  font,
  variableSet,
  variable,
  theme,
  cumulativeSum,
  derivative,
  movingAverage,
];

export * from './clog';
export * from './font';
export * from './var_set';
export * from './var';
export * from './theme';
export * from './cumulative_sum';
export * from './derivative';
export * from './moving_average';
