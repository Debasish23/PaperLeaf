import { useCallback, useEffect, useRef, useState } from 'react';
import {
  askPermission,
  canUseDeviceFile,
  forgetHandle,
  hasPermission,
  mergeNotes,
  pickExistingFile,
  pickNewFile,
  readNotesFile,
  recallHandle,
  rememberHandle,
  writeNotesFile,
} from './deviceFile';
import { loadDeletedIds } from './storage';

/**
 * Keeps a notes file on the device in step with the app.
 *
 * status: 'unsupported' — this browser can't write files; use export/import
 *         'none'        — no file chosen
 *         'locked'      — a file is chosen but the browser needs a click to
 *                         allow writing again (it forgets when the tab closes)
 *         'connected'   — every save is also written to the file
 *         'error'       — the last write failed (file moved, disk full…)
 *
 * getNotes() returns the current notes; adopt(list) replaces them in the app.
 */
export default function useDeviceFile(getNotes, adopt) {
  const [status, setStatus] = useState(canUseDeviceFile() ? 'none' : 'unsupported');
  const [fileName, setFileName] = useState('');
  const handleRef = useRef(null);
  const writingRef = useRef(false);
  const queuedRef = useRef(false);

  /** Write the current notes to the file; calls made mid-write are coalesced. */
  const writeNow = useCallback(async () => {
    const handle = handleRef.current;
    if (!handle) return;
    if (writingRef.current) {
      queuedRef.current = true;
      return;
    }
    writingRef.current = true;
    try {
      do {
        queuedRef.current = false;
        await writeNotesFile(handle, getNotes());
      } while (queuedRef.current);
      setStatus('connected');
    } catch {
      setStatus('error');
    } finally {
      writingRef.current = false;
    }
  }, [getNotes]);

  /** Bring in whatever the file holds, then write the combined result back. */
  const syncWith = useCallback(
    async (handle) => {
      // Notes deleted on this device stay deleted, even if the file still has them.
      const deleted = loadDeletedIds();
      const fromFile = (await readNotesFile(handle)).filter((note) => !deleted.has(note.id));
      const merged = mergeNotes(getNotes(), fromFile);
      adopt(merged);
      handleRef.current = handle;
      setFileName(handle.name);
      setStatus('connected');
      await writeNow();
    },
    [adopt, getNotes, writeNow]
  );

  // On start-up, pick up the file chosen on a previous visit.
  useEffect(() => {
    if (!canUseDeviceFile()) return undefined;
    let live = true;
    (async () => {
      const handle = await recallHandle();
      if (!handle || !live) return;
      setFileName(handle.name);
      try {
        if (await hasPermission(handle)) await syncWith(handle);
        else {
          handleRef.current = null;
          setStatus('locked');
        }
      } catch {
        if (live) setStatus('error');
      }
    })();
    return () => {
      live = false;
    };
  }, [syncWith]);

  const connect = useCallback(
    async (pickFile, { readFirst }) => {
      const handle = await pickFile();
      if (!handle) return;
      await rememberHandle(handle);
      if (readFirst) await syncWith(handle);
      else {
        handleRef.current = handle;
        setFileName(handle.name);
        setStatus('connected');
        await writeNow();
      }
    },
    [syncWith, writeNow]
  );

  const createFile = useCallback(() => connect(pickNewFile, { readFirst: false }), [connect]);
  const openFile = useCallback(() => connect(pickExistingFile, { readFirst: true }), [connect]);

  /** Needs to be called from a click: asks the browser to allow writing again. */
  const unlock = useCallback(async () => {
    const handle = await recallHandle();
    if (!handle) {
      setStatus('none');
      return;
    }
    if (await askPermission(handle)) await syncWith(handle);
  }, [syncWith]);

  const disconnect = useCallback(async () => {
    handleRef.current = null;
    setFileName('');
    setStatus('none');
    await forgetHandle();
  }, []);

  return { status, fileName, writeNow, createFile, openFile, unlock, disconnect };
}
