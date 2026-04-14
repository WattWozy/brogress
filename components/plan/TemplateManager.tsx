'use client';

import { useState, useRef, useEffect } from 'react';
import { useWorkout } from '@/context/WorkoutContext';

interface TemplateManagerProps {
  visible: boolean;
  onClose: () => void;
  openNew?: boolean;
}

export function TemplateManager({ visible, onClose, openNew }: TemplateManagerProps) {
  const {
    templates, activeTemplateId,
    selectTemplate, saveAsNewTemplate, deleteTemplate, renameTemplate,
  } = useWorkout();

  // Which template is being renamed (id → draft name)
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // New-template form
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const newInputRef = useRef<HTMLInputElement>(null);

  // Focus inputs when they appear
  useEffect(() => {
    if (renamingId && renameInputRef.current) renameInputRef.current.focus();
  }, [renamingId]);
  useEffect(() => {
    if (showNew && newInputRef.current) newInputRef.current.focus();
  }, [showNew]);

  // Reset internal state when sheet closes; auto-open new form when requested.
  useEffect(() => {
    if (!visible) {
      setRenamingId(null);
      setShowNew(false);
      setNewName('');
      setSaved(false);
    } else if (openNew) {
      setShowNew(true);
    }
  }, [visible, openNew]);

  function handleLoad(id: string) {
    selectTemplate(id);
    onClose();
  }

  function startRename(id: string, currentName: string) {
    setRenamingId(id);
    setRenameDraft(currentName);
  }

  async function commitRename(id: string) {
    const name = renameDraft.trim();
    if (name) await renameTemplate(id, name);
    setRenamingId(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this workout?')) return;
    await deleteTemplate(id);
  }

  async function handleSaveNew() {
    const name = newName.trim();
    if (!name || saving || saved) return;
    setSaving(true);
    await saveAsNewTemplate(name);
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 900);
  }

  return (
    /* Full-area overlay wrapper — captures backdrop taps */
    <div
      style={{
        position: 'absolute', inset: 0,
        zIndex: 60,
        pointerEvents: visible ? 'all' : 'none',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.28s',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '78%',
          background: '#161616',
          borderRadius: '20px 20px 0 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: 'transform',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#333' }} />
        </div>

        {/* Title */}
        <div style={{
          padding: '12px 24px 16px',
          fontFamily: "'Raleway', sans-serif",
          fontSize: 28, fontWeight: 900,
          textTransform: 'uppercase', color: '#f0f0f0',
          flexShrink: 0,
        }}>
          Workouts
        </div>

        {/* Template list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          {templates.map(t => {
            const isActive = t.id === activeTemplateId;
            const isRenaming = renamingId === t.id;
            const preview = t.exercises.slice(0, 4).map(e => e.name).join(' · ');

            return (
              <div
                key={t.id}
                style={{
                  padding: '14px 0',
                  borderBottom: '1px solid #222',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                {/* Active dot */}
                <div style={{
                  width: 6, height: 6,
                  borderRadius: '50%',
                  background: isActive ? '#f472b6' : 'transparent',
                  flexShrink: 0,
                  alignSelf: 'flex-start',
                  marginTop: 8,
                }} />

                {/* Name + preview */}
                <div
                  style={{ flex: 1, cursor: isRenaming ? 'default' : 'pointer', minWidth: 0 }}
                  onClick={() => !isRenaming && handleLoad(t.id)}
                >
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      value={renameDraft}
                      onChange={e => setRenameDraft(e.target.value)}
                      onBlur={() => commitRename(t.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitRename(t.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onClick={e => e.stopPropagation()}
                      style={{
                        background: '#2a2a2a',
                        border: '1px solid #f472b6',
                        color: '#f0f0f0',
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: 22, fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        padding: '4px 10px',
                        borderRadius: 8,
                        outline: 'none',
                        width: '100%',
                        WebkitAppearance: 'none',
                      }}
                    />
                  ) : (
                    <div style={{
                      fontFamily: "'Raleway', sans-serif",
                      fontSize: 22, fontWeight: 700,
                      textTransform: 'uppercase',
                      color: isActive ? '#f472b6' : '#f0f0f0',
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {t.name}
                    </div>
                  )}
                  <div style={{
                    fontFamily: "'Nunito', sans-serif",
                    fontSize: 9, color: '#555',
                    letterSpacing: '0.06em',
                    marginTop: 3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {preview || 'no exercises yet'}
                    {t.exercises.length > 4 && ` +${t.exercises.length - 4}`}
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => startRename(t.id, t.name)}
                  style={iconBtn}
                  aria-label="Rename"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  style={{ ...iconBtn, color: '#444' }}
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>
            );
          })}

          {/* New template */}
          <div style={{ paddingTop: 8, paddingBottom: 40 }}>
            {showNew ? (
              <div style={{ display: 'flex', gap: 10, paddingTop: 16 }}>
                <input
                  ref={newInputRef}
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveNew();
                    if (e.key === 'Escape') { setShowNew(false); setNewName(''); }
                  }}
                  placeholder="Name..."
                  style={{
                    flex: 1,
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    color: '#f0f0f0',
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: 22, fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                    padding: '10px 14px',
                    borderRadius: 12,
                    outline: 'none',
                    WebkitAppearance: 'none',
                  }}
                />
                <button
                  onClick={handleSaveNew}
                  disabled={saving || saved || !newName.trim()}
                  style={{
                    background: saved ? '#22c55e' : saving || !newName.trim() ? '#2a2a2a' : '#f472b6',
                    border: 'none',
                    color: saved ? '#fff' : saving || !newName.trim() ? '#555' : '#0e0e0e',
                    fontFamily: saving ? 'sans-serif' : "'Raleway', sans-serif",
                    fontSize: saved ? 20 : saving ? 16 : 18,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    padding: '10px 20px',
                    borderRadius: 12,
                    cursor: saving || saved || !newName.trim() ? 'default' : 'pointer',
                    flexShrink: 0,
                    minWidth: 64,
                    transition: 'background 0.2s, color 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {saved ? '✓' : saving ? '…' : 'Save'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNew(true)}
                style={{
                  width: '100%',
                  marginTop: 16,
                  border: '1px dashed #333',
                  borderRadius: 14,
                  background: 'transparent',
                  color: '#555',
                  fontFamily: "'Raleway', sans-serif",
                  fontSize: 20, fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  padding: '16px 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onPointerDown={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#f472b6';
                  (e.currentTarget as HTMLButtonElement).style.color = '#f472b6';
                }}
                onPointerUp={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#333';
                  (e.currentTarget as HTMLButtonElement).style.color = '#555';
                }}
                onPointerLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#333';
                  (e.currentTarget as HTMLButtonElement).style.color = '#555';
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
                Save current as new
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#555',
  fontSize: 18,
  cursor: 'pointer',
  padding: '6px 8px',
  lineHeight: 1,
  flexShrink: 0,
  fontFamily: 'sans-serif',
  transition: 'color 0.12s',
};
