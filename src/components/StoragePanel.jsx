import { useEffect, useRef, useState } from 'react';
import { FILE_NAME, downloadNotes, mergeNotes, parseNotesFile } from '../deviceFile';

const STATUS_TEXT = {
  connected: 'Saving to a file on this device',
  locked: 'Your notes file needs permission again',
  error: 'Couldn’t write to your notes file',
  none: 'Saved in this browser only',
  unsupported: 'Saved in this browser only',
};

/** Where the notes are kept: a file on the device, plus backup and restore. */
export default function StoragePanel({ notes, file, onImport, onClose }) {
  const [message, setMessage] = useState('');
  const importRef = useRef(null);

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Run a file action and show a plain message if it fails.
  const attempt = (action) => async () => {
    setMessage('');
    try {
      await action();
    } catch (error) {
      setMessage(error?.message || 'Something went wrong with that file.');
    }
  };

  const importFile = async (event) => {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked) return;
    try {
      const incoming = parseNotesFile(await picked.text());
      const merged = mergeNotes(notes, incoming);
      onImport(merged);
      const added = merged.length - notes.length;
      setMessage(`Imported ${incoming.length} ${incoming.length === 1 ? 'note' : 'notes'} (${added} new).`);
    } catch (error) {
      setMessage(error instanceof SyntaxError ? 'That file isn’t a Paperleaf notes file.' : error.message);
    }
  };

  const { status } = file;

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog storage-panel" role="dialog" aria-modal="true" aria-label="Where your notes are saved">
        <h2>Where your notes are saved</h2>
        <p className={`storage-status is-${status}`}>
          {STATUS_TEXT[status]}
          {file.fileName && status !== 'none' ? `: ${file.fileName}` : ''}
        </p>

        <section>
          <h3>A file on this device</h3>
          {status === 'unsupported' && (
            <p>
              This browser doesn’t let a website keep a file up to date. Use Chrome or Edge on a computer for that, or
              use the backup buttons below.
            </p>
          )}
          {status === 'none' && (
            <>
              <p>
                Choose where to keep <b>{FILE_NAME}</b>. Every change is then written to that file as well, so your
                notes survive clearing the browser and can be copied or backed up like any other file.
              </p>
              <div className="storage-actions">
                <button className="btn btn-primary" onClick={attempt(file.createFile)}>
                  Create notes file…
                </button>
                <button className="btn btn-ghost" onClick={attempt(file.openFile)}>
                  Open existing file…
                </button>
              </div>
            </>
          )}
          {status === 'locked' && (
            <>
              <p>
                For your safety the browser asks again each time you come back. Allow it to carry on saving to{' '}
                <b>{file.fileName}</b>.
              </p>
              <div className="storage-actions">
                <button className="btn btn-primary" onClick={attempt(file.unlock)}>
                  Allow saving
                </button>
                <button className="btn btn-ghost" onClick={attempt(file.disconnect)}>
                  Stop using this file
                </button>
              </div>
            </>
          )}
          {(status === 'connected' || status === 'error') && (
            <>
              <p>
                {status === 'connected'
                  ? 'Every change is written to this file as well as to the browser.'
                  : 'The file may have been moved, renamed or deleted. Your notes are still safe in the browser.'}
              </p>
              <div className="storage-actions">
                {status === 'error' && (
                  <button className="btn btn-primary" onClick={attempt(file.createFile)}>
                    Choose a file again…
                  </button>
                )}
                <button className="btn btn-ghost" onClick={attempt(file.disconnect)}>
                  Stop using this file
                </button>
              </div>
            </>
          )}
        </section>

        <section>
          <h3>Backup</h3>
          <p>Download a copy of all your notes, or bring notes in from a backup. Importing never deletes anything.</p>
          <div className="storage-actions">
            <button className="btn btn-ghost" onClick={() => downloadNotes(notes)}>
              Export backup
            </button>
            <button className="btn btn-ghost" onClick={() => importRef.current.click()}>
              Import backup…
            </button>
            <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={importFile} />
          </div>
        </section>

        {message && (
          <p className="storage-message" role="status">
            {message}
          </p>
        )}

        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
