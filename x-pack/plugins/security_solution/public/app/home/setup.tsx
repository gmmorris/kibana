/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import { FleetStart } from '../../../../fleet/public';

export const Setup: React.FunctionComponent<{
  fleet: FleetStart;
  notifications: NotificationsStart;
}> = ({ fleet, notifications }) => {
  React.useEffect(() => {
    const defaultText = i18n.translate('xpack.securitySolution.endpoint.ingestToastMessage', {
      defaultMessage: 'Fleet failed during its setup.',
    });

    const title = i18n.translate('xpack.securitySolution.endpoint.ingestToastTitle', {
      defaultMessage: 'App failed to initialize',
    });

    const displayToastWithModal = (text: string) => {
      const errorText = new Error(defaultText);
      // we're leveraging the notification's error toast which is usually used for displaying stack traces of an
      // actually Error. Instead of displaying a stack trace we'll display the more detailed error text when the
      // user clicks `See the full error` button to see the modal
      errorText.stack = text;
      notifications.toasts.addError(errorText, {
        title,
      });
    };

    fleet.isInitialized().catch((error: Error) => displayToastWithModal(error.message));
  }, [fleet, notifications.toasts]);

  return null;
};
