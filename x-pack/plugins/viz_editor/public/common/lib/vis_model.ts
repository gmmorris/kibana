/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatasourceField, Query, SelectOperation } from '../../../common';

export interface Datasource<M = any> {
  id: string;
  title: string;
  timeFieldName?: string;
  fields: DatasourceField[];
  fieldFormatMap?: string;
  meta?: M;
}

export interface VisModelQuery {
  datasourceRef: string;
  select: {
    [id: string]: SelectOperation;
  };
}

export interface Axis {
  title: string;
  columns: string[];
}

/**
 * The complete state of the editor.
 * The basic properties which are shared over all editor plugins
 * are defined here, anything else is in the private property and scoped by plugin
 */
export interface VisModel<K extends string = any, T = any> {
  datasource: Datasource | null;
  queries: { [id: string]: Query };
  datasourcePlugin: string;
  editorPlugin: string;
  title: string;
  private: { [key in K]: T };
}

// This type should be used if it is not known which private states exist on a VisModel
export type UnknownVisModel = VisModel<string, unknown>;

// TODO: the way the "id" works is too hacky. Need to modify this, probably should
// use a dispatch mechanism, too, to avoid deep knowledge of VisModel everywhere...
export function selectColumn(id: string, model: VisModel) {
  const [queryId, columnIndex] = id.split('_');
  const query = model.queries[queryId];

  return query ? query.select[parseInt(columnIndex, 10)] : undefined;
}

export function updateColumn(id: string, col: SelectOperation, model: VisModel) {
  const [queryId, columnIndex] = id.split('_');
  const query = model.queries[queryId];
  const index = parseInt(columnIndex, 10);

  return {
    ...model,
    queries: {
      ...model.queries,
      [queryId]: {
        ...query,
        select: query.select.map((s, i) => (i === index ? col : s)),
      },
    },
  };
}

export function updatePrivateState<K extends string, T>(name: K) {
  return (visModel: VisModel, privateStateUpdate: Partial<T>) => {
    return {
      ...visModel,
      private: {
        ...visModel.private,
        [name]: { ...visModel.private[name], ...privateStateUpdate },
      },
    } as VisModel<K, T>;
  };
}

export function getColumnIdByIndex(
  queries: {
    [id: string]: Query;
  },
  queryIndex: number,
  columnIndex: number
): string | undefined {
  const queryId = Object.keys(queries).sort()[queryIndex];
  if (queryId) {
    return `${queryId}_${columnIndex}`;
  }
}

// Generate our dummy-data
export function initialState(): VisModel<any, any> {
  return {
    datasource: null,
    queries: {},
    editorPlugin: 'xy_chart',
    datasourcePlugin: 'index_pattern',
    title: '',
    private: {},
  };
}
