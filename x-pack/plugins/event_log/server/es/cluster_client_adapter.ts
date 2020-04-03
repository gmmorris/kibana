/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reject, isUndefined } from 'lodash';
import { Logger, ClusterClient } from '../../../../../src/core/server';
import { IEvent } from '../types';
import { FindOptionsType } from '../event_log_client';

export type EsClusterClient = Pick<ClusterClient, 'callAsInternalUser' | 'asScoped'>;
export type IClusterClientAdapter = PublicMethodsOf<ClusterClientAdapter>;

export interface ConstructorOpts {
  logger: Logger;
  clusterClient: EsClusterClient;
}

export interface QueryEventsBySavedObjectResult {
  page: number;
  per_page: number;
  total: number;
  data: IEvent[];
}

export class ClusterClientAdapter {
  private readonly logger: Logger;
  private readonly clusterClient: EsClusterClient;

  constructor(opts: ConstructorOpts) {
    this.logger = opts.logger;
    this.clusterClient = opts.clusterClient;
  }

  public async indexDocument(doc: any): Promise<void> {
    await this.callEs('index', doc);
  }

  public async doesIlmPolicyExist(policyName: string): Promise<boolean> {
    const request = {
      method: 'GET',
      path: `_ilm/policy/${policyName}`,
    };
    try {
      await this.callEs('transport.request', request);
    } catch (err) {
      if (err.statusCode === 404) return false;
      throw new Error(`error checking existance of ilm policy: ${err.message}`);
    }
    return true;
  }

  public async createIlmPolicy(policyName: string, policy: any): Promise<void> {
    const request = {
      method: 'PUT',
      path: `_ilm/policy/${policyName}`,
      body: policy,
    };
    try {
      await this.callEs('transport.request', request);
    } catch (err) {
      throw new Error(`error creating ilm policy: ${err.message}`);
    }
  }

  public async doesIndexTemplateExist(name: string): Promise<boolean> {
    let result;
    try {
      result = await this.callEs('indices.existsTemplate', { name });
    } catch (err) {
      throw new Error(`error checking existance of index template: ${err.message}`);
    }
    return result as boolean;
  }

  public async createIndexTemplate(name: string, template: any): Promise<void> {
    const addTemplateParams = {
      name,
      create: true,
      body: template,
    };
    try {
      await this.callEs('indices.putTemplate', addTemplateParams);
    } catch (err) {
      // The error message doesn't have a type attribute we can look to guarantee it's due
      // to the template already existing (only long message) so we'll check ourselves to see
      // if the template now exists. This scenario would happen if you startup multiple Kibana
      // instances at the same time.
      const existsNow = await this.doesIndexTemplateExist(name);
      if (!existsNow) {
        throw new Error(`error creating index template: ${err.message}`);
      }
    }
  }

  public async doesAliasExist(name: string): Promise<boolean> {
    let result;
    try {
      result = await this.callEs('indices.existsAlias', { name });
    } catch (err) {
      throw new Error(`error checking existance of initial index: ${err.message}`);
    }
    return result as boolean;
  }

  public async createIndex(name: string, body: any = {}): Promise<void> {
    try {
      await this.callEs('indices.create', {
        index: name,
        body,
      });
    } catch (err) {
      if (err.body?.error?.type !== 'resource_already_exists_exception') {
        throw new Error(`error creating initial index: ${err.message}`);
      }
    }
  }

  public async queryEventsBySavedObject(
    index: string,
    type: string,
    id: string,
    { page, per_page: perPage, start, end, sort_field, sort_order }: FindOptionsType
  ): Promise<QueryEventsBySavedObjectResult> {
    try {
      const {
        hits: {
          hits,
          total: { value: total },
        },
      } = await this.callEs('search', {
        index,
        body: {
          size: perPage,
          from: (page - 1) * perPage,
          sort: { [sort_field]: { order: sort_order } },
          query: {
            bool: {
              must: reject(
                [
                  { term: { 'kibana.saved_objects.type.keyword': type } },
                  {
                    term: {
                      'kibana.saved_objects.id.keyword': id,
                    },
                  },
                  start && {
                    range: {
                      'event.start': {
                        gte: start,
                      },
                    },
                  },
                  end && {
                    range: {
                      'event.end': {
                        lte: end,
                      },
                    },
                  },
                ],
                isUndefined
              ),
            },
          },
        },
      });
      return {
        page,
        per_page: perPage,
        total,
        data: hits.map((hit: any) => hit._source) as IEvent[],
      };
    } catch (err) {
      throw new Error(
        `querying for Event Log by for type "${type}" and id "${id}" failed with: ${err.message}`
      );
    }
  }

  private async callEs(operation: string, body?: any): Promise<any> {
    try {
      this.debug(`callEs(${operation}) calls:`, body);
      const result = await this.clusterClient.callAsInternalUser(operation, body);
      this.debug(`callEs(${operation}) result:`, result);
      return result;
    } catch (err) {
      this.debug(`callEs(${operation}) error:`, {
        message: err.message,
        statusCode: err.statusCode,
      });
      throw err;
    }
  }

  private debug(message: string, object?: any) {
    const objectString = object == null ? '' : JSON.stringify(object);
    this.logger.debug(`esContext: ${message} ${objectString}`);
  }
}
