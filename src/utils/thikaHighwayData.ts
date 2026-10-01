import { GasBrand, ThikaHighwayZone } from '../types';

export interface BrandDetail {
  id: GasBrand;
  name: string;
  distributor?: string;
  tagline: string;
  badge: string;
  color: string;
  borderColor: string;
  bgLight: string;
  valveType: string;
  isPopular?: boolean;
  cylinderSizes?: string[];
  isAvailable?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedReason?: string;
}

export const GAS_BRANDS_CONFIG: BrandDetail[] = [
  {
    id: 'TotalEnergies',
    name: 'TotalEnergies (Total Gas)',
    distributor: 'TotalEnergies Marketing Kenya Plc',
    tagline: 'Tamper-proof safety seal & high caloric efficiency',
    badge: 'Most Popular',
    color: '#E01E2B',
    borderColor: 'border-red-500',
    bgLight: 'bg-red-50',
    valveType: 'Screw & Pin Valve',
    cylinderSizes: ['6 kg', '13 kg', '50 kg'],
    isPopular: true,
    isAvailable: true
  },
  {
    id: 'Rubis (K-Gas)',
    name: 'Rubis (K-Gas)',
    distributor: 'Rubis Energy Kenya',
    tagline: 'KEBS certified low-odor pure flame fuel',
    badge: 'Household Choice',
    color: '#008542',
    borderColor: 'border-emerald-600',
    bgLight: 'bg-emerald-50',
    valveType: 'Standard Universal Compact',
    cylinderSizes: ['6 kg', '13 kg', '35 kg'],
    isPopular: true,
    isAvailable: true
  },
  {
    id: 'Afrigas (Shell)',
    name: 'Afrigas (Shell / Vivo)',
    distributor: 'Vivo Energy Kenya',
    tagline: 'Gold seal security valve with zero soot burn',
    badge: 'High Performance',
    color: '#FFD100',
    borderColor: 'border-amber-500',
    bgLight: 'bg-amber-50',
    valveType: 'Standard 20mm Compact',
    cylinderSizes: ['6 kg', '13 kg', '50 kg'],
    isPopular: true,
    isAvailable: true
  },
  {
    id: 'Pro Gas',
    name: 'Pro Gas',
    distributor: 'Proto Energy Limited',
    tagline: 'Reliable fast-boil LPG with leak-tested valves',
    badge: 'Fast Delivery',
    color: '#F97316',
    borderColor: 'border-orange-500',
    bgLight: 'bg-orange-50',
    valveType: 'Universal Quick-Click',
    cylinderSizes: ['6 kg', '13 kg'],
    isPopular: true,
    isAvailable: true
  },
  {
    id: 'Mpishi Gas',
    name: 'Mpishi Gas (SeaGas)',
    distributor: 'SeaGas Kenya Ltd',
    tagline: 'Eco-efficient blue flame with calibrated net cylinder weight',
    badge: 'Top Value',
    color: '#059669',
    borderColor: 'border-emerald-500',
    bgLight: 'bg-emerald-50',
    valveType: 'Standard Universal 20mm',
    cylinderSizes: ['6 kg', '13 kg'],
    isPopular: true,
    isAvailable: true
  },
  {
    id: 'Hashi Gas',
    name: 'Hashi Gas',
    distributor: 'Hashi Energy Holdings',
    tagline: 'Heavy-gauge steel certified for maximum domestic safety',
    badge: 'Economy Choice',
    color: '#0284C7',
    borderColor: 'border-sky-500',
    bgLight: 'bg-sky-50',
    valveType: 'Standard Pin Valve',
    cylinderSizes: ['6 kg', '13 kg'],
    isAvailable: true
  },
  {
    id: 'Supagas (National Oil)',
    name: 'Supagas (National Oil)',
    distributor: 'National Oil Corporation of Kenya (NOCK)',
    tagline: 'Government certified affordable and safe domestic LPG',
    badge: 'Govt Certified',
    color: '#16A34A',
    borderColor: 'border-green-600',
    bgLight: 'bg-green-50',
    valveType: 'Universal 20mm Compact',
    cylinderSizes: ['6 kg', '13 kg', '50 kg'],
    isAvailable: true
  },
  {
    id: 'Ola Energy (OiLGas)',
    name: 'Ola Energy (OiLGas)',
    distributor: 'Ola Energy Kenya Ltd',
    tagline: 'Ola premium domestic refill with calibrated net weight',
    badge: 'Certified Clean',
    color: '#2563EB',
    borderColor: 'border-blue-500',
    bgLight: 'bg-blue-50',
    valveType: 'Universal Compact',
    cylinderSizes: ['6 kg', '13 kg'],
    isAvailable: true
  },
  {
    id: 'Lake Gas',
    name: 'Lake Gas',
    distributor: 'Lake Region Gas Ltd',
    tagline: 'Consistent burner pressure for home & restaurant',
    badge: 'Commercial Grade',
    color: '#4F46E5',
    borderColor: 'border-indigo-500',
    bgLight: 'bg-indigo-50',
    valveType: 'Standard Industrial Valve',
    cylinderSizes: ['6 kg', '13 kg', '50 kg'],
    isAvailable: true
  },
  {
    id: 'Hass Gas',
    name: 'Hass Gas',
    distributor: 'Hass Petroleum Kenya',
    tagline: 'High grade clean energy burner with safety overfill shutoff',
    badge: 'High Heat',
    color: '#DC2626',
    borderColor: 'border-red-600',
    bgLight: 'bg-red-50',
    valveType: 'Universal Pin Valve',
    cylinderSizes: ['6 kg', '13 kg'],
    isAvailable: true
  },
  {
    id: 'Menengai Gas',
    name: 'Menengai Gas',
    distributor: 'Menengai Oil Refineries LPG Div',
    tagline: 'Refined pure butane-propane mix with zero black smoke',
    badge: 'Clean Burn',
    color: '#9333EA',
    borderColor: 'border-purple-500',
    bgLight: 'bg-purple-50',
    valveType: 'Standard 20mm',
    cylinderSizes: ['6 kg', '13 kg'],
    isAvailable: true
  },
  {
    id: 'Safe Gas',
    name: 'Safe Gas',
    distributor: 'Safe Gas Kenya',
    tagline: 'Lightweight composite explosion-resistant domestic cylinders',
    badge: 'Composite Tech',
    color: '#0891B2',
    borderColor: 'border-cyan-600',
    bgLight: 'bg-cyan-50',
    valveType: 'Quick Snap-On Valve',
    cylinderSizes: ['6 kg', '13 kg'],
    isAvailable: true
  },
  {
    id: 'Jamvi Gas',
    name: 'Jamvi Gas',
    distributor: 'Jamvi Energy Kenya',
    tagline: 'Everyday pocket-friendly cooking gas with strict weight testing',
    badge: 'Budget Friendly',
    color: '#D97706',
    borderColor: 'border-amber-600',
    bgLight: 'bg-amber-50',
    valveType: 'Standard Compact',
    cylinderSizes: ['6 kg', '13 kg'],
    isAvailable: true
  }
];

