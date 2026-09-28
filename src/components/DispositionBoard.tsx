import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { useStore } from '../store/useStore';
import { BaustelleColumn } from './BaustelleColumn';
import { PoolSection, poolConfigs } from './PoolSection';
import { CleanUpZone } from './CleanUpZone';
import { KfzTermineColumn } from './KfzTermineColumn';
import { ColumnControls, ColumnDragPreview, ArchivStrip } from './ColumnControls';
import { KurzfristigColumn } from './KurzfristigColumn';
import { fileStore } from '../utils/fileStore';
import { ResourceCard } from './ResourceCard';
import type { CardData } from './ResourceCard';
import { validateDrop, isDropAllowed } from '../types/validation';
import type { Baustelle, BaustelleAttachment } from '../types';
import { isKurzfristig, isStreifenBaustelle } from '../types';
import { showToast } from './Toast';

// ─── Reihen-Konfiguration ─────────────────────────────────────────────────────

const ROW_GROUPS = [
  { key: 'reihe1', pools: ['verfuegbar', 'krank', 'schule'] },
  { key: 'reihe2', pools: ['frei', 'nicht_verfuegbar', 'fuhrpark'] },
  { key: 'reihe3', pools: ['maschinenpark', 'in_reparatur', 'ausser_betrieb'] },
] as const;

type RowKey = 'reihe1' | 'reihe2' | 'reihe3';
type RowState = Record<RowKey, boolean>;

const LS_KEY = 'dispositionstafel_reihen_zustand';

function loadRowState(): RowState {
  const defaults: RowState = { reihe1: true, reihe2: false, reihe3: false };
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) return { ...defaults, ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  return defaults;
}

