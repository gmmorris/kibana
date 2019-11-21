/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const ConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  // The maximum number of times a task will be attempted before being abandoned as failed
  max_attempts: schema.number({ min: 1, defaultValue: 3 }),
  // How often, in milliseconds, the task manager will look for more work.
  poll_interval: schema.number({ min: 1000, defaultValue: 3000 }),
  // The name of the index used to store task information.
  index: schema.string({ defaultValue: '.kibana_task_manager' }),
  // The maximum number of tasks that this Kibana instance will run simultaneously.
  max_workers: schema.number({
    // encourage users to disable the task manager rather than trying to specify it with 0 workers
    min: 1,
    defaultValue: 10,
  }),
});
