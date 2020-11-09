/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AlertType, AlertExecutorOptions } from '../../types';
import { Params, ParamsSchema } from './alert_type_params';
import { ActionContext, BaseActionContext, addMessages } from './action_context';
import { TimeSeriesQuery } from './lib/time_series_query';
import { Service } from '../../types';
import { STACK_ALERTS_FEATURE_ID } from '../../../common';

export const ID = '.index-threshold';

import { CoreQueryParamsSchemaProperties } from './lib/core_query_types';
const ActionGroupId = 'threshold met';
const ComparatorFns = getComparatorFns();
export const ComparatorFnNames = new Set(ComparatorFns.keys());

export function getAlertType(service: Service): AlertType<Params, {}, {}, ActionContext> {
  const { logger } = service;

  const alertTypeName = i18n.translate('xpack.stackAlerts.indexThreshold.alertTypeTitle', {
    defaultMessage: 'Index threshold',
  });

  const actionGroupName = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionGroupThresholdMetTitle',
    {
      defaultMessage: 'Threshold Met',
    }
  );

  const actionVariableContextGroupLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextGroupLabel',
    {
      defaultMessage: 'The group that exceeded the threshold.',
    }
  );

  const actionVariableContextDateLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextDateLabel',
    {
      defaultMessage: 'The date the alert exceeded the threshold.',
    }
  );

  const actionVariableContextValueLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextValueLabel',
    {
      defaultMessage: 'The value that exceeded the threshold.',
    }
  );

  const actionVariableContextMessageLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextMessageLabel',
    {
      defaultMessage: 'A pre-constructed message for the alert.',
    }
  );

  const actionVariableContextTitleLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextTitleLabel',
    {
      defaultMessage: 'A pre-constructed title for the alert.',
    }
  );

  const actionVariableContextThresholdLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextThresholdLabel',
    {
      defaultMessage:
        "An array of values to use as the threshold; 'between' and 'notBetween' require two values, the others require one.",
    }
  );

  const actionVariableContextThresholdComparatorLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextThresholdComparatorLabel',
    {
      defaultMessage: 'A comparison function to use to determine if the threshold as been met.',
    }
  );

  const actionVariableContextFunctionLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextFunctionLabel',
    {
      defaultMessage: 'A string describing the threshold comparator and threshold',
    }
  );

  const alertParamsVariables = Object.keys(CoreQueryParamsSchemaProperties).map(
    (propKey: string) => {
      return {
        name: propKey,
        description: propKey,
      };
    }
  );

  return {
    id: ID,
    name: alertTypeName,
    actionGroups: [{ id: ActionGroupId, name: actionGroupName }],
    defaultActionGroupId: ActionGroupId,
    validate: {
      params: ParamsSchema,
    },
    actionVariables: {
      context: [
        { name: 'message', description: actionVariableContextMessageLabel },
        { name: 'title', description: actionVariableContextTitleLabel },
        { name: 'group', description: actionVariableContextGroupLabel },
        { name: 'date', description: actionVariableContextDateLabel },
        { name: 'value', description: actionVariableContextValueLabel },
        { name: 'function', description: actionVariableContextFunctionLabel },
      ],
      params: [
        { name: 'threshold', description: actionVariableContextThresholdLabel },
        { name: 'thresholdComparator', description: actionVariableContextThresholdComparatorLabel },
        ...alertParamsVariables,
      ],
    },
    executor,
    producer: STACK_ALERTS_FEATURE_ID,
  };

  async function executor(options: AlertExecutorOptions<Params, {}, {}, ActionContext>) {
    const { alertId, name, services, params } = options;

    const compareFn = ComparatorFns.get(params.thresholdComparator);
    if (compareFn == null) {
      throw new Error(getInvalidComparatorMessage(params.thresholdComparator));
    }

    const callCluster = services.callCluster;
    const date = new Date().toISOString();
    // the undefined values below are for config-schema optional types
    const queryParams: TimeSeriesQuery = {
      index: params.index,
      timeField: params.timeField,
      aggType: params.aggType,
      aggField: params.aggField,
      groupBy: params.groupBy,
      termField: params.termField,
      termSize: params.termSize,
      dateStart: date,
      dateEnd: date,
      timeWindowSize: params.timeWindowSize,
      timeWindowUnit: params.timeWindowUnit,
      interval: undefined,
    };
    // console.log(`index_threshold: query: ${JSON.stringify(queryParams, null, 4)}`);
    const result = await service.indexThreshold.timeSeriesQuery({
      logger,
      callCluster,
      query: queryParams,
    });
    logger.debug(`alert ${ID}:${alertId} "${name}" query result: ${JSON.stringify(result)}`);

    const groupResults = result.results || [];
    // console.log(`index_threshold: response: ${JSON.stringify(groupResults, null, 4)}`);
    for (const groupResult of groupResults) {
      const instanceId = groupResult.group;
      const value = groupResult.metrics[0][1];
      const met = compareFn(value, params.threshold);

      if (!met) continue;

      const agg = params.aggField ? `${params.aggType}(${params.aggField})` : `${params.aggType}`;
      const humanFn = `${agg} ${params.thresholdComparator} ${params.threshold.join(',')}`;

      const baseContext: BaseActionContext = {
        date,
        group: instanceId,
        value,
        function: humanFn,
      };
      const actionContext = addMessages(options, baseContext, params);
      const alertInstance = options.services.alertInstanceFactory(instanceId);
      alertInstance.scheduleActions(ActionGroupId, actionContext);
      logger.debug(`scheduled actionGroup: ${JSON.stringify(actionContext)}`);
    }
  }
}

export function getInvalidComparatorMessage(comparator: string) {
  return i18n.translate('xpack.stackAlerts.indexThreshold.invalidComparatorErrorMessage', {
    defaultMessage: 'invalid thresholdComparator specified: {comparator}',
    values: {
      comparator,
    },
  });
}

type ComparatorFn = (value: number, threshold: number[]) => boolean;

function getComparatorFns(): Map<string, ComparatorFn> {
  const fns: Record<string, ComparatorFn> = {
    '<': (value: number, threshold: number[]) => value < threshold[0],
    '<=': (value: number, threshold: number[]) => value <= threshold[0],
    '>=': (value: number, threshold: number[]) => value >= threshold[0],
    '>': (value: number, threshold: number[]) => value > threshold[0],
    between: (value: number, threshold: number[]) => value >= threshold[0] && value <= threshold[1],
    notBetween: (value: number, threshold: number[]) =>
      value < threshold[0] || value > threshold[1],
  };

  const result = new Map<string, ComparatorFn>();
  for (const key of Object.keys(fns)) {
    result.set(key, fns[key]);
  }

  return result;
}
