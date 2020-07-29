/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { APMLink, APMLinkExtendProps } from './APMLink';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { pickKeys } from '../../../../../common/utils/pick_keys';

function ServiceOverviewLink(props: APMLinkExtendProps) {
  const { urlParams } = useUrlParams();

  const persistedFilters = pickKeys(urlParams, 'host', 'agentName');

  return <APMLink path="/services" query={persistedFilters} {...props} />;
}

export { ServiceOverviewLink };
