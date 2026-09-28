export interface TVSettings {
  anzeige: {
    uhrzeit: boolean;
    datum: boolean;
    mitarbeiterRolle: boolean;
    kennzeichen: boolean;
    maschinenbezeichnung: boolean;
    leereBaustellen: boolean;
    notizen: boolean;
    dateien: boolean;
  };
  blaettern: {
    aktiv: boolean;
    intervallSekunden: number;
    fadeUebergang: boolean;
    seitenanzahl: boolean;
  };
  live: {
    aktiv: boolean;
    visuellosFeedback: boolean;
    verbindungsdot: boolean;
    pollingIntervall: number;
  };
  darstellung: {
    hintergrund: 'schwarz' | 'dunkelgrau';
    schriftgroesse: number; // 75–150 (Prozent)
    schriftfarbe: 'weiss' | 'hellgrau';
    trennlinien: boolean;
  };
  sonstiges: {
    cursorVerstecken: boolean;
    vollbildAuto: boolean;
    qrCode: boolean;
  };
}

export const DEFAULT_TV_SETTINGS: TVSettings = {
  anzeige: {
    uhrzeit: true,
    datum: true,
    mitarbeiterRolle: true,
    kennzeichen: true,
    maschinenbezeichnung: true,
    leereBaustellen: false,
    notizen: true,
    dateien: true,
  },
  blaettern: {
    aktiv: true,
    intervallSekunden: 8,
    fadeUebergang: true,
    seitenanzahl: true,
  },
  live: {
    aktiv: true,
    visuellosFeedback: true,
    verbindungsdot: true,
    pollingIntervall: 10,
  },
  darstellung: {
    hintergrund: 'dunkelgrau',
    schriftgroesse: 100,
    schriftfarbe: 'weiss',
    trennlinien: true,
  },
  sonstiges: {
    cursorVerstecken: true,
    vollbildAuto: true,
    qrCode: false,
  },
};

export const TV_SETTINGS_KEY = 'hallenansicht_einstellungen';
export const TV_BROADCAST_CHANNEL = 'disposition-halle';
