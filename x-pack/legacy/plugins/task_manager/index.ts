/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { ConfigSchema } from './config';
import { Plugin, PluginSetupContract } from './plugin';
import { SavedObjectsSerializer, SavedObjectsSchema } from '../../../../src/core/server';
import mappings from './mappings.json';
import { migrations } from './migrations';

export { PluginSetupContract as TaskManager };
export {
  TaskInstance,
  ConcreteTaskInstance,
  TaskRunCreatorFunction,
  TaskStatus,
  RunContext,
} from './task';

export function taskManager(kibana: any) {
  return new kibana.Plugin({
    id: 'task_manager',
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    configPrefix: 'xpack.task_manager',
    config() {
      // Using internal getSchema as a small step
      // towards migration to New Platform, at which point
      // we'll be able to use ConfigSchema directly
      // @ts-ignore
      return ConfigSchema.getSchema();
    },
    init(server: Legacy.Server) {
      const plugin = new Plugin({
        logger: {
          get: () => ({
            info: (message: string) => server.log(['info', 'task_manager'], message),
            debug: (message: string) => server.log(['debug', 'task_manager'], message),
            warn: (message: string) => server.log(['warn', 'task_manager'], message),
            error: (message: string) => server.log(['error', 'task_manager'], message),
          }),
        },
      });
      const schema = new SavedObjectsSchema(this.kbnServer.uiExports.savedObjectSchemas);
      const serializer = new SavedObjectsSerializer(schema);
      const setupContract = plugin.setup(
        {},
        {
          serializer,
          config: server.config(),
          elasticsearch: server.plugins.elasticsearch,
          savedObjects: server.savedObjects,
        }
      );
      this.kbnServer.afterPluginsInit(() => {
        (async () => {
          // The code block below can't await directly within "afterPluginsInit"
          // callback due to circular dependency. The server isn't "ready" until
          // this code block finishes. Migrations wait for server to be ready before
          // executing. Saved objects repository waits for migrations to finish before
          // finishing the request. To avoid this, we'll await within a separate
          // function block.
          await this.kbnServer.server.kibanaMigrator.runMigrations();
          plugin.start();
        })();
      });
      server.expose(setupContract);
    },
    uiExports: {
      mappings,
      migrations,
      savedObjectSchemas: {
        task: {
          hidden: true,
          isNamespaceAgnostic: true,
          convertToAliasScript: `ctx._id = ctx._source.type + ':' + ctx._id`,
          indexPattern(config: any) {
            return config.get('xpack.task_manager.index');
          },
        },
      },
    },
  });
}
