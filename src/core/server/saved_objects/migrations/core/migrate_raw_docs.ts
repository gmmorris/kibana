/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * This file provides logic for migrating raw documents.
 */

import { SavedObjectsRawDoc, SavedObjectsSerializer } from '../../serialization';
import { TransformFn } from './document_migrator';
import { SavedObjectsMigrationLogger } from '.';

/**
 * Applies the specified migration function to every saved object document in the list
 * of raw docs. Any raw docs that are not valid saved objects will simply be passed through.
 *
 * @param {TransformFn} migrateDoc
 * @param {SavedObjectsRawDoc[]} rawDocs
 * @returns {SavedObjectsRawDoc[]}
 */
export async function migrateRawDocs(
  serializer: SavedObjectsSerializer,
  migrateDoc: TransformFn,
  rawDocs: SavedObjectsRawDoc[],
  log: SavedObjectsMigrationLogger
): SavedObjectsRawDoc[] {
  const migrateDocWithoutBlocking = transformNonBlocking(migrateDoc);
  const processesDocs = [];
  for (const raw of rawDocs) {
    if (serializer.isRawSavedObject(raw)) {
      const savedObject = serializer.rawToSavedObject(raw);
      savedObject.migrationVersion = savedObject.migrationVersion || {};
      processesDocs.push(
        serializer.savedObjectToRaw({
          references: [],
          ...(await migrateDocWithoutBlocking(savedObject)),
        })
      );
    } else {
      log.error(
        `Error: Unable to migrate the corrupt Saved Object document ${raw._id}. To prevent Kibana from performing a migration on every restart, please delete or fix this document by ensuring that the namespace and type in the document's id matches the values in the namespace and type fields.`,
        { rawDocument: raw }
      );
      processesDocs.push(raw);
    }
  }
  return processesDocs;
}

function transformNonBlocking(transform: TransformFn): Promise<ReturnType<TransformFn>> {
  // promises aren't enough to unblock the event loop
  return (...args) =>
    new Promise((resolve) => {
      // set immediate is though
      setImmediate(() => {
        resolve(transform(...args));
      });
    });
}
