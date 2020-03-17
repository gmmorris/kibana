/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  RequestHandler,
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandlerContext,
  RouteMethod,
} from 'kibana/server';

export function handleDisabledApiKeysError<P, Q, B>(
  handler: RequestHandler<P, Q, B>
): RequestHandler<P, Q, B> {
  return async (
    context: RequestHandlerContext,
    request: KibanaRequest<P, Q, B, RouteMethod>,
    response: KibanaResponseFactory
  ) => {
    try {
      return await handler(context, request, response);
    } catch (e) {
      if (isApiKeyDisabledError(e)) {
        return response.badRequest({
          body: e,
        });
      }
      throw e;
    }
  };
}

export function isApiKeyDisabledError(e: Error) {
  return e?.message?.includes('api keys are not enabled') ?? false;
}

export function isSecurityPluginDisabledError(e: Error) {
  return e?.message?.includes('no handler found') ?? false;
}
