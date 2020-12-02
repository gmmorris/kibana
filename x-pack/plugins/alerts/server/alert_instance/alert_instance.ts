/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  AlertInstanceMeta,
  AlertInstanceState,
  RawAlertInstance,
  rawAlertInstance,
  AlertInstanceContext,
} from '../../common';

import { parseDuration } from '../lib';

interface ScheduledExecutionOptions<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string
> {
  actionGroup: ActionGroupIds;
  subgroup?: string;
  context: Context;
  state: State;
}

export type PublicAlertInstance<
  State extends AlertInstanceState = AlertInstanceState,
  Context extends AlertInstanceContext = AlertInstanceContext,
  ActionGroupIds extends string = string
> = Pick<
  AlertInstance<State, Context, ActionGroupIds>,
  'getState' | 'replaceState' | 'scheduleActions' | 'scheduleActionsWithSubGroup'
>;

export class AlertInstance<
  State extends AlertInstanceState = AlertInstanceState,
  Context extends AlertInstanceContext = AlertInstanceContext,
  ActionGroupIds extends string = string
> {
  private scheduledExecutionOptions?: ScheduledExecutionOptions<State, Context, ActionGroupIds>;
  private meta: AlertInstanceMeta;
  private state: State;

  constructor({ state, meta = {} }: RawAlertInstance = {}) {
    this.state = (state || {}) as State;
    this.meta = meta;
  }

  hasScheduledActions() {
    return this.scheduledExecutionOptions !== undefined;
  }

  isThrottled(throttle: string | null) {
    if (this.scheduledExecutionOptions === undefined) {
      return false;
    }
    const throttleMills = throttle ? parseDuration(throttle) : 0;
    if (
      this.meta.lastScheduledActions &&
      this.scheduledActionGroupIsUnchanged(
        this.meta.lastScheduledActions,
        this.scheduledExecutionOptions
      ) &&
      this.scheduledActionSubgroupIsUnchanged(
        this.meta.lastScheduledActions,
        this.scheduledExecutionOptions
      ) &&
      this.meta.lastScheduledActions.date.getTime() + throttleMills > Date.now()
    ) {
      return true;
    }
    return false;
  }

  private scheduledActionGroupIsUnchanged(
    lastScheduledActions: NonNullable<AlertInstanceMeta['lastScheduledActions']>,
    scheduledExecutionOptions: ScheduledExecutionOptions<State, Context, ActionGroupIds>
  ) {
    return lastScheduledActions.group === scheduledExecutionOptions.actionGroup;
  }

  private scheduledActionSubgroupIsUnchanged(
    lastScheduledActions: NonNullable<AlertInstanceMeta['lastScheduledActions']>,
    scheduledExecutionOptions: ScheduledExecutionOptions<State, Context, ActionGroupIds>
  ) {
    return lastScheduledActions.subgroup && scheduledExecutionOptions.subgroup
      ? lastScheduledActions.subgroup === scheduledExecutionOptions.subgroup
      : true;
  }

  getLastScheduledActions() {
    return this.meta.lastScheduledActions;
  }

  getScheduledActionOptions() {
    return this.scheduledExecutionOptions;
  }

  unscheduleActions() {
    this.scheduledExecutionOptions = undefined;
    return this;
  }

  getState() {
    return this.state;
  }

  scheduleActions(actionGroup: ActionGroupIds, context: Context = {} as Context) {
    this.ensureHasNoScheduledActions();
    this.scheduledExecutionOptions = {
      actionGroup,
      context,
      state: this.state,
    };
    return this;
  }

  scheduleActionsWithSubGroup(
    actionGroup: ActionGroupIds,
    subgroup: string,
    context: Context = {} as Context
  ) {
    this.ensureHasNoScheduledActions();
    this.scheduledExecutionOptions = {
      actionGroup,
      subgroup,
      context,
      state: this.state,
    };
    return this;
  }

  private ensureHasNoScheduledActions() {
    if (this.hasScheduledActions()) {
      throw new Error('Alert instance execution has already been scheduled, cannot schedule twice');
    }
  }

  replaceState(state: State) {
    this.state = state;
    return this;
  }

  updateLastScheduledActions(group: string, subgroup?: string) {
    this.meta.lastScheduledActions = { group, subgroup, date: new Date() };
  }

  /**
   * Used to serialize alert instance state
   */
  toJSON() {
    return rawAlertInstance.encode(this.toRaw());
  }

  toRaw(): RawAlertInstance {
    return {
      state: this.state,
      meta: this.meta,
    };
  }
}
