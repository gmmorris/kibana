/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import {
  MonitorDetailsState,
  getMonitorDetailsAction,
  getMonitorLocationsAction,
  getMonitorDetailsActionSuccess,
  getMonitorDetailsActionFail,
  getMonitorLocationsActionSuccess,
  getMonitorLocationsActionFail,
} from '../actions/monitor';
import { MonitorLocations } from '../../../common/runtime_types';

type MonitorLocationsList = Map<string, MonitorLocations>;

export interface MonitorState {
  loading: boolean;
  errors: any[];
  monitorDetailsList: MonitorDetailsState[];
  monitorLocationsList: MonitorLocationsList;
}

const initialState: MonitorState = {
  monitorDetailsList: [],
  monitorLocationsList: new Map(),
  loading: false,
  errors: [],
};

export function monitorReducer(state = initialState, action: Action<any>): MonitorState {
  switch (action.type) {
    case String(getMonitorDetailsAction):
      return {
        ...state,
        loading: true,
      };
    case String(getMonitorDetailsActionSuccess):
      const { monitorId } = action.payload;
      return {
        ...state,
        monitorDetailsList: {
          ...state.monitorDetailsList,
          [monitorId]: action.payload,
        },
        loading: false,
      };
    case String(getMonitorDetailsActionFail):
      return {
        ...state,
        errors: [...state.errors, action.payload],
      };
    case String(getMonitorLocationsAction):
      return {
        ...state,
        loading: true,
      };
    case String(getMonitorLocationsActionSuccess):
      const monLocations = state.monitorLocationsList;
      monLocations.set(action.payload.monitorId, action.payload);
      return {
        ...state,
        monitorLocationsList: monLocations,
        loading: false,
      };
    case String(getMonitorLocationsActionFail):
      return {
        ...state,
        errors: [...state.errors, action.payload],
      };
    default:
      return state;
  }
}
