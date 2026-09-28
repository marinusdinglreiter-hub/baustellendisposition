import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Baustelle, Personnel, Equipment, RecurringRule, PoolId, AboBaustelle, AboCreatedMarker, SnapshotData } from '../types';
import { getDefaultPoolForCategory, generateId } from '../types';
import { validateDrop } from '../types/validation';
import { sampleBaustellen, samplePersonnel, sampleEquipment } from '../data/sampleData';
import {
  normalizeBaustellen,
  normalizePersonnelList,
  normalizeEquipmentList,
  normalizeSnapshot,
} from '../utils/normalize';
import { isAdminUnlocked, DEFAULT_ADMIN_PIN } from '../utils/adminLock';

/** Schluessel des zustand-persist-Eintrags. Wird auch vom /tv-Tab gebraucht. */
export const STORAGE_KEY = 'baustellendisposition-storage';

interface AppState {
  // Data
  baustellen: Baustelle[];
  personnel: Personnel[];
  equipment: Equipment[];

  // Abo-Baustellen
  aboBaustellen: AboBaustelle[];
  aboCreatedMarkers: AboCreatedMarker[];

  /**
   * PIN fuer die Verwaltung. Liegt bewusst NEBEN den Daten und nicht in
   * SnapshotData – takeSnapshot und writeSyncFile schreiben ausschliesslich
   * ein SnapshotData, die PIN wandert also nie in die Sync-Datei und wird
   * von restoreSnapshot nie ueberschrieben. Sie gilt damit pro Geraet.
   */
  adminPin: string;
  setAdminPin: (pin: string) => void;

  // Navigation
  currentView: 'disposition' | 'verwaltung';
  adminTab: 'personal' | 'equipment' | 'baustellen' | 'abo' | 'verlauf';
  setView: (view: 'disposition' | 'verwaltung') => void;
  setAdminTab: (tab: 'personal' | 'equipment' | 'baustellen' | 'abo' | 'verlauf') => void;

  // Personnel CRUD
  addPersonnel: (p: Personnel) => void;
  updatePersonnel: (id: string, updates: Partial<Personnel>) => void;
  removePersonnel: (id: string) => void;

  // Equipment CRUD
  addEquipment: (e: Equipment) => void;
  updateEquipment: (id: string, updates: Partial<Equipment>) => void;
  removeEquipment: (id: string) => void;

  // Baustellen CRUD
  addBaustelle: (b: Baustelle) => void;
  updateBaustelle: (id: string, updates: Partial<Baustelle>) => void;
  removeBaustelle: (id: string) => void;
  archiveBaustelle: (id: string) => void;
  unarchiveBaustelle: (id: string) => void;
  /** Verschiebt die Spalte `draggedId` an die Position von `targetId`. */
  moveBaustelleBefore: (draggedId: string, targetId: string) => void;
  /** Macht aus einer kurzfristigen Karte eine normale Baustelle.
   *  Ressourcen bleiben zugeordnet – der Datensatz behaelt seine id. */
  convertKurzfristig: (id: string) => void;

  // Move operations (with validation)
  movePersonnel: (id: string, targetId: string) => void;
  moveEquipment: (id: string, targetId: string) => void;

  // Sanitize: fix invalid assignments in state
  sanitizeAssignments: () => { personnelFixed: number; equipmentFixed: number };

  // Cleanup
  cleanUpPersonnel: (id: string) => void;
  cleanUpEquipment: (id: string) => void;
  cleanUpBaustelle: (baustelleId: string) => void;

  // Day rules
  applyDayRules: () => void;

  // Recurring rules CRUD
  addRule: (personnelId: string, rule: RecurringRule) => void;
  removeRule: (personnelId: string, ruleId: string) => void;

  // Abo-Baustellen CRUD
  addAboBaustelle: (abo: AboBaustelle) => void;
  updateAboBaustelle: (id: string, updates: Partial<AboBaustelle>) => void;
  removeAboBaustelle: (id: string) => void;

  // Abo automation: call once per day on app load
  applyAboBaustellen: () => void;

  // Reset
  resetData: () => void;

  // Snapshot restore
  restoreSnapshot: (data: SnapshotData) => void;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      baustellen: normalizeBaustellen(sampleBaustellen),
      personnel: normalizePersonnelList(samplePersonnel),
      equipment: normalizeEquipmentList(sampleEquipment),
      aboBaustellen: [],
      aboCreatedMarkers: [],

      adminPin: DEFAULT_ADMIN_PIN,
      setAdminPin: (pin) => set({ adminPin: pin }),

      currentView: 'disposition',
      adminTab: 'personal',

      setView: (view) => set({ currentView: view }),
      setAdminTab: (tab) => set({ adminTab: tab }),

