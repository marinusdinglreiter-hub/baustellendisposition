import { useDroppable } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';

export function CleanUpZone() {
  const { isOver, setNodeRef } = useDroppable({
    id: 'aufraumen',
    data: { type: 'aufraumen' },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        border: isOver ? '3px dashed #dc2626' : '3px dashed #d1d5db',
        borderRadius: 12,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: isOver ? '#fef2f2' : '#fafafa',
        color: isOver ? '#dc2626' : '#9ca3af',
        fontWeight: 600,
        fontSize: 14,
        transition: 'all 0.15s',
        cursor: 'default',
        minHeight: 56,
      }}
    >
      <Trash2 size={20} />
      <span>Aufräumen — Ressource in Pool zurücklegen</span>
    </div>
  );
}
