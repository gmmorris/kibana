/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConnectorConfiguration } from './types';

import * as i18n from './translations';
import logo from './logo.svg';

export const connector: ConnectorConfiguration = {
  id: '.resilient',
  name: i18n.RESILIENT_TITLE,
  logo,
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'platinum',
  fields: {
    name: {
      label: i18n.MAPPING_FIELD_NAME,
      validSourceFields: ['title', 'description'],
      defaultSourceField: 'title',
      defaultActionType: 'overwrite',
    },
    description: {
      label: i18n.MAPPING_FIELD_DESC,
      validSourceFields: ['title', 'description'],
      defaultSourceField: 'description',
      defaultActionType: 'overwrite',
    },
    comments: {
      label: i18n.MAPPING_FIELD_COMMENTS,
      validSourceFields: ['comments'],
      defaultSourceField: 'comments',
      defaultActionType: 'append',
    },
  },
};
