/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, PropsWithChildren } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiButtonIcon, EuiTitle } from '@elastic/eui';
import { AlertConditionsProps, ActionGroupWithCondition } from './alert_conditions';

export type AlertConditionsGroupProps<ConditionProps> = {
  actionGroup?: ActionGroupWithCondition<ConditionProps>;
} & Pick<AlertConditionsProps<ConditionProps>, 'onResetConditionsFor'>;

export const AlertConditionsGroup = <ConditionProps extends unknown>({
  actionGroup,
  onResetConditionsFor,
  children,
  ...otherProps
}: PropsWithChildren<AlertConditionsGroupProps<ConditionProps>>) => {
  if (!actionGroup) {
    return null;
  }

  return (
    <EuiFormRow
      label={
        <EuiTitle size="s">
          <strong>{actionGroup.name}</strong>
        </EuiTitle>
      }
      fullWidth
      labelAppend={
        onResetConditionsFor &&
        !actionGroup.isRequired && (
          <EuiButtonIcon
            iconType="minusInCircle"
            color="danger"
            aria-label={i18n.translate(
              'xpack.triggersActionsUI.sections.alertAdd.conditions.removeConditionLabel',
              {
                defaultMessage: 'Remove',
              }
            )}
            onClick={() => onResetConditionsFor(actionGroup)}
          />
        )
      }
    >
      {React.isValidElement(children) ? (
        React.cloneElement(React.Children.only(children), {
          actionGroup,
          ...otherProps,
        })
      ) : (
        <Fragment />
      )}
    </EuiFormRow>
  );
};
