/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { range, random } from 'lodash';
import { AlertType } from '../../../../plugins/alerts/server';
import {
  DEFAULT_INSTANCES_TO_GENERATE,
  ALERTING_EXAMPLE_APP_ID,
  AlwaysFiringParams,
} from '../../common/constants';

const ACTION_GROUPS = [
  { id: 'small', name: 'Small t-shirt' },
  { id: 'medium', name: 'Medium t-shirt' },
  { id: 'large', name: 'Large t-shirt' },
];
const DEFAULT_ACTION_GROUP = 'small';

function getTShirtSizeByIdAndThreshold(id: string, thresholds: AlwaysFiringParams['thresholds']) {
  const idAsNumber = parseInt(id, 10);
  if (!isNaN(idAsNumber)) {
    if (thresholds?.large && thresholds.large < idAsNumber) {
      return 'large';
    }
    if (thresholds?.medium && thresholds.medium < idAsNumber) {
      return 'medium';
    }
    if (thresholds?.small && thresholds.small < idAsNumber) {
      return 'small';
    }
  }
  return DEFAULT_ACTION_GROUP;
}

export const alertType: AlertType<AlwaysFiringParams> = {
  id: 'example.always-firing',
  name: 'Always firing',
  actionGroups: ACTION_GROUPS,
  defaultActionGroupId: DEFAULT_ACTION_GROUP,
  async executor({
    services,
    params: { instances = DEFAULT_INSTANCES_TO_GENERATE, thresholds },
    state,
  }) {
    const count = (state.count ?? 0) + 1;

    range(instances)
      .map(() => uuid.v4())
      .forEach((id: string) => {
        services
          .alertInstanceFactory(id)
          .replaceState({ triggerdOnCycle: count })
          .scheduleActions(getTShirtSizeByIdAndThreshold(id, thresholds));
      });

    return {
      count,
    };
  },
  producer: ALERTING_EXAMPLE_APP_ID,
};
