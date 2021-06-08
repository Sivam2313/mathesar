import {
  get,
  writable,
  Writable,
} from 'svelte/store';
import { States } from '@mathesar/utils/api';
import type { UploadCompletionOpts } from '@mathesar/utils/api';

export enum ImportChangeType {
  ADDED = 'added',
  REMOVED = 'removed',
}

interface FileImportWritableInfo {
  name?: string,
  schema?: string,
  status?: States,
  progress?: UploadCompletionOpts,
  error?: string
}

export interface FileImportInfo extends FileImportWritableInfo {
  id: string
}

export interface FileImportChange {
  changeType: ImportChangeType,
  info?: FileImportInfo,
  all: FileImportInfo[],
}

export type FileImport = Writable<FileImportInfo>;
let fileId = 0;

// Storage map
interface FileImportsForDB {
  changes: Writable<FileImportChange>,
  imports: Map<string, FileImport>
}
const databaseMap: Map<string, FileImportsForDB> = new Map();

export function getAllImportDetails(db: string): FileImportInfo[] {
  const database = databaseMap.get(db);
  if (database?.imports) {
    return Array.from(database.imports.values()).map((entry: FileImport) => get(entry));
  }
  return [];
}

export function getDBStore(db: string): FileImportsForDB {
  let database = databaseMap.get(db);
  if (!database) {
    database = {
      changes: writable<FileImportChange>(null),
      imports: new Map(),
    };
    databaseMap.set(db, database);
  }
  return database;
}

export function getFileStore(db: string, id: string): FileImport {
  const database = getDBStore(db);

  let fileImport = database.imports.get(id);
  if (!fileImport) {
    const fileImportInitialInfo: FileImportInfo = { id, status: States.Idle };
    fileImport = writable(fileImportInitialInfo);
    database.imports.set(id, fileImport);
  }
  return fileImport;
}

export function setFileStore(db: string, id: string, data: FileImportWritableInfo): void {
  const store = getFileStore(db, id);
  const existingData = get(store);
  store.set({
    ...existingData,
    ...data,
  });
}

export function newImport(db: string): void {
  const id = `_new_${fileId}`;
  const database = getDBStore(db);
  const fileImport = getFileStore(db, id);

  database.changes.set({
    changeType: ImportChangeType.ADDED,
    info: get(fileImport),
    all: getAllImportDetails(db),
  });

  fileId += 1;
}

export function removeImport(db:string, id: string): void {
  const database = databaseMap.get(db);
  if (database?.imports) {
    const fileImport = database.imports.get(id);
    database.imports.delete(id);

    database.changes.set({
      changeType: ImportChangeType.REMOVED,
      info: get(fileImport),
      all: getAllImportDetails(db),
    });
  }
}
