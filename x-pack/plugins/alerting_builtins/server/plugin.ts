/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, Logger, CoreSetup, CoreStart, PluginInitializerContext } from 'src/core/server';

import { Service, IService, AlertingBuiltinsDeps } from './types';
import { getService as getServiceIndexThreshold } from './alert_types/index_threshold';
import { registerBuiltInAlertTypes } from './alert_types';
import { ID as IndexThresholdId } from './alert_types/index_threshold/alert_type';

export class AlertingBuiltinsPlugin implements Plugin<IService, IService> {
  private readonly logger: Logger;
  private readonly service: Service;

  constructor(ctx: PluginInitializerContext) {
    this.logger = ctx.logger.get();
    this.service = {
      indexThreshold: getServiceIndexThreshold(),
      logger: this.logger,
    };
  }

  public async setup(
    core: CoreSetup,
    { alerts, features }: AlertingBuiltinsDeps
  ): Promise<IService> {
    features.registerFeature({
      id: 'alerts',
      name: 'alerts',
      app: [],
      privileges: {
        all: {
          alerting: {
            globally: {
              all: [IndexThresholdId],
            },
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          alerting: {
            globally: {
              all: [IndexThresholdId],
            },
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });

    registerBuiltInAlertTypes({
      service: this.service,
      router: core.http.createRouter(),
      alerts,
      baseRoute: '/api/alerting_builtins',
    });
    return this.service;
  }

  public async start(core: CoreStart): Promise<IService> {
    return this.service;
  }

  public async stop(): Promise<void> {}
}
