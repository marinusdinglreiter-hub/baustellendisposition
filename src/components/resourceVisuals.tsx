/**
 * Der gemeinsame Symbol- und Farbkatalog fuer alle Ressourcenkarten.
 *
 * Personal: EIN Symbol fuer alle vier Rollen, unterschieden nur ueber vier
 * Gruentoene. Die Trennung `iconColor` / `color` ist dabei der Trick – ein
 * hellgruenes Symbol ist gut lesbar, hellgruener Text nicht.
 *
 * Fuhrpark: Farben bleiben grau wie bisher, nur die Symbole werden richtig.
 * Maschinenpark: eigenes Symbol fuer Bagger und Radlader, fuer den Rest ein
 * einheitliches Zahnrad – dafuer klar getrennte Farben.
 */
import type { ComponentType } from 'react';
import { HardHat, Truck, Cog } from 'lucide-react';
import type { EquipmentCategory, IconKey, PersonnelRole } from '../types';
import {
  PritscheIcon,
  PlanwagenIcon,
  AnhaengerIcon,
  BaggerIcon,
  RadladerIcon,
} from './icons';
import type { IconProps } from './icons';

export interface VisualConfig {
  /** Textfarbe – muss auf `bg` lesbar bleiben */
  color: string;
  /** Symbolfarbe – darf heller sein und traegt die Abstufung */
  iconColor: string;
  border: string;
  bg: string;
  Icon: ComponentType<IconProps>;
}

// ─── Personal: vier Gruentoene, ein Symbol ──────────────────────────────────

const PERSONNEL_VISUALS: Record<PersonnelRole, VisualConfig> = {
  Bauleitung:   { iconColor: '#14532d', color: '#14532d', border: '2px solid #14532d', bg: '#dcfce7', Icon: HardHat },
  Vorarbeiter:  { iconColor: '#166534', color: '#166534', border: '2px solid #22c55e', bg: '#e8f8ee', Icon: HardHat },
  Facharbeiter: { iconColor: '#16a34a', color: '#15803d', border: '2px solid #4ade80', bg: '#f0fdf4', Icon: HardHat },
  Azubi:        { iconColor: '#86efac', color: '#15803d', border: '2px solid #bbf7d0', bg: '#f7fef9', Icon: HardHat },
};

export function getPersonnelVisual(role: PersonnelRole): VisualConfig {
  return PERSONNEL_VISUALS[role] ?? PERSONNEL_VISUALS.Facharbeiter;
}

// ─── Fuhrpark und Maschinenpark ─────────────────────────────────────────────

const FUHRPARK_GREY = { color: '#404040', iconColor: '#525252', border: '2px solid #737373', bg: '#f5f5f5' };

export const VISUALS: Record<IconKey, VisualConfig> = {
  person: { ...PERSONNEL_VISUALS.Facharbeiter },

  // Fuhrpark – Farbe bleibt bewusst grau, nur die Symbole unterscheiden sich
  pritsche:  { ...FUHRPARK_GREY, Icon: PritscheIcon },
  planwagen: { ...FUHRPARK_GREY, Icon: PlanwagenIcon },
  anhaenger: { ...FUHRPARK_GREY, Icon: AnhaengerIcon },
  lkw:       { ...FUHRPARK_GREY, Icon: Truck },

  // Maschinenpark – hier traegt die Farbe die Unterscheidung
  bagger:     { color: '#92400e', iconColor: '#b45309', border: '2px solid #b45309', bg: '#fffbeb', Icon: BaggerIcon },
  minibagger: { color: '#b45309', iconColor: '#d97706', border: '2px solid #f59e0b', bg: '#fffdf5', Icon: BaggerIcon },
  radlader:   { color: '#075985', iconColor: '#0369a1', border: '2px solid #0284c7', bg: '#f0f9ff', Icon: RadladerIcon },
  dumper:     { color: '#7c2d12', iconColor: '#9a3412', border: '2px solid #c2410c', bg: '#fff7ed', Icon: Cog },
  ruettelplatte: { color: '#3f6212', iconColor: '#4d7c0f', border: '2px solid #65a30d', bg: '#f7fee7', Icon: Cog },
  'maschine-sonstige': { color: '#4b5563', iconColor: '#6b7280', border: '2px solid #9ca3af', bg: '#f9fafb', Icon: Cog },
};

const PLANWAGEN_RE = /planwagen|plane|koffer|kasten/i;
const PRITSCHE_RE = /pritsche|kipper|selbstlader/i;

/**
 * Pritsche und Planwagen unterscheiden sich nur im Namen, nicht in der
 * Kategorie. Die Heuristik laeuft deshalb beim Rendern – gespeichert wird
 * ein Symbol nur, wenn ein Mensch es in der Verwaltung bewusst auswaehlt.
 * So bleibt die Heuristik jederzeit verbesserbar und brennt sich nicht in
 * 30 Datensaetze ein, die dann auch noch ueber die Sync-Datei wandern.
 */
export function resolveIconKey(
  category: EquipmentCategory,
  name: string,
  override?: IconKey
): IconKey {
  if (override && override in VISUALS) return override;

  switch (category) {
    case 'LKW':
      return 'lkw';
    case 'Anhänger':
      return 'anhaenger';
    case 'Fahrzeug':
      if (PLANWAGEN_RE.test(name)) return 'planwagen';
      if (PRITSCHE_RE.test(name)) return 'pritsche';
      return 'pritsche';
    case 'Bagger':
      return 'bagger';
    case 'Minibagger':
      return 'minibagger';
    case 'Radlader':
      return 'radlader';
    case 'Rüttelplatte':
      return 'ruettelplatte';
    case 'Dumper':
      return 'dumper';
    default:
      return 'maschine-sonstige';
  }
}

export function getEquipmentVisual(
  category: EquipmentCategory,
  name: string,
  override?: IconKey
): VisualConfig {
  return VISUALS[resolveIconKey(category, name, override)];
}

/** Auswahlliste fuer das Symbol-Override in der Verwaltung */
export const ICON_KEY_LABELS: Record<IconKey, string> = {
  person: 'Person',
  pritsche: 'Pritsche',
  planwagen: 'Planwagen',
  anhaenger: 'Anhänger',
  lkw: 'LKW',
  bagger: 'Bagger',
  minibagger: 'Minibagger',
  radlader: 'Radlader',
  ruettelplatte: 'Rüttelplatte',
  dumper: 'Dumper',
  'maschine-sonstige': 'Maschine (allgemein)',
};

/** Nur die Symbole, die in der Geräteverwaltung Sinn ergeben */
export const EQUIPMENT_ICON_KEYS: IconKey[] = [
  'pritsche', 'planwagen', 'anhaenger', 'lkw',
  'bagger', 'minibagger', 'radlader', 'ruettelplatte', 'dumper', 'maschine-sonstige',
];
