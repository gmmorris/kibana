/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import { ActionResult, ActionsRequestHandlerContext } from '../types';
import { ILicenseState } from '../lib';
import { BASE_ACTION_API_PATH } from '../../common';
import { verifyAccessAndContext } from './verify_access_and_context';
import { RewriteRequestCase, RewriteResponseCase } from './rewrite_request_case';
import { CreateOptions } from '../actions_client';

export const bodySchema = schema.object({
  name: schema.string(),
  action_type_id: schema.string(),
  config: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  secrets: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
});

const rewriteBodyReq: RewriteRequestCase<CreateOptions['action']> = ({
  action_type_id: actionTypeId,
  ...res
}) => ({ actionTypeId, ...res });
const rewriteBodyRes: RewriteResponseCase<ActionResult> = ({
  actionTypeId,
  isPreconfigured,
  ...res
}) => ({
  ...res,
  action_type_id: actionTypeId,
  is_preconfigured: isPreconfigured,
});

export const createActionRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ACTION_API_PATH}/connector`,
      validate: {
        body: bodySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = context.actions.getActionsClient();
        const action = rewriteBodyReq(req.body);
        return res.ok({
          body: rewriteBodyRes(await actionsClient.create({ action })),
        });
      })
    )
  );
};
