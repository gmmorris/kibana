/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useCallback, useReducer, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutBody,
  EuiPortal,
  EuiBetaBadge,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAlertsContext } from '../../context/alerts_context';
import { Alert, AlertAction, IErrorObject } from '../../../types';
import { AlertForm, validateBaseProperties } from './alert_form';
import { alertReducer } from './alert_reducer';
import { updateAlert } from '../../lib/alert_api';
import { AlertActionSecurityCallOutWithApi as AlertActionSecurityCallOut } from '../../components/alert_action_security_call_out';
import { useAppDependencies } from '../../app_context';

interface AlertEditProps {
  initialAlert: Alert;
  editFlyoutVisible: boolean;
  setEditFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AlertEdit = ({
  initialAlert,
  editFlyoutVisible,
  setEditFlyoutVisibility,
}: AlertEditProps) => {
  const { docLinks } = useAppDependencies();

  const [{ alert }, dispatch] = useReducer(alertReducer, { alert: initialAlert });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasActionsDisabled, setHasActionsDisabled] = useState<boolean>(false);

  const {
    reloadAlerts,
    http,
    toastNotifications,
    alertTypeRegistry,
    actionTypeRegistry,
  } = useAlertsContext();

  const closeFlyout = useCallback(() => {
    setEditFlyoutVisibility(false);
  }, [setEditFlyoutVisibility]);

  if (!editFlyoutVisible) {
    return null;
  }

  const alertType = alertTypeRegistry.get(alert.alertTypeId);

  const errors = {
    ...(alertType ? alertType.validate(alert.params).errors : []),
    ...validateBaseProperties(alert).errors,
  } as IErrorObject;
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

  const actionsErrors: Array<{
    errors: IErrorObject;
  }> = alert.actions.map((alertAction: AlertAction) =>
    actionTypeRegistry.get(alertAction.actionTypeId)?.validateParams(alertAction.params)
  );

  const hasActionErrors =
    actionsErrors.find(
      (errorObj: { errors: IErrorObject }) =>
        errorObj &&
        !!Object.keys(errorObj.errors).find(errorKey => errorObj.errors[errorKey].length >= 1)
    ) !== undefined;

  async function onSaveAlert(): Promise<Alert | undefined> {
    try {
      const newAlert = await updateAlert({ http, alert, id: alert.id });
      if (toastNotifications) {
        toastNotifications.addSuccess(
          i18n.translate('xpack.triggersActionsUI.sections.alertEdit.saveSuccessNotificationText', {
            defaultMessage: "Updated '{alertName}'",
            values: {
              alertName: newAlert.name,
            },
          })
        );
      }
      return newAlert;
    } catch (errorRes) {
      if (toastNotifications) {
        toastNotifications.addDanger(
          i18n.translate('xpack.triggersActionsUI.sections.alertEdit.saveErrorNotificationText', {
            defaultMessage: 'Failed to save alert: {message}',
            values: {
              message: errorRes.body?.message ?? '',
            },
          })
        );
      }
    }
  }

  return (
    <EuiPortal>
      <EuiFlyout
        onClose={closeFlyout}
        aria-labelledby="flyoutAlertEditTitle"
        size="m"
        maxWidth={620}
        ownFocus
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s" data-test-subj="editAlertFlyoutTitle">
            <h3 id="flyoutTitle">
              <FormattedMessage
                defaultMessage="Edit Alert"
                id="xpack.triggersActionsUI.sections.alertEdit.flyoutTitle"
              />
              &emsp;
              <EuiBetaBadge
                label="Beta"
                tooltipContent={i18n.translate(
                  'xpack.triggersActionsUI.sections.alertEdit.betaBadgeTooltipContent',
                  {
                    defaultMessage: 'This module is not GA. Please help us by reporting any bugs.',
                  }
                )}
              />
            </h3>
          </EuiTitle>
        </EuiFlyoutHeader>
        <AlertActionSecurityCallOut docLinks={docLinks} action={'edited'} />
        <EuiFlyoutBody>
          {hasActionsDisabled && (
            <Fragment>
              <EuiCallOut
                size="s"
                color="danger"
                iconType="alert"
                title={i18n.translate(
                  'xpack.triggersActionsUI.sections.alertEdit.disabledActionsWarningTitle',
                  { defaultMessage: 'This alert has actions that are disabled' }
                )}
              />
              <EuiSpacer />
            </Fragment>
          )}
          <AlertForm
            alert={alert}
            dispatch={dispatch}
            errors={errors}
            canChangeTrigger={false}
            setHasActionsDisabled={setHasActionsDisabled}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty data-test-subj="cancelSaveEditedAlertButton" onClick={closeFlyout}>
                {i18n.translate('xpack.triggersActionsUI.sections.alertEdit.cancelButtonLabel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                color="secondary"
                data-test-subj="saveEditedAlertButton"
                type="submit"
                iconType="check"
                isDisabled={hasErrors || hasActionErrors}
                isLoading={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  const savedAlert = await onSaveAlert();
                  setIsSaving(false);
                  if (savedAlert) {
                    closeFlyout();
                    if (reloadAlerts) {
                      reloadAlerts();
                    }
                  }
                }}
              >
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.alertEdit.saveButtonLabel"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
};
