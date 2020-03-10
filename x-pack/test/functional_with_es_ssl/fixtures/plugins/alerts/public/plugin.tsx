/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/public';
import { PluginSetupContract as AlertingSetup } from '../../../../../../plugins/alerting/public';
import { AlertType, SanitizedAlert } from '../../../../../../plugins/alerting/common';

export type Setup = void;
export type Start = void;

export interface AlertingExamplePublicSetupDeps {
  alerting: AlertingSetup;
}

export class AlertingFixturePlugin implements Plugin<Setup, Start, AlertingExamplePublicSetupDeps> {
  public setup(core: CoreSetup, { alerting }: AlertingExamplePublicSetupDeps) {
    alerting.registerNavigation(
      'consumer.noop',
      'test.noop',
      (alert: SanitizedAlert, alertType: AlertType) => `/alert/${alert.id}`
    );
  }

  public start() {}
  public stop() {}
}
