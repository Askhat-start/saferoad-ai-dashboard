export type RiskLevel = 'low' | 'medium' | 'high'

export type LatLng = [number, number]

export interface RiskFactor {
  key: string
  label: string
  /** contribution to the risk score, percentage points, sums to 100 across factors */
  contribution: number
  /** human-readable measured value */
  value: string
  /** direction the factor pushes the score: 'up' increases risk */
  direction: 'up' | 'down'
}

export interface Segment {
  id: string
  name: string
  district: string
  coords: LatLng[]
  riskScore: number
  level: RiskLevel
  lengthM: number
  dailyPedestrians: number
  accidents12mo: number
  factors: RiskFactor[]
  recommendation: string
}

export interface Upgrade {
  id: string
  segmentId: string
  segmentName: string
  intervention: string
  cost: number
  riskReduction: number // safety points recovered
  priority: 'critical' | 'high' | 'medium'
  roi: number // multiplier
  beneficiaries: number
}

export const ALMATY_CENTER: LatLng = [43.2389, 76.8897]

export function riskLevel(score: number): RiskLevel {
  if (score >= 67) return 'high'
  if (score >= 34) return 'medium'
  return 'low'
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#16a34a',
  medium: '#ca8a04',
  high: '#dc2626',
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

function factors(
  crosswalk: number,
  speed: number,
  lighting: number,
  sidewalk: number,
  accidents: number,
  values: [string, string, string, string, string],
): RiskFactor[] {
  return [
    { key: 'crosswalk', label: 'Missing Crosswalk', contribution: crosswalk, value: values[0], direction: 'up' },
    { key: 'speed', label: 'High Vehicle Speed', contribution: speed, value: values[1], direction: 'up' },
    { key: 'lighting', label: 'Poor Lighting', contribution: lighting, value: values[2], direction: 'up' },
    { key: 'sidewalk', label: 'Sidewalk Condition', contribution: sidewalk, value: values[3], direction: 'up' },
    { key: 'accidents', label: 'Accident History', contribution: accidents, value: values[4], direction: 'up' },
  ]
}

export const SEGMENTS: Segment[] = [
  {
    id: 'seg-alfarabi-e',
    name: 'Al-Farabi Ave / Furmanov Junction',
    district: 'Bostandyk',
    coords: [
      [43.2206, 76.9061],
      [43.2218, 76.9123],
      [43.2231, 76.9188],
    ],
    riskScore: 91,
    level: 'high',
    lengthM: 740,
    dailyPedestrians: 9200,
    accidents12mo: 11,
    factors: factors(28, 26, 14, 11, 21, [
      'No signalized crossing for 640m',
      'Median speed 78 km/h (limit 60)',
      '41% of poles non-functional',
      'Cracked, 1.1m effective width',
      '11 incidents, 3 severe',
    ]),
    recommendation: 'Install signalized pedestrian crossing + speed enforcement camera',
  },
  {
    id: 'seg-abay-w',
    name: 'Abay Ave / Baytursynuly',
    district: 'Almaly',
    coords: [
      [43.2402, 76.9001],
      [43.2404, 76.9075],
      [43.2406, 76.9151],
    ],
    riskScore: 82,
    level: 'high',
    lengthM: 690,
    dailyPedestrians: 12400,
    accidents12mo: 8,
    factors: factors(31, 22, 9, 16, 22, [
      'Crossing spacing exceeds 500m',
      'Median speed 71 km/h',
      '22% of poles non-functional',
      'Obstructed by parked vehicles',
      '8 incidents, 2 severe',
    ]),
    recommendation: 'Add raised mid-block crossing + protected refuge island',
  },
  {
    id: 'seg-dostyk-n',
    name: 'Dostyk Ave / Al-Farabi',
    district: 'Medeu',
    coords: [
      [43.2295, 76.9558],
      [43.2342, 76.9551],
      [43.2389, 76.9544],
    ],
    riskScore: 74,
    level: 'high',
    lengthM: 820,
    dailyPedestrians: 6800,
    accidents12mo: 6,
    factors: factors(19, 29, 18, 13, 21, [
      'Faded crossing markings',
      'Downhill grade, speeds 74 km/h',
      'Inconsistent lighting on east side',
      'Narrow sidewalk near retail',
      '6 incidents, 1 severe',
    ]),
    recommendation: 'Repaint high-visibility crossings + add LED street lighting',
  },
  {
    id: 'seg-tolebi',
    name: 'Tole Bi St / Seyfullin',
    district: 'Almaly',
    coords: [
      [43.2561, 76.9201],
      [43.2558, 76.9135],
      [43.2555, 76.9068],
    ],
    riskScore: 58,
    level: 'medium',
    lengthM: 610,
    dailyPedestrians: 8100,
    accidents12mo: 4,
    factors: factors(22, 18, 24, 19, 17, [
      'Crossing present but unsignalized',
      'Median speed 58 km/h',
      'Dim at intersection corners',
      'Uneven paving slabs',
      '4 incidents, 0 severe',
    ]),
    recommendation: 'Upgrade to signalized crossing + resurface sidewalk',
  },
  {
    id: 'seg-satpayev',
    name: 'Satpayev St / Rozybakiev',
    district: 'Bostandyk',
    coords: [
      [43.2338, 76.8901],
      [43.2336, 76.8835],
      [43.2334, 76.8769],
    ],
    riskScore: 53,
    level: 'medium',
    lengthM: 560,
    dailyPedestrians: 5400,
    accidents12mo: 3,
    factors: factors(17, 21, 26, 20, 16, [
      'Crossing offset from desire line',
      'Median speed 56 km/h',
      'Tree canopy blocks lighting',
      'Sidewalk gaps near construction',
      '3 incidents, 0 severe',
    ]),
    recommendation: 'Relocate crossing to desire line + trim canopy / add lighting',
  },
  {
    id: 'seg-raiymbek',
    name: 'Raiymbek Ave / Pushkin',
    district: 'Zhetysu',
    coords: [
      [43.2702, 76.9402],
      [43.2701, 76.9335],
      [43.2700, 76.9268],
    ],
    riskScore: 46,
    level: 'medium',
    lengthM: 720,
    dailyPedestrians: 7300,
    accidents12mo: 3,
    factors: factors(20, 23, 17, 22, 18, [
      'Wide crossing, no refuge island',
      'Median speed 54 km/h',
      'Adequate but aging fixtures',
      'Curb ramps non-compliant',
      '3 incidents, 1 severe',
    ]),
    recommendation: 'Add central refuge island + compliant curb ramps',
  },
  {
    id: 'seg-nauryzbai',
    name: 'Nauryzbai Batyr / Kabanbai',
    district: 'Almaly',
    coords: [
      [43.2521, 76.9402],
      [43.2487, 76.9405],
      [43.2452, 76.9408],
    ],
    riskScore: 31,
    level: 'low',
    lengthM: 480,
    dailyPedestrians: 4100,
    accidents12mo: 1,
    factors: factors(14, 16, 19, 24, 27, [
      'Signalized crossing present',
      'Median speed 44 km/h',
      'Lighting functional',
      'Minor surface wear',
      '1 incident, 0 severe',
    ]),
    recommendation: 'Routine maintenance — monitor surface wear',
  },
  {
    id: 'seg-gagarin',
    name: 'Gagarin Ave / Timiryazev',
    district: 'Bostandyk',
    coords: [
      [43.2289, 76.8995],
      [43.2255, 76.8998],
      [43.2221, 76.9001],
    ],
    riskScore: 24,
    level: 'low',
    lengthM: 520,
    dailyPedestrians: 3600,
    accidents12mo: 0,
    factors: factors(12, 15, 18, 25, 30, [
      'Recently upgraded crossing',
      'Median speed 41 km/h',
      'New LED lighting',
      'Good condition',
      'No incidents recorded',
    ]),
    recommendation: 'No intervention required',
  },
  {
    id: 'seg-zheltoksan',
    name: 'Zheltoksan St / Tole Bi',
    district: 'Almaly',
    coords: [
      [43.2588, 76.9402],
      [43.2554, 76.9404],
      [43.2520, 76.9406],
    ],
    riskScore: 38,
    level: 'medium',
    lengthM: 450,
    dailyPedestrians: 6200,
    accidents12mo: 2,
    factors: factors(18, 17, 21, 23, 21, [
      'Crossing present, narrow',
      'Median speed 49 km/h',
      'Dim near bus stop',
      'Acceptable condition',
      '2 incidents, 0 severe',
    ]),
    recommendation: 'Widen crossing + lighting at bus stop',
  },
  {
    id: 'seg-zhibekzholy',
    name: 'Zhibek Zholy / Furmanov',
    district: 'Medeu',
    coords: [
      [43.2598, 76.9468],
      [43.2599, 76.9402],
      [43.2600, 76.9336],
    ],
    riskScore: 19,
    level: 'low',
    lengthM: 600,
    dailyPedestrians: 9800,
    accidents12mo: 0,
    factors: factors(10, 12, 16, 28, 34, [
      'Pedestrianized zone',
      'Vehicle access restricted',
      'Well lit',
      'Excellent paving',
      'No incidents recorded',
    ]),
    recommendation: 'No intervention required',
  },
]

/* ---- Route planner data ---- */

export const ROUTE_START: LatLng = [43.2206, 76.9061] // near Al-Farabi
export const ROUTE_END: LatLng = [43.2598, 76.9468] // Zhibek Zholy promenade

// Fastest route — direct, traverses high-risk corridors
export const FASTEST_ROUTE: LatLng[] = [
  [43.2206, 76.9061],
  [43.2231, 76.9188],
  [43.2342, 76.9551],
  [43.2389, 76.9544],
  [43.2521, 76.9402],
  [43.2598, 76.9468],
]

// SafeRoad route — slightly longer, routes via lower-risk streets / upgraded crossings
export const SAFEROAD_ROUTE: LatLng[] = [
  [43.2206, 76.9061],
  [43.2289, 76.8995],
  [43.2338, 76.8901],
  [43.2452, 76.9408],
  [43.2520, 76.9406],
  [43.2554, 76.9404],
  [43.2599, 76.9402],
  [43.2598, 76.9468],
]

export const ROUTE_COMPARISON = {
  fastest: {
    label: 'Fastest Route',
    distanceKm: 6.4,
    durationMin: 78,
    riskScore: 79,
    highRiskSegments: 3,
    exposurePct: 100,
  },
  saferoad: {
    label: 'SafeRoad AI Route',
    distanceKm: 7.1,
    durationMin: 86,
    riskScore: 28,
    highRiskSegments: 0,
    exposurePct: 36,
  },
  highRiskAvoided: 3,
  safetyImprovementPct: 65,
  addedDistanceKm: 0.7,
  addedTimeMin: 8,
}

/* ---- Upgrade planner data ---- */

export const UPGRADES: Upgrade[] = [
  {
    id: 'up-1',
    segmentId: 'seg-alfarabi-e',
    segmentName: 'Al-Farabi Ave / Furmanov',
    intervention: 'Signalized crossing + speed camera',
    cost: 42000,
    riskReduction: 58,
    priority: 'critical',
    roi: 4.8,
    beneficiaries: 9200,
  },
  {
    id: 'up-2',
    segmentId: 'seg-abay-w',
    segmentName: 'Abay Ave / Baytursynuly',
    intervention: 'Raised crossing + refuge island',
    cost: 31000,
    riskReduction: 49,
    priority: 'critical',
    roi: 5.1,
    beneficiaries: 12400,
  },
  {
    id: 'up-3',
    segmentId: 'seg-dostyk-n',
    segmentName: 'Dostyk Ave / Al-Farabi',
    intervention: 'High-vis markings + LED lighting',
    cost: 18500,
    riskReduction: 38,
    priority: 'high',
    roi: 4.2,
    beneficiaries: 6800,
  },
  {
    id: 'up-4',
    segmentId: 'seg-tolebi',
    segmentName: 'Tole Bi St / Seyfullin',
    intervention: 'Signalize crossing + resurface',
    cost: 24000,
    riskReduction: 29,
    priority: 'high',
    roi: 3.4,
    beneficiaries: 8100,
  },
  {
    id: 'up-5',
    segmentId: 'seg-raiymbek',
    segmentName: 'Raiymbek Ave / Pushkin',
    intervention: 'Refuge island + curb ramps',
    cost: 15500,
    riskReduction: 22,
    priority: 'medium',
    roi: 2.9,
    beneficiaries: 7300,
  },
  {
    id: 'up-6',
    segmentId: 'seg-satpayev',
    segmentName: 'Satpayev St / Rozybakiev',
    intervention: 'Relocate crossing + lighting',
    cost: 12500,
    riskReduction: 19,
    priority: 'medium',
    roi: 2.6,
    beneficiaries: 5400,
  },
  {
    id: 'up-7',
    segmentId: 'seg-zheltoksan',
    segmentName: 'Zheltoksan St / Tole Bi',
    intervention: 'Widen crossing + bus-stop lighting',
    cost: 9500,
    riskReduction: 14,
    priority: 'medium',
    roi: 2.2,
    beneficiaries: 6200,
  },
]

/* ---- City-wide stats ---- */

export const CITY_STATS = {
  safetyScore: 62,
  projectedSafetyScore: 84,
  dangerousSegments: 148,
  totalSegments: 1240,
  riskReductionPotential: 34, // %
  recommendedUpgrades: 36,
  totalBudgetRequired: 1_240_000,
  beneficiaries: 184000,
}

// 12-month trend of city safety score
export const SAFETY_TREND = [
  { month: 'Jan', score: 54 },
  { month: 'Feb', score: 55 },
  { month: 'Mar', score: 57 },
  { month: 'Apr', score: 56 },
  { month: 'May', score: 58 },
  { month: 'Jun', score: 59 },
  { month: 'Jul', score: 60 },
  { month: 'Aug', score: 60 },
  { month: 'Sep', score: 61 },
  { month: 'Oct', score: 61 },
  { month: 'Nov', score: 62 },
  { month: 'Dec', score: 62 },
]

// Risk distribution across all monitored segments
export const RISK_DISTRIBUTION = [
  { level: 'High', count: 148, fill: '#dc2626' },
  { level: 'Medium', count: 392, fill: '#ca8a04' },
  { level: 'Low', count: 700, fill: '#16a34a' },
]

// District-level risk breakdown
export const DISTRICT_RISK = [
  { district: 'Bostandyk', high: 34, medium: 88, low: 142 },
  { district: 'Almaly', high: 41, medium: 96, low: 128 },
  { district: 'Medeu', high: 22, medium: 71, low: 160 },
  { district: 'Zhetysu', high: 28, medium: 79, low: 134 },
  { district: 'Auezov', high: 23, medium: 58, low: 136 },
]

export function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n}`
}
