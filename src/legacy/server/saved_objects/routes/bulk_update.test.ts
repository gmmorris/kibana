/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Hapi from 'hapi';
import { createMockServer } from './_mock_server';
import { createBulkUpdateRoute } from './bulk_update';

describe('PUT /api/saved_objects/_bulk_update', () => {
  let server: Hapi.Server;
  const savedObjectsClient = {
    errors: {} as any,
    bulkCreate: jest.fn(),
    bulkGet: jest.fn(),
    bulkUpdate: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    savedObjectsClient.update.mockImplementation(() => Promise.resolve(''));
    server = createMockServer();

    const prereqs = {
      getSavedObjectsClient: {
        assign: 'savedObjectsClient',
        method() {
          return savedObjectsClient;
        },
      },
    };

    server.route(createBulkUpdateRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.update.mockReset();
  });

  it('formats successful response', async () => {
    const request = {
      method: 'PUT',
      url: '/api/saved_objects/_bulk_update',
      payload: [
        {
          type: 'visualization',
          id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
          attributes: {
            title: 'An existing visualization',
          },
        },
        {
          type: 'dashboard',
          id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
          attributes: {
            title: 'An existing dashboard',
          },
        },
      ],
    };

    const time = Date.now();
    const clientResponse = [
      {
        type: 'visualization',
        id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
        updated_at: time,
        version: 'version',
        attributes: {
          title: 'An existing visualization',
        },
      },
      {
        type: 'dashboard',
        id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
        updated_at: time,
        version: 'version',
        attributes: {
          title: 'An existing dashboard',
        },
      },
    ];

    savedObjectsClient.bulkUpdate.mockImplementation(() => Promise.resolve(clientResponse));

    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).toBe(200);
    expect(response).toEqual(clientResponse);
  });

  it('calls upon savedObjectClient.update', async () => {
    const request = {
      method: 'PUT',
      url: '/api/saved_objects/_bulk_update',
      payload: [
        {
          type: 'visualization',
          id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
          attributes: {
            title: 'An existing visualization',
          },
        },
        {
          type: 'dashboard',
          id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
          attributes: {
            title: 'An existing dashboard',
          },
        },
      ],
    };

    await server.inject(request);

    expect(savedObjectsClient.bulkUpdate).toHaveBeenCalledWith([
      {
        type: 'visualization',
        id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
        attributes: {
          title: 'An existing visualization',
        },
        options: {},
      },
      {
        type: 'dashboard',
        id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
        attributes: {
          title: 'An existing dashboard',
        },
        options: {},
      },
    ]);
  });
});
