import { useMemo, useState } from 'react';
import { PAPER_COLORS, POSTIT_COLORS, byId, styleVars } from '../constants';
import { formatDate, formatEdited } from '../utils';
import Dialog from './Dialog.jsx';
import StoragePanel from './StoragePanel.jsx';
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon } from './Icons.jsx';

function NoteCard({ note, onOpen, onRename, onDelete }) {
  const { style } = note;
  const title = note.title.trim() || 'Untitled note';
  const snippet = note.content.trim().slice(0, 260);
  const dark = byId(PAPER_COLORS, style.paperColor).dark;

  return (
    <article
      className={`card ${style.paper === 'ruled' ? 'is-ruled' : ''} ${dark ? 'is-dark' : ''}`}
      data-pen={style.pen}
      style={styleVars(style)}
    >
      <button className="card-open" onClick={onOpen} aria-label={`Open ${title}`}>
        <span className="card-title ink-text">{title}</span>
        <span className="card-snippet ink-text">{snippet || 'Empty page'}</span>
      </button>
      <div className="card-foot">
        <span title={`Created ${formatDate(note.createdAt)}`}>Created {formatDate(note.createdAt)}</span>
        <span>Edited {formatEdited(note.updatedAt)}</span>
        {note.postits?.length > 0 && (
          <span className="card-postits">
            {note.postits.slice(0, 5).map((p) => (
              <i key={p.id} style={{ background: byId(POSTIT_COLORS, p.color).bg }} />
            ))}
            {note.postits.length} {note.postits.length === 1 ? 'post-it' : 'post-its'}
          </span>
        )}
      </div>
      <div className="card-actions">
        <button className="icon-btn" onClick={onRename} aria-label={`Rename ${title}`} title="Rename">
          <PencilIcon />
        </button>
        <button className="icon-btn" onClick={onDelete} aria-label={`Delete ${title}`} title="Delete">
          <TrashIcon />
        </button>
      </div>
    </article>
  );
}

export default function Dashboard({ notes, file, onImport, onNew, onOpen, onRename, onDelete }) {
  const [query, setQuery] = useState('');
  const [renaming, setRenaming] = useState(null); // { id, value }
  const [deleting, setDeleting] = useState(null); // note
  const [storageOpen, setStorageOpen] = useState(false);
  const onFile = file.status === 'connected';

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;
    return sorted.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
  }, [notes, query]);

  return (
    <div className="dashboard">
      <header className="dash-head">
        <div className="brand">
          <h1>Paperleaf</h1>
          <p>
            {notes.length === 0
              ? 'Your notebook is empty'
              : `${notes.length} ${notes.length === 1 ? 'note' : 'notes'} · ${
                  onFile ? `saved to ${file.fileName}` : 'saved in this browser'
                }`}
          </p>
        </div>
        <div className="dash-tools">
          {notes.length > 0 && (
            <label className="search">
              <SearchIcon />
              <input
                type="search"
                placeholder="Search notes"
                aria-label="Search notes"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          )}
          <button
            className={`btn btn-ghost storage-btn is-${file.status}`}
            onClick={() => setStorageOpen(true)}
            title="Where your notes are saved"
          >
            <i aria-hidden="true" /> Storage
          </button>
          <button className="btn btn-primary btn-new" onClick={onNew}>
            <PlusIcon /> New Note
          </button>
        </div>
      </header>

      {(file.status === 'locked' || file.status === 'error') && (
        <div className="storage-banner" role="status">
          <span>
            {file.status === 'locked'
              ? `Changes aren’t being written to ${file.fileName} yet — the browser needs your permission again.`
              : `Couldn’t write to ${file.fileName || 'your notes file'}. Your notes are still safe in the browser.`}
          </span>
          <button className="btn btn-primary" onClick={file.status === 'locked' ? file.unlock : () => setStorageOpen(true)}>
            {file.status === 'locked' ? 'Allow saving' : 'Fix'}
          </button>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="empty">
          <div className="empty-sheet" aria-hidden="true" />
          <h2>Start your first page</h2>
          <p>Pick your paper, your pen and your handwriting. Everything stays on this device.</p>
          <button className="btn btn-primary" onClick={onNew}>
            <PlusIcon /> New Note
          </button>
        </div>
      ) : visible.length === 0 ? (
        <p className="no-results">No notes match “{query.trim()}”.</p>
      ) : (
        <main className="grid">
          <button className="card card-new" onClick={onNew}>
            <PlusIcon />
            <span>New Note</span>
          </button>
          {visible.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onOpen={() => onOpen(note.id)}
              onRename={() => setRenaming({ id: note.id, value: note.title })}
              onDelete={() => setDeleting(note)}
            />
          ))}
        </main>
      )}

      {storageOpen && (
        <StoragePanel notes={notes} file={file} onImport={onImport} onClose={() => setStorageOpen(false)} />
      )}

      {renaming && (
        <Dialog
          title="Rename note"
          confirmLabel="Save"
          onCancel={() => setRenaming(null)}
          onConfirm={() => {
            onRename(renaming.id, renaming.value.trim());
            setRenaming(null);
          }}
        >
          <input
            className="text-input"
            autoFocus
            maxLength={120}
            placeholder="Untitled note"
            aria-label="Note title"
            value={renaming.value}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setRenaming({ ...renaming, value: e.target.value })}
          />
        </Dialog>
      )}

      {deleting && (
        <Dialog
          title="Delete this note?"
          confirmLabel="Delete"
          danger
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            onDelete(deleting.id);
            setDeleting(null);
          }}
        >
          <p>
            “{deleting.title.trim() || 'Untitled note'}” will be removed from this device. This can’t be undone.
          </p>
        </Dialog>
      )}
    </div>
  );
}
