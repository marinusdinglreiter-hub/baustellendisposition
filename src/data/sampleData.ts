import type { Baustelle, Personnel, Equipment } from '../types';

export const sampleBaustellen: Baustelle[] = [
  {
    id: 'bv1', name: 'BV Sonnenhang', address: '', status: 'Aktiv', client: '',
    notes: '', startDate: '2026-01-01', endDate: '2026-12-31', color: '#2563eb', createdAt: '2026-01-01',
  },
  {
    id: 'bv2', name: 'BV Lindenstraße', address: '', status: 'Aktiv', client: '',
    notes: '', startDate: '2026-01-01', endDate: '2026-12-31', color: '#dc2626', createdAt: '2026-01-01',
  },
  {
    id: 'bv3', name: 'BV Parkweg', address: '', status: 'Aktiv', client: '',
    notes: '', startDate: '2026-01-01', endDate: '2026-12-31', color: '#059669', createdAt: '2026-01-01',
  },
  {
    id: 'bv4', name: 'BV Kirchplatz', address: '', status: 'Aktiv', client: '',
    notes: '', startDate: '2026-01-01', endDate: '2026-12-31', color: '#7c3aed', createdAt: '2026-01-01',
  },
  {
    id: 'bv5', name: 'BV Seeufer', address: '', status: 'Aktiv', client: '',
    notes: '', startDate: '2026-01-01', endDate: '2026-12-31', color: '#d97706', createdAt: '2026-01-01',
  },
  {
    id: 'bv6', name: 'BV Mühlbach', address: '', status: 'Aktiv', client: '',
    notes: '', startDate: '2026-01-01', endDate: '2026-12-31', color: '#0891b2', createdAt: '2026-01-01',
  },
  {
    id: 'bv7', name: 'BV Freizeitpark Nord', address: '', status: 'Aktiv', client: '',
    notes: '', startDate: '2026-01-01', endDate: '2026-12-31', color: '#be185d', createdAt: '2026-01-01',
  },
  {
    id: 'bv8', name: 'BV divers', address: '', status: 'Aktiv', client: '',
    notes: '', startDate: '2026-01-01', endDate: '2026-12-31', color: '#4f46e5', createdAt: '2026-01-01',
  },
  {
    id: 'bv9', name: 'Pflege', address: '', status: 'Aktiv', client: '',
    notes: '', startDate: '2026-01-01', endDate: '2026-12-31', color: '#047857', createdAt: '2026-01-01',
  },
];

export const samplePersonnel: Personnel[] = [
  // Bauleitung
  {
    id: 'p1', firstName: 'Thomas', lastName: 'Berger', role: 'Bauleitung',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },
  {
    id: 'p2', firstName: 'Julia', lastName: 'Hofmann', role: 'Bauleitung',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },
  {
    id: 'p3', firstName: 'Markus', lastName: 'Lehner', role: 'Bauleitung',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },

  // Vorarbeiter
  {
    id: 'p4', firstName: 'Stefan', lastName: 'Wagner', role: 'Vorarbeiter',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },
  {
    id: 'p5', firstName: 'Andreas', lastName: 'Huber', role: 'Vorarbeiter',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },
  {
    id: 'p6', firstName: 'Tobias', lastName: 'Fischer', role: 'Vorarbeiter',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },
  {
    id: 'p7', firstName: 'Florian', lastName: 'Maier', role: 'Vorarbeiter',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },
  {
    id: 'p8', firstName: 'Lukas', lastName: 'Schneider', role: 'Vorarbeiter',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },

  // Facharbeiter
  {
    id: 'p9', firstName: 'Milan', lastName: 'Novak', role: 'Facharbeiter',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },
  {
    id: 'p10', firstName: 'Ardit', lastName: 'Krasniqi', role: 'Facharbeiter',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },
  {
    id: 'p11', firstName: 'Besnik', lastName: 'Hoxha', role: 'Facharbeiter',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },
  {
    id: 'p12', firstName: 'Emir', lastName: 'Kovač', role: 'Facharbeiter',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },
  {
    id: 'p13', firstName: 'Georg', lastName: 'Brandl', role: 'Facharbeiter',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },
  {
    id: 'p14', firstName: 'Daniel', lastName: 'Wolf', role: 'Facharbeiter',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },
  {
    id: 'p15', firstName: 'Arben', lastName: 'Gashi', role: 'Facharbeiter',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },
  {
    id: 'p16', firstName: 'Driton', lastName: 'Berisha', role: 'Facharbeiter',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },

  // Azubis
  {
    id: 'p17', firstName: 'Felix', lastName: 'Schuster', role: 'Azubi',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },
  {
    id: 'p18', firstName: 'Jonas', lastName: 'Keller', role: 'Azubi',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },
  {
    id: 'p19', firstName: 'Simon', lastName: 'Roth', role: 'Azubi',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },
  {
    id: 'p20', firstName: 'Moritz', lastName: 'Engel', role: 'Azubi',
    phone: '', notes: '', assignedTo: 'verfuegbar',
    recurringRules: [], autoAbsent: false, createdAt: '2026-01-01',
  },
];

