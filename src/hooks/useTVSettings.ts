import { useState, useEffect, useCallback } from 'react';
import type { TVSettings } from '../types/tvSettings';
import { DEFAULT_TV_SETTINGS, TV_SETTINGS_KEY } from '../types/tvSettings';

// ─── Deep merge (for backward-compat when adding new settings) ───────────────
function deepMerge(defaults: unknown, saved: unknown): unknown {
  if (
    typeof defaults !== 'object' || typeof saved !== 'object' ||
    defaults === null || saved === null ||
    Array.isArray(defaults) || Array.isArray(saved)
  ) {
    return saved !== undefined ? saved : defaults;
  }
  const result: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
  for (const key of Object.keys(saved as Record<string, unknown>)) {
    result[key] = deepMerge(
      (defaults as Record<string, unknown>)[key],
      (saved as Record<string, unknown>)[key]
    );
  }
  return result;
}

function loadFromStorage(): TVSettings {
  try {
    const raw = localStorage.getItem(TV_SETTINGS_KEY);
    if (!raw) return DEFAULT_TV_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<TVSettings>;
    return deepMerge(DEFAULT_TV_SETTINGS, parsed) as TVSettings;
  } catch {
    return DEFAULT_TV_SETTINGS;
  }
}

// ─── Used in App.tsx (dispatcher) ────────────────────────────────────────────
export function useTVSettings() {
  const [settings, setSettings] = useState<TVSettings>(loadFromStorage);

  const updateSection = useCallback(
    <K extends keyof TVSettings>(section: K, updates: Partial<TVSettings[K]>) => {
      setSettings((prev) => {
        const next: TVSettings = {
          ...prev,
          [section]: { ...prev[section], ...updates },
        };
        localStorage.setItem(TV_SETTINGS_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const resetSettings = useCallback(() => {
    localStorage.setItem(TV_SETTINGS_KEY, JSON.stringify(DEFAULT_TV_SETTINGS));
    setSettings(DEFAULT_TV_SETTINGS);
  }, []);

  return { settings, updateSection, resetSettings };
}

// ─── Used in TVView.tsx (TV tab, listens for cross-tab changes) ───────────────
export function useTVSettingsListener(): TVSettings {
  const [settings, setSettings] = useState<TVSettings>(loadFromStorage);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === TV_SETTINGS_KEY) {
        setSettings(loadFromStorage());
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return settings;
}
