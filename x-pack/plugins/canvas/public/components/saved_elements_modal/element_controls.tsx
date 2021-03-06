/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, MouseEvent } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { ComponentStrings } from '../../../i18n/components';

const { ElementControls: strings } = ComponentStrings;

interface Props {
  /**
   * A click handler for the delete button
   */
  onDelete: (event: MouseEvent) => void;
  /**
   * A click handler for the edit button
   */
  onEdit: (event: MouseEvent) => void;
}

export const ElementControls: FunctionComponent<Props> = ({ onDelete, onEdit }) => (
  <EuiFlexGroup
    className="canvasElementCard__controls"
    gutterSize="xs"
    justifyContent="spaceBetween"
  >
    <EuiFlexItem grow={false}>
      <EuiToolTip content={strings.getEditTooltip()}>
        <EuiButtonIcon
          iconType="pencil"
          aria-label={strings.getEditAriaLabel()}
          onClick={onEdit}
          data-test-subj="canvasElementCard__editButton"
        />
      </EuiToolTip>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiToolTip content={strings.getDeleteTooltip()}>
        <EuiButtonIcon
          color="danger"
          iconType="trash"
          aria-label={strings.getDeleteAriaLabel()}
          onClick={onDelete}
          data-test-subj="canvasElementCard__deleteButton"
        />
      </EuiToolTip>
    </EuiFlexItem>
  </EuiFlexGroup>
);

ElementControls.propTypes = {
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
};
