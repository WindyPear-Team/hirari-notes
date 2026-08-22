import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { mergeArchive, parseArchive } from "./archive";
import { createId, defaultsForSchema, validateRecord, validateSchema } from "./schema";
import { createWelcomeRecord, sshSchema } from "./sample-data";
import type { FieldValue, ImportSummary, NoteRecord, NoteSchema, NoteState } from "./types";

const STORAGE_KEY = "tsumugi-notes/state-v1";

interface NotesContextValue extends NoteState {
  isReady: boolean;
  lastLocalChangeAt: number;
  addSchema: (draft: Omit<NoteSchema, "id" | "version" | "createdAt" | "updatedAt">) => Promise<void>;
  updateSchema: (schema: NoteSchema) => Promise<void>;
  addRecord: (input: { schemaId: string; title: string; data: Record<string, FieldValue>; tags?: string[] }) => Promise<void>;
  updateRecord: (record: NoteRecord) => Promise<void>;
  removeRecord: (id: string) => Promise<void>;
  applySyncedRecords: (records: NoteRecord[]) => Promise<void>;
  importArchive: (content: string) => Promise<ImportSummary>;
  exportFormats: () => NoteSchema[];
  exportState: () => { formats: NoteSchema[]; records: NoteRecord[] };
}

const NotesContext = createContext<NotesContextValue | null>(null);

function makeInitialState(): NoteState {
  const deviceId = createId("device");
  return { schemas: [sshSchema], records: [createWelcomeRecord(deviceId)], deviceId };
}

export function NotesProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<NoteState>(makeInitialState);
  const [isReady, setIsReady] = useState(false);
  const [lastLocalChangeAt, setLastLocalChangeAt] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((serialized) => {
        if (serialized) setState(JSON.parse(serialized) as NoteState);
      })
      .finally(() => setIsReady(true));
  }, []);

  const commit = useCallback(async (next: NoteState) => {
    setState(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addSchema = useCallback(async (draft: Omit<NoteSchema, "id" | "version" | "createdAt" | "updatedAt">) => {
    const timestamp = new Date().toISOString();
    const schema: NoteSchema = { ...draft, id: createId("format"), version: 1, createdAt: timestamp, updatedAt: timestamp };
    const errors = validateSchema(schema);
    if (errors.length) throw new Error(errors[0]);
    await commit({ ...state, schemas: [schema, ...state.schemas] });
    setLastLocalChangeAt(Date.now());
  }, [commit, state]);

  const updateSchema = useCallback(async (schema: NoteSchema) => {
    const next = { ...schema, version: schema.version + 1, updatedAt: new Date().toISOString() };
    const errors = validateSchema(next);
    if (errors.length) throw new Error(errors[0]);
    await commit({ ...state, schemas: state.schemas.map((entry) => entry.id === next.id ? next : entry) });
  }, [commit, state]);

  const addRecord = useCallback(async ({ schemaId, title, data, tags = [] }: { schemaId: string; title: string; data: Record<string, FieldValue>; tags?: string[] }) => {
    const schema = state.schemas.find((entry) => entry.id === schemaId);
    if (!schema) throw new Error("未找到所选格式。");
    const timestamp = new Date().toISOString();
    const record: NoteRecord = {
      id: createId("note"), schemaId, schemaVersion: schema.version, title, data: { ...defaultsForSchema(schema), ...data }, tags,
      revision: 1, deviceId: state.deviceId, createdAt: timestamp, updatedAt: timestamp,
    };
    const errors = validateRecord(record, schema);
    if (errors.length) throw new Error(errors[0]);
    await commit({ ...state, records: [record, ...state.records] });
    setLastLocalChangeAt(Date.now());
  }, [commit, state]);

  const updateRecord = useCallback(async (record: NoteRecord) => {
    const schema = state.schemas.find((entry) => entry.id === record.schemaId);
    if (!schema) throw new Error("未找到所选格式。");
    const next = { ...record, revision: record.revision + 1, updatedAt: new Date().toISOString(), deviceId: state.deviceId };
    const errors = validateRecord(next, schema);
    if (errors.length) throw new Error(errors[0]);
    await commit({ ...state, records: state.records.map((entry) => entry.id === next.id ? next : entry) });
    setLastLocalChangeAt(Date.now());
  }, [commit, state]);

  const removeRecord = useCallback(async (id: string) => {
    const timestamp = new Date().toISOString();
    await commit({ ...state, records: state.records.map((entry) => entry.id === id ? { ...entry, deletedAt: timestamp, updatedAt: timestamp, revision: entry.revision + 1 } : entry) });
    setLastLocalChangeAt(Date.now());
  }, [commit, state]);

  const applySyncedRecords = useCallback(async (records: NoteRecord[]) => {
    await commit({ ...state, records });
  }, [commit, state]);

  const importArchive = useCallback(async (content: string) => {
    const archive = parseArchive(content);
    const merged = mergeArchive(state.schemas, state.records, archive);
    await commit({ ...state, schemas: merged.formats, records: merged.records });
    setLastLocalChangeAt(Date.now());
    return merged.summary;
  }, [commit, state]);

  const value = useMemo<NotesContextValue>(() => ({
    ...state, isReady, lastLocalChangeAt, addSchema, updateSchema, addRecord, updateRecord, removeRecord, applySyncedRecords, importArchive,
    exportFormats: () => state.schemas,
    exportState: () => ({ formats: state.schemas, records: state.records }),
  }), [addRecord, addSchema, applySyncedRecords, importArchive, isReady, lastLocalChangeAt, removeRecord, state, updateRecord, updateSchema]);

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesContextValue {
  const context = useContext(NotesContext);
  if (!context) throw new Error("useNotes 必须在 NotesProvider 中使用。");
  return context;
}