function saveRowState(state: RowState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

// ─── Chevron SVG (kein Emoji) ─────────────────────────────────────────────────

function ChevronSvg({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        color: '#94a3b8',
        flexShrink: 0,
        transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
        transition: 'transform 0.2s ease',
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ─── Reihen-Toggle-Leiste ─────────────────────────────────────────────────────

function RowToggleBar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        padding: '5px 0',
        marginBottom: 6,
        userSelect: 'none',
      }}
    >
      <ChevronSvg open={open} />
      <div
        style={{
          flex: 1,
          height: 1,
          backgroundColor: '#e2e8f0',
        }}
      />
    </div>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export function DispositionBoard() {
  const {
    baustellen,
    personnel,
    equipment,
    movePersonnel,
    moveEquipment,
    cleanUpPersonnel,
    cleanUpEquipment,
    applyDayRules,
    applyAboBaustellen,
    updateBaustelle,
    archiveBaustelle,
    unarchiveBaustelle,
    moveBaustelleBefore,
    addBaustelle,
    removeBaustelle,
    convertKurzfristig,
  } = useStore();

  const [activeCard, setActiveCard] = useState<CardData | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [invalidDropZones, setInvalidDropZones] = useState<Set<string>>(new Set());
  const [hoveredDropZone, setHoveredDropZone] = useState<string | null>(null);
  const [rowState, setRowState] = useState<RowState>(loadRowState);

  // Ref für drag-over Auto-Expand-Timer
  const autoExpandRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply day rules + Abo-Baustellen automation on mount (einmalig pro Session)
  useEffect(() => {
    applyDayRules();
    applyAboBaustellen();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Row toggle ──────────────────────────────────────────────────────────────
  const toggleRow = useCallback((key: RowKey) => {
    setRowState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveRowState(next);
      return next;
    });
  }, []);

  // ── Auto-Expand bei Drag-Over über kollabierte Reihe ───────────────────────
  useEffect(() => {
    // Cleanup laufenden Timer
    if (autoExpandRef.current) {
      clearTimeout(autoExpandRef.current);
      autoExpandRef.current = null;
    }

    if (!activeCard || !hoveredDropZone) return;

    // Welche Reihe gehört zu diesem Pool?
    const row = ROW_GROUPS.find((r) => (r.pools as readonly string[]).includes(hoveredDropZone));
    if (!row) return;

    const rowKey = row.key as RowKey;
    if (rowState[rowKey]) return; // Reihe ist bereits offen

    autoExpandRef.current = setTimeout(() => {
      setRowState((prev) => {
        const next = { ...prev, [rowKey]: true };
        saveRowState(next);
        return next;
      });
    }, 300);

    return () => {
      if (autoExpandRef.current) {
        clearTimeout(autoExpandRef.current);
        autoExpandRef.current = null;
      }
    };
  }, [hoveredDropZone, activeCard, rowState]);

  // ── Sensors ─────────────────────────────────────────────────────────────────
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // ── Invalid zones berechnen ─────────────────────────────────────────────────
  const computeInvalidZones = useCallback(
    (card: CardData): Set<string> => {
      const invalid = new Set<string>();
      const allTargets = poolConfigs.map((p) => p.id);

      for (const targetId of allTargets) {
        let allowed: boolean;
        if (card.kind === 'personnel') {
          allowed = isDropAllowed('personnel', card.role, null, null, targetId);
        } else {
          const equip = equipment.find((e) => e.id === card.id);
          allowed = isDropAllowed(
            'equipment',
            null,
            card.category,
            equip?.resourceCategory || null,
            targetId
          );
        }
        if (!allowed) {
          invalid.add(targetId);
        }
      }

      return invalid;
    },
    [equipment]
  );

  // ── Drag Handlers ───────────────────────────────────────────────────────────
  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;

    // Spalten-Drag: frueh raus, BEVOR computeInvalidZones laeuft. Sonst
    // wuerden beim Umsortieren die Pools ausgrauen und rot markiert.
    if (data?.type === 'column') {
      setActiveColumnId(data.baustelleId as string);
      return;
    }

    if (data && 'kind' in data) {
      const card = data as CardData;
      setActiveCard(card);
      setInvalidDropZones(computeInvalidZones(card));
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { over, active } = event;
    // Beim Spalten-Drag keinen Pool blau aufleuchten lassen
    if (active.data.current?.type === 'column') {
      setHoveredDropZone(null);
      return;
    }
    setHoveredDropZone(over ? (over.id as string) : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const draggedColumnId = activeColumnId;
    const currentCard = activeCard;
    setActiveColumnId(null);
    setActiveCard(null);
    setInvalidDropZones(new Set());
    setHoveredDropZone(null);

    const { active, over } = event;
    if (!over) return;
    const targetId = over.id as string;

    // ─── Zweig 1: Spalte umsortieren ───
    if (draggedColumnId) {
      if (targetId === draggedColumnId) return;
      // Nur echte Streifen-Spalten sind Sortierziele. Kurzfristige Karten und
      // archivierte Baustellen stehen zwar in `baustellen`, aber nicht im
      // Streifen – ein Drop dort wuerde die gezogene Spalte an eine
      // unsichtbare Position schieben und den ganzen Streifen umsortieren.
      const ziel = baustellen.find((b) => b.id === targetId);
      if (!ziel || !isStreifenBaustelle(ziel)) return;
      moveBaustelleBefore(draggedColumnId, targetId);
      return;
    }

    // ─── Zweig 2: Ressource verschieben ───
    if (!currentCard) return;
    // Erst hier gueltig: bei einem Spalten-Drag waere active.id "col:bv3"
    const activeId = active.id as string;

    // ─── Validierung ───
    let validationResult;
    if (currentCard.kind === 'personnel') {
      validationResult = validateDrop('personnel', currentCard.role, null, null, targetId);
    } else {
      const equip = equipment.find((e) => e.id === currentCard.id);
      validationResult = validateDrop(
        'equipment',
        null,
        currentCard.category,
        equip?.resourceCategory || null,
        targetId
      );
    }

    if (!validationResult.valid) {
      showToast(validationResult.reason, 'error');
      return;
    }

    // ─── Auto-absent Warnung ───
    if (currentCard.kind === 'personnel' && currentCard.autoAbsent) {
      const isBaustelle = baustellen.some((b) => b.id === targetId);
      if (isBaustelle) {
        const person = personnel.find((p) => p.id === activeId);
        const confirmed = window.confirm(
          `${person?.lastName}, ${person?.firstName} ist heute automatisch abwesend (Regel). Trotzdem auf die Baustelle setzen?`
        );
        if (!confirmed) return;
      }
    }

    // ─── Drop ausführen ───
    if (targetId === 'aufraumen') {
      if (currentCard.kind === 'personnel') {
        cleanUpPersonnel(activeId);
      } else {
        cleanUpEquipment(activeId);
      }
    } else {
      if (currentCard.kind === 'personnel') {
        movePersonnel(activeId, targetId);
      } else {
        moveEquipment(activeId, targetId);
      }
    }
  }

  function handleDragCancel() {
    setActiveColumnId(null);
    setActiveCard(null);
    setInvalidDropZones(new Set());
    setHoveredDropZone(null);
  }

  const activeBaustellen = baustellen.filter(isStreifenBaustelle);
  const kurzfristigeBaustellen = baustellen.filter(isKurzfristig);
  const archivedBaustellen = baustellen.filter((b) => b.status === 'Archiviert');
  const draggedColumn = activeColumnId
    ? baustellen.find((b) => b.id === activeColumnId) ?? null
    : null;

  const handleUpdateNotes = useCallback(
    (id: string, notes: string) => {
      updateBaustelle(id, { notes });
    },
    [updateBaustelle]
  );

  const handleKurzfristigCreate = useCallback(
    (b: Baustelle) => {
      addBaustelle(b);
    },
    [addBaustelle]
  );

  const handleKurzfristigDelete = useCallback(
    (id: string) => {
      // In aller Regel ein Leerlauf – kurzfristige Karten haben keine
      // Plan-Ablage. Trotzdem aufrufen: ueber Snapshot-Wiederherstellung und
      // Cloud-Sync kann ein solcher Datensatz Anhaenge mitbringen, und die
      // Muellabfuhr laeuft nur einmal pro Sitzung mit Schonfrist.
      // Blobs zuerst, dann der Datensatz.
      void fileStore.removeByBaustelle(id);
      removeBaustelle(id);
    },
    [removeBaustelle]
  );

  const handleUpdateAttachments = useCallback(
    (id: string, attachments: BaustelleAttachment[]) => {
      updateBaustelle(id, { attachments });
    },
    [updateBaustelle]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Baustellen + zwei feste Spalten
          Dreiteilig: links der waagrecht scrollende Streifen, dann die
          Kurzfristig-Spalte, rechts die KFZ-Termine – beide als Geschwister.
          `minWidth: 0` auf dem Scroller ist tragend: beide festen Spalten sind
          flex-shrink 0, aller Schrumpfdruck landet also auf dem Streifen, und
          nur mit minWidth 0 schrumpft ein Flex-Element unter seine
          Inhaltsbreite – sonst erscheint die Scrollleiste nie. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 12,
          padding: '16px 16px 8px',
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              paddingBottom: 8,
              minWidth: 'min-content',
            }}
          >
          {activeBaustellen.map((b) => (
            <BaustelleColumn
              key={b.id}
              baustelle={b}
              personnel={personnel.filter((p) => p.assignedTo === b.id)}
              equipment={equipment.filter((e) => e.assignedTo === b.id)}
              isBlocked={invalidDropZones.has(b.id)}
              onUpdateNotes={handleUpdateNotes}
              onUpdateAttachments={handleUpdateAttachments}
              headerExtras={<ColumnControls baustelle={b} onArchive={archiveBaustelle} />}
            />
          ))}
          </div>
        </div>

        <KurzfristigColumn
          baustellen={kurzfristigeBaustellen}
          personnel={personnel}
          equipment={equipment}
          onCreate={handleKurzfristigCreate}
          onUpdateNotes={handleUpdateNotes}
          onConvert={convertKurzfristig}
          onDelete={handleKurzfristigDelete}
        />

        <KfzTermineColumn equipment={equipment} />
      </div>

      {/* Archiv */}
      <ArchivStrip archived={archivedBaustellen} onRestore={unarchiveBaustelle} />

      {/* Aufräumen Zone */}
      <div style={{ padding: '8px 16px' }}>
        <CleanUpZone />
      </div>

      {/* Pool-Reihen */}
      <div style={{ padding: '8px 16px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {ROW_GROUPS.map((row) => {
          const rowKey = row.key as RowKey;
          const isOpen = rowState[rowKey];
          const rowPools = poolConfigs.filter((pc) =>
            (row.pools as readonly string[]).includes(pc.id)
          );

          return (
            <div key={rowKey}>
              <RowToggleBar open={isOpen} onToggle={() => toggleRow(rowKey)} />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                {rowPools.map((pc) => (
                  <PoolSection
                    key={pc.id}
                    config={pc}
                    personnel={personnel.filter((p) => p.assignedTo === pc.id)}
                    equipment={equipment.filter((e) => e.assignedTo === pc.id)}
                    isOpen={isOpen}
                    isBlocked={invalidDropZones.has(pc.id)}
                    isBlockedHover={hoveredDropZone === pc.id && invalidDropZones.has(pc.id)}
                    isDragging={activeCard !== null}
                    onToggle={() => toggleRow(rowKey)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {draggedColumn ? (
          <ColumnDragPreview
            baustelle={draggedColumn}
            personnelCount={personnel.filter((p) => p.assignedTo === draggedColumn.id).length}
            equipmentCount={equipment.filter((e) => e.assignedTo === draggedColumn.id).length}
          />
        ) : activeCard ? (
          <ResourceCard data={activeCard} overlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