export const THIKA_HIGHWAY_ZONES: ThikaHighwayZone[] = [
  {
    id: 'zone-roysambu',
    name: 'Roysambu / TRM / Lumumba Drive',
    exitNumber: 'Exit 8',
    hubName: 'Central Thika Rd Depot (TRM)',
    estMinutes: '15-25 min',
    deliveryFee: 150,
    landmarks: ['Thika Road Mall (TRM)', 'Lumumba Drive', 'Shell Roysambu', 'PAC University', 'Roysambu Roundabout'],
    popularEstates: ['Lumumba Drive', 'TRM Drive', 'Galana Court', 'Prestige Apts', 'Jewel Complex']
  },
  {
    id: 'zone-kahawa',
    name: 'Kahawa Sukari / Kahawa Wendani / KU Main Gate',
    exitNumber: 'Exit 12-13',
    hubName: 'Kahawa Sukari Express Station',
    estMinutes: '15-25 min',
    deliveryFee: 150,
    landmarks: ['KU Gate A & B', 'Magunas Supermarket Wendani', 'Engen Sukari', 'QuickMart Sukari', 'Kahawa Barracks'],
    popularEstates: ['Sukari 1st-4th South Ave', 'Wendani Matopeni', 'Balozi Estate', 'KU Staff Quarters', 'Wendani Catholic']
  },
  {
    id: 'zone-mirema',
    name: 'Mirema Drive / USIU / Safari Park / Zimmerman',
    exitNumber: 'Exit 8-9',
    hubName: 'Safari Park / Mirema Hub',
    estMinutes: '20-30 min',
    deliveryFee: 150,
    landmarks: ['USIU-Africa', 'Safari Park Hotel', 'Mirema Junction', 'Zimmerman Base', 'Car Wash Mirema'],
    popularEstates: ['Mirema Springs', 'Mirema Court', 'Zimmerman Ward 4', 'Kamiti Road Junction']
  },
  {
    id: 'zone-kasarani',
    name: 'Kasarani / Sports View / Sunton / Hunters',
    exitNumber: 'Exit 9-10',
    hubName: 'Kasarani Aquatic Depot',
    estMinutes: '20-35 min',
    deliveryFee: 180,
    landmarks: ['Kasarani Stadium Gate 2', 'Sports View Hotel', 'Clay City', 'Hunters Phase 1', 'Mwiki Road Junction'],
    popularEstates: ['Clay Works Estate', 'Sunton Block 3', 'Kasarani Trees', 'Santack Kasarani']
  },
  {
    id: 'zone-gardencity',
    name: 'Garden City Mall / Willstone / Roasters',
    exitNumber: 'Exit 7',
    hubName: 'Garden City Rapid Hub',
    estMinutes: '15-25 min',
    deliveryFee: 150,
    landmarks: ['Garden City Mall', 'Roasters', 'Mountain Mall', 'Shell Garden City', 'EABL Overpass'],
    popularEstates: ['Willstone Homes', 'Garden City Residences', 'Thika Road Baptist', 'Roasters Inn Area']
  },
  {
    id: 'zone-ruaraka',
    name: 'Ruaraka / Allsopps / Survey of Kenya / Utalii',
    exitNumber: 'Exit 4-6',
    hubName: 'Survey / Ruaraka Station',
    estMinutes: '20-30 min',
    deliveryFee: 150,
    landmarks: ['Survey of Kenya', 'Utalii Hotel / College', 'Allsopps Flyover', 'Kenya School of Monetary Studies (KSMS)'],
    popularEstates: ['De La Rue Staff Flats', 'Mathare North Area 2', 'Utalii Village', 'Drive In Estate']
  },
  {
    id: 'zone-ngara',
    name: 'Pangani / Ngara / Guru Nanak / Muthaiga',
    exitNumber: 'Exit 1-3',
    hubName: 'City Gate / Pangani Depot',
    estMinutes: '20-35 min',
    deliveryFee: 200,
    landmarks: ['Guru Nanak Hospital', 'Pangani Girls Overpass', 'Forest Road Roundabout', 'Muthaiga Police Station'],
    popularEstates: ['Pangani Estate', 'Ngara Fig Tree Area', 'Desai Road Flats', 'Park Road Housing']
  },
  {
    id: 'zone-githurai',
    name: 'Githurai 44 / Githurai 45 / Kahawa West',
    exitNumber: 'Exit 10-11',
    hubName: 'Githurai Overpass Hub',
    estMinutes: '20-30 min',
    deliveryFee: 150,
    landmarks: ['Githurai Roundabout Flyover', 'Farmers Market Githurai', 'Kahawa West Roundabout', 'Kongo Area'],
    popularEstates: ['Githurai 44 Phase 2', 'Kahawa West Estate', 'Githurai 45 Progressive', 'Jacaranda Grounds']
  },
  {
    id: 'zone-ruiru',
    name: 'Ruiru Town / Membley / Eastern Bypass Flyover',
    exitNumber: 'Exit 14',
    hubName: 'Ruiru Bypass Logistics Hub',
    estMinutes: '20-30 min',
    deliveryFee: 180,
    landmarks: ['Ruiru Rainbow Resort', 'Eastern Bypass Flyover', 'Membley Estate Gate', 'Tatu City Junction', 'Ruiru Police Station'],
    popularEstates: ['Membley Forest View', 'Ruiru Prison Staff Estate', 'Devki Area', 'Githunguri Road Junction']
  },
  {
    id: 'zone-toll',
    name: 'Kimbo / Toll Station / NIBS / Spur Mall',
    exitNumber: 'Exit 15',
    hubName: 'Toll Station Express',
    estMinutes: '20-30 min',
    deliveryFee: 180,
    landmarks: ['NIBS College Main Campus', 'Spur Mall Ruiru', 'Toll Weighbridge Station', 'Theta Hotel Junction'],
    popularEstates: ['Kimbo Greenfields', 'Toll Plaza Residences', 'Mugutha Phase 1', 'Kenyatta Road Entrance']
  },
  {
    id: 'zone-juja',
    name: 'Juja Town / JKUAT / Highpoint / Gachororo',
    exitNumber: 'Exit 16-17',
    hubName: 'Juja Flyover JKUAT Hub',
    estMinutes: '20-35 min',
    deliveryFee: 180,
    landmarks: ['JKUAT Gate 1', 'JKUAT Gate 2', 'Juja City Mall', 'Highpoint Flyover', 'Total Juja Highway', 'Juja Stage'],
    popularEstates: ['Juja Highpoint Apts', 'Gachororo Stage', 'Ebenezer Hostels', 'Kenyatta Road Junction', 'Juja South Estate']
  },
  {
    id: 'zone-witeithie',
    name: 'Witeithie / Ndarugo / Mang’u Flyover',
    exitNumber: 'Exit 18',
    hubName: 'Witeithie Waystation',
    estMinutes: '25-35 min',
    deliveryFee: 200,
    landmarks: ['Witeithie Footbridge', 'Ndarugo Quarries Junction', 'Mang’u High School Flyover', 'Bob Harris Area'],
    popularEstates: ['Witeithie Market Area', 'Ndarugo Ridge', 'Gatundu Flyover Junction']
  },
  {
    id: 'zone-thika',
    name: 'Thika Town / Section 9 / Makongeni / Blue Post',
    exitNumber: 'Exit 19-20',
    hubName: 'Thika Metro Central Hub',
    estMinutes: '25-40 min',
    deliveryFee: 200,
    landmarks: ['Ananas Mall Thika', 'Blue Post Hotel / Chania Falls', 'Thika Level 5 Hospital', 'Mount Kenya University (MKU)', 'Section 9'],
    popularEstates: ['Section 9 Estate', 'Makongeni Phase 4', 'Ngoingwa Estate', 'Landless Estate', 'Thika Greens Gate']
  }
];

export function getZoneById(id?: string): ThikaHighwayZone {
  return (
    THIKA_HIGHWAY_ZONES.find((z) => z.id === id) ||
    THIKA_HIGHWAY_ZONES[0] // default to Roysambu/TRM
  );
}

export function getBrandConfig(brand?: string): BrandDetail {
  return (
    GAS_BRANDS_CONFIG.find((b) => b.id === brand) ||
    GAS_BRANDS_CONFIG[0] // default to TotalEnergies
  );
}
