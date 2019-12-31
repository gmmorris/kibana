/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { TaskManagerPlugin } from './plugin';
import { configSchema } from './config';

export const plugin = (initContext: PluginInitializerContext) => new TaskManagerPlugin(initContext);

export {
  TaskManagerPlugin,
  TaskManagerPluginSetupContract,
  TaskManagerPluginStartContract,
} from './plugin';
export { TaskManagerConfig } from './config';

export const config = {
  schema: configSchema,
};
