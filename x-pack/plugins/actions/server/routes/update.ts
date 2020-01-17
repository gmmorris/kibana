/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from 'kibana/server';
import { extendRouteWithLicenseCheck } from '../extend_route_with_license_check';
import { LicenseState } from '../lib/license_state';

const paramSchema = schema.object({
  id: schema.string(),
});

const bodySchema = schema.object({
  name: schema.string(),
  config: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  secrets: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
});

export const updateActionRoute = (router: IRouter, licenseState: LicenseState) => {
  router.put(
    {
      path: `/api/action/{id}`,
      validate: {
        body: bodySchema,
        params: paramSchema,
      },
      options: {
        tags: ['access:actions-all'],
      },
    },
    router.handleLegacyErrors(
      extendRouteWithLicenseCheck(licenseState, async function(
        context: RequestHandlerContext,
        req: KibanaRequest<TypeOf<typeof paramSchema>, any, TypeOf<typeof bodySchema>, any>,
        res: KibanaResponseFactory
      ): Promise<IKibanaResponse<any>> {
        const actionsClient = context.actions.getActionsClient();
        const { id } = req.params;
        const { name, config, secrets } = req.body;
        return res.ok({
          body: await actionsClient.update({
            id,
            action: { name, config, secrets },
          }),
        });
      })
    )
  );
};
