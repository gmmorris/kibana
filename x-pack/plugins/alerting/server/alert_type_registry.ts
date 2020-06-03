/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';
import { RunContext, TaskManagerSetupContract } from '../../../plugins/task_manager/server';
import { TaskRunnerFactory } from './task_runner';
import { AlertType } from './types';

interface ConstructorOptions {
  taskManager: TaskManagerSetupContract;
  taskRunnerFactory: TaskRunnerFactory;
}

export interface RegistryAlertType
  extends Pick<
    AlertType,
    'name' | 'actionGroups' | 'defaultActionGroupId' | 'actionVariables' | 'producer'
  > {
  id: string;
}

export class AlertTypeRegistry {
  private readonly taskManager: TaskManagerSetupContract;
  private readonly alertTypes: Map<string, AlertType> = new Map();
  private readonly taskRunnerFactory: TaskRunnerFactory;

  constructor({ taskManager, taskRunnerFactory }: ConstructorOptions) {
    this.taskManager = taskManager;
    this.taskRunnerFactory = taskRunnerFactory;
  }

  public has(id: string) {
    return this.alertTypes.has(id);
  }

  public register(alertType: AlertType) {
    if (this.has(alertType.id)) {
      throw new Error(
        i18n.translate('xpack.alerting.alertTypeRegistry.register.duplicateAlertTypeError', {
          defaultMessage: 'Alert type "{id}" is already registered.',
          values: {
            id: alertType.id,
          },
        })
      );
    }
    alertType.actionVariables = normalizedActionVariables(alertType.actionVariables);
    this.alertTypes.set(alertType.id, { ...alertType });
    this.taskManager.registerTaskDefinitions({
      [`alerting:${alertType.id}`]: {
        title: alertType.name,
        type: `alerting:${alertType.id}`,
        createTaskRunner: (context: RunContext) =>
          this.taskRunnerFactory.create(alertType, context),
      },
    });
  }

  public get(id: string): AlertType {
    if (!this.has(id)) {
      throw Boom.badRequest(
        i18n.translate('xpack.alerting.alertTypeRegistry.get.missingAlertTypeError', {
          defaultMessage: 'Alert type "{id}" is not registered.',
          values: {
            id,
          },
        })
      );
    }
    return this.alertTypes.get(id)!;
  }

  public list(): Set<RegistryAlertType> {
    return new Set(
      Array.from(this.alertTypes).map(
        ([id, { name, actionGroups, defaultActionGroupId, actionVariables, producer }]: [
          string,
          AlertType
        ]) => ({
          id,
          name,
          actionGroups,
          defaultActionGroupId,
          actionVariables,
          producer,
        })
      )
    );
  }
}

function normalizedActionVariables(actionVariables: AlertType['actionVariables']) {
  return {
    context: actionVariables?.context ?? [],
    state: actionVariables?.state ?? [],
  };
}