export const sampleEquipment: Equipment[] = [
  // Fahrzeuge
  {
    id: 'f1', name: 'MB Doka Pritsche', category: 'Fahrzeug', resourceCategory: 'fahrzeug',
    licensePlate: 'M-NO 4394', notes: '', status: 'verfuegbar', assignedTo: 'fuhrpark', createdAt: '2026-01-01',
  },
  {
    id: 'f2', name: 'MB Doka Pritsche', category: 'Fahrzeug', resourceCategory: 'fahrzeug',
    licensePlate: 'M-W 7503', notes: '', status: 'verfuegbar', assignedTo: 'fuhrpark', createdAt: '2026-01-01',
  },
  {
    id: 'f3', name: 'MB Doka Pritsche', category: 'Fahrzeug', resourceCategory: 'fahrzeug',
    licensePlate: 'M-J 6846', notes: '', status: 'verfuegbar', assignedTo: 'fuhrpark', createdAt: '2026-01-01',
  },
  {
    id: 'f4', name: 'MB Doka Planwagen', category: 'Fahrzeug', resourceCategory: 'fahrzeug',
    licensePlate: 'MU-V 966', notes: '', status: 'verfuegbar', assignedTo: 'fuhrpark', createdAt: '2026-01-01',
  },
  {
    id: 'f5', name: 'MB Doka Planwagen', category: 'Fahrzeug', resourceCategory: 'fahrzeug',
    licensePlate: 'M-BV 1966', notes: '', status: 'verfuegbar', assignedTo: 'fuhrpark', createdAt: '2026-01-01',
  },
  {
    id: 'f6', name: 'MB Doka Planwagen', category: 'Fahrzeug', resourceCategory: 'fahrzeug',
    licensePlate: 'M-ST 5110', notes: '', status: 'verfuegbar', assignedTo: 'fuhrpark', createdAt: '2026-01-01',
  },
  {
    id: 'f7', name: 'MB Eka Pritsche', category: 'Fahrzeug', resourceCategory: 'fahrzeug',
    licensePlate: 'M-AX 9022', notes: '', status: 'verfuegbar', assignedTo: 'fuhrpark', createdAt: '2026-01-01',
  },
  {
    id: 'f8', name: 'MB Selbstlader', category: 'LKW', resourceCategory: 'fahrzeug',
    licensePlate: 'M-J 6822', notes: '', status: 'verfuegbar', assignedTo: 'fuhrpark', createdAt: '2026-01-01',
  },
  {
    id: 'f9', name: 'Fuso Abrollkipper', category: 'LKW', resourceCategory: 'fahrzeug',
    licensePlate: 'M-J 6865', notes: '', status: 'verfuegbar', assignedTo: 'fuhrpark', createdAt: '2026-01-01',
  },
  {
    id: 'f10', name: 'Schmid Tieflader', category: 'Anhänger', resourceCategory: 'fahrzeug',
    licensePlate: 'M-J 6832', notes: '', status: 'verfuegbar', assignedTo: 'fuhrpark', createdAt: '2026-01-01',
  },
  {
    id: 'f11', name: 'Schmid Anhänger Kipper', category: 'Anhänger', resourceCategory: 'fahrzeug',
    licensePlate: 'M-IO 2930', notes: '', status: 'verfuegbar', assignedTo: 'fuhrpark', createdAt: '2026-01-01',
  },

  // Maschinen
  {
    id: 'm1', name: 'Kubota U10', category: 'Minibagger', resourceCategory: 'maschine',
    licensePlate: '', notes: 'Nr.1 Mikrobagger 1 to', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
  {
    id: 'm2', name: 'Kubota U10-3', category: 'Minibagger', resourceCategory: 'maschine',
    licensePlate: '', notes: 'Nr.2 Mikrobagger 1 to', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
  {
    id: 'm3', name: 'Kubota U10-5', category: 'Minibagger', resourceCategory: 'maschine',
    licensePlate: '', notes: 'Nr.3 Mikrobagger 1 to', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
  {
    id: 'm4', name: 'Kubota KX019-4', category: 'Minibagger', resourceCategory: 'maschine',
    licensePlate: '', notes: 'Nr.1 Minibagger 2 to', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
  {
    id: 'm5', name: 'Kubota KX019-4+', category: 'Minibagger', resourceCategory: 'maschine',
    licensePlate: '', notes: 'Nr.2 Minibagger 2 to', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
  {
    id: 'm6', name: 'Kubota Kompaktbagger', category: 'Bagger', resourceCategory: 'maschine',
    licensePlate: '', notes: '5,5 to', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
  {
    id: 'm7', name: 'Schäffer 2445 SLT', category: 'Radlader', resourceCategory: 'maschine',
    licensePlate: '', notes: 'Hoftrac', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
  {
    id: 'm8', name: 'Zettlmeyer ZL602', category: 'Radlader', resourceCategory: 'maschine',
    licensePlate: '', notes: 'Radlader grün', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
  {
    id: 'm9', name: 'Zettlmeyer ZL601', category: 'Radlader', resourceCategory: 'maschine',
    licensePlate: '', notes: 'Radlader weiß', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
  {
    id: 'm10', name: 'Dieci Mini Agri20.4 smart', category: 'Radlader', resourceCategory: 'maschine',
    licensePlate: '', notes: 'Teleskoplader', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
  {
    id: 'm11', name: 'Kubota R065', category: 'Radlader', resourceCategory: 'maschine',
    licensePlate: '', notes: 'Radlader orange', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
  {
    id: 'm12', name: 'Dumper', category: 'Dumper', resourceCategory: 'maschine',
    licensePlate: '', notes: '', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },

  // Geräte
  {
    id: 'g1', name: 'Rüttelplatte 80 kg', category: 'Rüttelplatte', resourceCategory: 'maschine',
    licensePlate: '', notes: '', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
  {
    id: 'g2', name: 'Rüttelplatte 250 kg Nr.1', category: 'Rüttelplatte', resourceCategory: 'maschine',
    licensePlate: '', notes: '', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
  {
    id: 'g3', name: 'Rüttelplatte 250 kg Nr.2', category: 'Rüttelplatte', resourceCategory: 'maschine',
    licensePlate: '', notes: '', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
  {
    id: 'g4', name: 'Rüttelplatte 800 kg', category: 'Rüttelplatte', resourceCategory: 'maschine',
    licensePlate: '', notes: '', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
  {
    id: 'g5', name: 'Stampfer grün Nr.1', category: 'Sonstige Maschine', resourceCategory: 'maschine',
    licensePlate: '', notes: '', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
  {
    id: 'g6', name: 'Stampfer grün Nr.2', category: 'Sonstige Maschine', resourceCategory: 'maschine',
    licensePlate: '', notes: '', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
  {
    id: 'g7', name: 'Stampfer gelb Nr.3', category: 'Sonstige Maschine', resourceCategory: 'maschine',
    licensePlate: '', notes: '', status: 'verfuegbar', assignedTo: 'maschinenpark', createdAt: '2026-01-01',
  },
];
