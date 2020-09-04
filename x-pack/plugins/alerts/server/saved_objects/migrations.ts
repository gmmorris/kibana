/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  SavedObjectMigrationMap,
  SavedObjectUnsanitizedDoc,
  SavedObjectMigrationFn,
  SavedObjectMigrationContext,
} from '../../../../../src/core/server';
import { RawAlert } from '../types';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';

export const LEGACY_LAST_MODIFIED_VERSION = 'pre-7.10.0';

export function getMigrations(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectMigrationMap {
  const migrationWhenRBACWasIntroduced = markAsLegacyAndChangeConsumer(
    encryptedSavedObjects,
    new Map(
      Object.entries({
        alerting: 'alerts',
        metrics: 'infrastructure',
      })
    )
  );

  return {
    '7.10.0': (doc: SavedObjectUnsanitizedDoc<RawAlert>, context: SavedObjectMigrationContext) => {
      return executeMigrationWithErrorHandling(doc, context, migrationWhenRBACWasIntroduced);
    },
  };
}

function executeMigrationWithErrorHandling(
  doc: SavedObjectUnsanitizedDoc<RawAlert>,
  context: SavedObjectMigrationContext,
  migrationFunc: SavedObjectMigrationFn<RawAlert, RawAlert>
) {
  try {
    return migrationFunc(doc, context);
  } catch (ex) {
    context.log.error(
      `encryptedSavedObject migration failed for alert ${doc.id} with error: ${ex.message}`,
      { alertDocument: doc }
    );
  }
  return doc;
}

function markAsLegacyAndChangeConsumer(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  consumersToChange: Map<string, string>
): SavedObjectMigrationFn<RawAlert, RawAlert> {
  return encryptedSavedObjects.createMigration<RawAlert, RawAlert>(
    function shouldBeMigrated(doc): doc is SavedObjectUnsanitizedDoc<RawAlert> {
      // migrate all documents in 7.10 in order to add the "meta" RBAC field
      return true;
    },
    (doc: SavedObjectUnsanitizedDoc<RawAlert>): SavedObjectUnsanitizedDoc<RawAlert> => {
      const {
        attributes: { consumer },
      } = doc;
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          consumer: consumersToChange.get(consumer) ?? consumer,
          // mark any alert predating 7.10 as a legacy alert
          meta: {
            versionLastmodified: LEGACY_LAST_MODIFIED_VERSION,
          },
        },
      };
    }
  );
}
