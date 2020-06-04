/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, uniq } from 'lodash';
import { Feature, FeatureKibanaPrivileges } from '../../../../../features/server';
import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

const readOperations: string[] = ['get', 'getAlertState', 'find'];
const writeOperations: string[] = [
  'create',
  'delete',
  'update',
  'updateApiKey',
  'enable',
  'disable',
  'muteAll',
  'unmuteAll',
  'muteInstance',
  'unmuteInstance',
];
const allOperations: string[] = [...readOperations, ...writeOperations];

export class FeaturePrivilegeAlertingBuilder extends BaseFeaturePrivilegeBuilder {
  public getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: Feature): string[] {
    const allOperationsWithinConsumer = (privileges: string[], consumer?: string) =>
      flatten(
        privileges.map((type) => [
          ...allOperations.map((operation) => this.actions.alerting.get(type, consumer, operation)),
        ])
      );
    const readOperationsWithinConsumer = (privileges: string[], consumer?: string) =>
      flatten(
        privileges.map((type) => [
          ...readOperations.map((operation) =>
            this.actions.alerting.get(type, consumer, operation)
          ),
        ])
      );

    return uniq([
      ...allOperationsWithinConsumer(privilegeDefinition.alerting?.all ?? [], feature.id),
      ...readOperationsWithinConsumer(privilegeDefinition.alerting?.read ?? [], feature.id),
      ...allOperationsWithinConsumer(privilegeDefinition.alerting?.globally?.all ?? []),
      ...readOperationsWithinConsumer(privilegeDefinition.alerting?.globally?.read ?? []),
    ]);
  }
}
