/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BASE_PATH } from '../constants';
let router: any;
export const registerRouter = (aRouter: any) => {
  router = aRouter;
};

export const goToAlertsList = () => {
  router.history.push({ pathname: `${BASE_PATH}alerts` });
};