      // Personnel CRUD
      addPersonnel: (p) =>
        set((state) => ({ personnel: [...state.personnel, p] })),

      updatePersonnel: (id, updates) =>
        set((state) => ({
          personnel: state.personnel.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      removePersonnel: (id) =>
        set((state) => ({
          personnel: state.personnel.filter((p) => p.id !== id),
        })),

      // Equipment CRUD
      addEquipment: (e) =>
        set((state) => ({
          equipment: normalizeEquipmentList([...state.equipment, e]),
        })),

      updateEquipment: (id, updates) =>
        set((state) => ({
          equipment: normalizeEquipmentList(
            state.equipment.map((e) => (e.id === id ? { ...e, ...updates } : e))
          ),
        })),

      removeEquipment: (id) =>
        set((state) => ({
          equipment: state.equipment.filter((e) => e.id !== id),
        })),

      // Baustellen CRUD
      addBaustelle: (b) =>
        set((state) => ({
          baustellen: normalizeBaustellen([...state.baustellen, b]),
        })),

      updateBaustelle: (id, updates) =>
        set((state) => ({
          baustellen: state.baustellen.map((b) =>
            b.id === id ? { ...b, ...updates } : b
          ),
        })),

      removeBaustelle: (id) =>
        set((state) => ({
          baustellen: state.baustellen.filter((b) => b.id !== id),
          personnel: state.personnel.map((p) =>
            p.assignedTo === id ? { ...p, assignedTo: 'verfuegbar' as PoolId } : p
          ),
          equipment: state.equipment.map((e) =>
            e.assignedTo === id
              ? { ...e, assignedTo: getDefaultPoolForCategory(e.resourceCategory) }
              : e
          ),
        })),

      archiveBaustelle: (id) =>
        set((state) => ({
          baustellen: state.baustellen.map((b) =>
            b.id === id ? { ...b, status: 'Archiviert' as const } : b
          ),
          personnel: state.personnel.map((p) =>
            p.assignedTo === id ? { ...p, assignedTo: 'verfuegbar' as PoolId } : p
          ),
          equipment: state.equipment.map((e) =>
            e.assignedTo === id
              ? { ...e, assignedTo: getDefaultPoolForCategory(e.resourceCategory) }
              : e
          ),
        })),

      unarchiveBaustelle: (id) =>
        set((state) => {
          const max = Math.max(-1, ...state.baustellen.map((b) => b.sortOrder ?? -1));
          return {
            baustellen: normalizeBaustellen(
              state.baustellen.map((b) =>
                b.id === id ? { ...b, status: 'Aktiv' as const, sortOrder: max + 1 } : b
              )
            ),
          };
        }),

      moveBaustelleBefore: (draggedId, targetId) =>
        set((state) => {
          // state.baustellen ist durch den Normalisierer bereits sortiert
          const list = [...state.baustellen];
          const from = list.findIndex((b) => b.id === draggedId);
          const to = list.findIndex((b) => b.id === targetId);
          if (from < 0 || to < 0 || from === to) return state;
          const [moved] = list.splice(from, 1);
          list.splice(to, 0, moved);
          return { baustellen: list.map((b, i) => ({ ...b, sortOrder: i })) };
        }),

      convertKurzfristig: (id) =>
        set((state) => {
          const ziel = state.baustellen.find((b) => b.id === id);
          if (!ziel || ziel.kurzfristig !== true) return state; // doppelklicksicher
          // Ans rechte Ende des Streifens – mitten hinein wuerde jede andere
          // Spalte am Vormittag um eine Position verschieben.
          const max = Math.max(-1, ...state.baustellen.map((b) => b.sortOrder ?? -1));
          return {
            baustellen: normalizeBaustellen(
              state.baustellen.map((b) =>
                b.id === id
                  ? { ...b, kurzfristig: false, status: 'Aktiv' as const, sortOrder: max + 1 }
                  : b
              )
            ),
          };
        }),

      // Move operations (with server-side validation as safety net)
      movePersonnel: (id, targetId) =>
        set((state) => {
          const person = state.personnel.find((p) => p.id === id);
          if (!person) return state;

          // Server-side validation
          const result = validateDrop('personnel', person.role, null, null, targetId);
          if (!result.valid) {
            console.warn(`[Store] Invalid move blocked: ${result.reason}`);
            return state; // silently reject
          }

          return {
            personnel: state.personnel.map((p) =>
              p.id === id ? { ...p, assignedTo: targetId, autoAbsent: false } : p
            ),
          };
        }),

      moveEquipment: (id, targetId) =>
        set((state) => {
          const equip = state.equipment.find((e) => e.id === id);
          if (!equip) return state;

          // Server-side validation
          const result = validateDrop('equipment', null, equip.category, equip.resourceCategory, targetId);
          if (!result.valid) {
            console.warn(`[Store] Invalid move blocked: ${result.reason}`);
            return state;
          }

          return {
            equipment: state.equipment.map((e) =>
              e.id === id ? { ...e, assignedTo: targetId } : e
            ),
          };
        }),

      // Sanitize: find and fix invalid assignments
      sanitizeAssignments: () => {
        let personnelFixed = 0;
        let equipmentFixed = 0;

        set((state) => {
          const baustelleIds = state.baustellen.map((b) => b.id);

          const newPersonnel = state.personnel.map((p) => {
            if (baustelleIds.includes(p.assignedTo)) return p;
            const result = validateDrop('personnel', p.role, null, null, p.assignedTo);
            if (result.valid) return p;
            personnelFixed++;
            return { ...p, assignedTo: 'verfuegbar' as PoolId };
          });

          const newEquipment = state.equipment.map((e) => {
            if (baustelleIds.includes(e.assignedTo)) return e;
            const result = validateDrop('equipment', null, e.category, e.resourceCategory, e.assignedTo);
            if (result.valid) return e;
            equipmentFixed++;
            return { ...e, assignedTo: getDefaultPoolForCategory(e.resourceCategory) };
          });

          return { personnel: newPersonnel, equipment: newEquipment };
        });

        return { personnelFixed, equipmentFixed };
      },

      // Cleanup
      cleanUpPersonnel: (id) =>
        set((state) => ({
          personnel: state.personnel.map((p) =>
            p.id === id ? { ...p, assignedTo: 'verfuegbar', autoAbsent: false } : p
          ),
        })),

      cleanUpEquipment: (id) =>
        set((state) => ({
          equipment: state.equipment.map((e) => {
            if (e.id !== id) return e;
            const pool = getDefaultPoolForCategory(e.resourceCategory);
            return { ...e, assignedTo: pool };
          }),
        })),

      cleanUpBaustelle: (baustelleId) =>
        set((state) => ({
          personnel: state.personnel.map((p) =>
            p.assignedTo === baustelleId
              ? { ...p, assignedTo: 'verfuegbar', autoAbsent: false }
              : p
          ),
          equipment: state.equipment.map((e) =>
            e.assignedTo === baustelleId
              ? { ...e, assignedTo: getDefaultPoolForCategory(e.resourceCategory) }
              : e
          ),
        })),

      // Apply day rules
      applyDayRules: () =>
        set((state) => {
          const now = new Date();
          const jsDay = now.getDay(); // 0=Sun, 1=Mon...
          const weekday = jsDay === 0 ? 6 : jsDay - 1; // 0=Mo, 1=Di... 6=So
          const todayStr = now.toISOString().split('T')[0];
          const weekNum = getWeekNumber(now);

          return {
            personnel: state.personnel.map((p) => {
              // Reset autoAbsent first
              let updated = { ...p, autoAbsent: false };

              for (const rule of p.recurringRules) {
                // Check date range
                if (todayStr < rule.validFrom || todayStr > rule.validUntil) continue;
                // Check weekday
                if (!rule.weekdays.includes(weekday)) continue;
                // Check pattern
                if (rule.pattern === 'biweekly' && weekNum % 2 !== 0) continue;
                // monthly not implemented

                // Rule matches - move to target pool
                updated = {
                  ...updated,
                  assignedTo: rule.targetPool,
                  autoAbsent: true,
                };
                break; // first matching rule wins
              }

              return updated;
            }),
          };
        }),

      // Recurring rules CRUD
      addRule: (personnelId, rule) =>
        set((state) => ({
          personnel: state.personnel.map((p) =>
            p.id === personnelId
              ? { ...p, recurringRules: [...p.recurringRules, rule] }
              : p
          ),
        })),

      removeRule: (personnelId, ruleId) =>
        set((state) => ({
          personnel: state.personnel.map((p) =>
            p.id === personnelId
              ? { ...p, recurringRules: p.recurringRules.filter((r) => r.id !== ruleId) }
              : p
          ),
        })),

      // ─── Abo-Baustellen CRUD ────────────────────────────────────────────

      addAboBaustelle: (abo) =>
        set((state) => ({ aboBaustellen: [...state.aboBaustellen, abo] })),

      updateAboBaustelle: (id, updates) =>
        set((state) => ({
          aboBaustellen: state.aboBaustellen.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),

      removeAboBaustelle: (id) =>
        set((state) => ({
          aboBaustellen: state.aboBaustellen.filter((a) => a.id !== id),
          // Marker für gelöschtes Abo ebenfalls entfernen
          aboCreatedMarkers: (state.aboCreatedMarkers ?? []).filter((m) => m.aboId !== id),
        })),

      // ─── Abo-Automatik ──────────────────────────────────────────────────

      applyAboBaustellen: () =>
        set((state) => {
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          // JS getDay(): 0=Sonntag, 1=Montag ... 6=Samstag
          const jsDayOfWeek = today.getDay();

          // UTC-Mitternacht für saubere Wochenberechnung
          const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

          const existingMarkers: AboCreatedMarker[] = state.aboCreatedMarkers ?? [];
          const newBaustellen: Baustelle[] = [];
          const newMarkers: AboCreatedMarker[] = [];

          for (const abo of state.aboBaustellen ?? []) {
            if (!abo.aktiv) continue;

            // Duplikat-Schutz
            const alreadyCreated = existingMarkers.some(
              (m) => m.aboId === abo.id && m.datum === todayStr
            );
            if (alreadyCreated) continue;

            // Wochentag prüfen (0=So, 1=Mo ... 6=Sa)
            if (jsDayOfWeek !== abo.wochentag) continue;

            // Gültigkeitszeitraum prüfen
            if (todayStr < abo.gueltigAb) continue;
            if (abo.gueltigBis && todayStr > abo.gueltigBis) continue;

            // Rhythmus prüfen: wie viele Wochen seit gueltigAb?
            const gueltigAbUTC = new Date(abo.gueltigAb + 'T00:00:00Z').getTime();
            const daysDiff = Math.round((todayUTC - gueltigAbUTC) / (24 * 60 * 60 * 1000));
            const weeksSinceStart = Math.floor(daysDiff / 7);
            if (weeksSinceStart % abo.rhythmus !== 0) continue;

            // ✓ Alle Bedingungen erfüllt → Baustelle automatisch anlegen
            const newBaustelle: Baustelle = {
              id: generateId(),
              name: abo.name,
              address: abo.adresse,
              status: 'Aktiv',
              client: abo.auftragsnummer,
              notes: abo.notizen,
              startDate: todayStr,
              endDate: todayStr,
              color: abo.color,
              createdAt: todayStr,
            };

            newBaustellen.push(newBaustelle);
            newMarkers.push({ aboId: abo.id, datum: todayStr });
          }

          if (newBaustellen.length === 0) return state;

          return {
            baustellen: normalizeBaustellen([...state.baustellen, ...newBaustellen]),
            aboCreatedMarkers: [...existingMarkers, ...newMarkers],
          };
        }),

      // Reset
      resetData: () =>
        set({
          baustellen: normalizeBaustellen(sampleBaustellen),
          personnel: normalizePersonnelList(samplePersonnel),
          equipment: normalizeEquipmentList(sampleEquipment),
          // Abo-Daten bleiben beim Reset erhalten
        }),

      // Snapshot restore: überschreibt den kompletten Datenstand
      restoreSnapshot: (data) => set(normalizeSnapshot(data)),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      /**
       * Durchreicher, aber unverzichtbar. Der bisherige Stand auf den
       * Rechnern im Betrieb wurde ohne `version` geschrieben, liegt also als
       * Version 0 im Speicher. Ohne `migrate` verwirft zustand beim ersten
       * Start der neuen Fassung den kompletten gespeicherten Stand und faellt
       * auf die Beispieldaten zurueck – die echten Baustellen waeren weg.
       * Die eigentliche Arbeit macht ohnehin `merge` darunter.
       */
      migrate: (persisted) => persisted as AppState,
      /**
       * `merge` statt `migrate`: laeuft bei JEDEM Rehydrieren, also auch bei
       * `persist.rehydrate()` aus dem /tv-Tab, und unabhaengig von der Version.
       * Damit muss bei einem kuenftigen neuen Feld niemand daran denken, die
       * Version hochzuzaehlen.
       *
       * ACHTUNG: zustand ruft `merge` auch beim allerersten Start auf, dann mit
       * `persisted === undefined`, und setzt das Ergebnis mit `replace = true`.
       * Jedes Feld muss deshalb einzeln auf `current` zurueckfallen – ein
       * pauschales `normalizeSnapshot(p)` wuerde die Startdaten ausloeschen.
       */
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...p,
          baustellen: normalizeBaustellen(p.baustellen ?? current.baustellen),
          personnel: normalizePersonnelList(p.personnel ?? current.personnel),
          equipment: normalizeEquipmentList(p.equipment ?? current.equipment),
          aboBaustellen: p.aboBaustellen ?? current.aboBaustellen ?? [],
          aboCreatedMarkers: p.aboCreatedMarkers ?? current.aboCreatedMarkers ?? [],
          adminPin: p.adminPin || DEFAULT_ADMIN_PIN,
          // Ein gesperrtes Geraet darf nicht direkt in der Verwaltung starten
          currentView:
            p.currentView === 'verwaltung' && !isAdminUnlocked()
              ? 'disposition'
              : p.currentView ?? 'disposition',
          adminTab: p.adminTab ?? 'personal',
        } as AppState;
      },
    }
  )
);
