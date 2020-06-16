/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AlertType } from '../common/alert_types';

export const APM_FEATURE = {
  id: 'apm',
  name: i18n.translate('xpack.apm.featureRegistry.apmFeatureName', {
    defaultMessage: 'APM',
  }),
  order: 900,
  icon: 'apmApp',
  navLinkId: 'apm',
  app: ['apm', 'kibana'],
  catalogue: ['apm'],
  // see x-pack/plugins/features/common/feature_kibana_privileges.ts
  privileges: {
    all: {
      app: ['apm', 'kibana'],
      api: ['apm', 'apm_write', 'actions-read', 'actions-all'],
      catalogue: ['apm'],
      savedObject: {
        all: ['action', 'action_task_params'],
        read: [],
      },
      alerting: {
        all: Object.values(AlertType),
      },
      ui: [
        'show',
        'save',
        'alerting:show',
        'actions:show',
        'alerting:save',
        'actions:save',
        'alerting:delete',
        'actions:delete',
      ],
    },
    read: {
      app: ['apm', 'kibana'],
      api: ['apm', 'actions-read', 'actions-all'],
      catalogue: ['apm'],
      savedObject: {
        all: ['action', 'action_task_params'],
        read: [],
      },
      alerting: {
        all: Object.values(AlertType),
      },
      ui: [
        'show',
        'alerting:show',
        'actions:show',
        'alerting:save',
        'actions:save',
        'alerting:delete',
        'actions:delete',
      ],
    },
  },
};
