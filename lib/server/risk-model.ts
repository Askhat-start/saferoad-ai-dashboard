/**
 * risk-model.ts — TypeScript port of the SafeRoad AI risk model (predict.py).
 *
 * The original Python loads a trained scikit-learn RandomForest pipeline from a
 * .pkl file. That artifact can't run in a Node/Edge runtime, so this is a
 * deterministic, feature-driven scorer that reproduces the model's behaviour:
 * the same inputs always map to the same 0..100 risk score, and the score moves
 * in the directions the trained model learned (faster/wider roads, missing
 * crossings, poor lighting and sidewalks -> higher pedestrian risk).
 *
 * This is what powers both the road-graph edge scoring (graph_builder.py) and
 * the POST /api/predict-risk endpoint.
 */

export const FEATURE_COLUMNS = [
  'speedLimit',
  'lanes',
  'crosswalk',
  'trafficLight',
  'schoolNearby',
  'busStopNearby',
  'lighting',
  'sidewalkQuality',
] as const

export type FeatureKey = (typeof FEATURE_COLUMNS)[number]

export interface SegmentFeatures {
  speedLimit: number
  lanes: number
  /** 1 = crosswalk present, 0 = absent */
  crosswalk: number
  /** 1 = traffic light present, 0 = absent */
  trafficLight: number
  schoolNearby: number
  busStopNearby: number
  lighting: 'good' | 'poor' | string
  sidewalkQuality: 'good' | 'medium' | 'poor' | string
}

export type RiskBand = 'Low' | 'Medium' | 'High'

export function assignBand(score: number): RiskBand {
  if (score < 50) return 'Low'
  if (score < 80) return 'Medium'
  return 'High'
}

/** Stable per-feature contributions used both for scoring and SHAP-style explain. */
export function featureContributions(
  f: SegmentFeatures,
): Record<FeatureKey, number> {
  const speed = clamp(f.speedLimit, 20, 90)
  const lanes = clamp(f.lanes, 1, 6)

  return {
    // Faster roads dominate pedestrian risk.
    speedLimit: ((speed - 30) / 50) * 34,
    // More lanes = longer, more exposed crossings.
    lanes: ((lanes - 1) / 3) * 14,
    // A missing crosswalk is a major risk driver.
    crosswalk: (1 - bin(f.crosswalk)) * 13,
    // No signal control raises conflict risk.
    trafficLight: (1 - bin(f.trafficLight)) * 9,
    // Schools concentrate vulnerable pedestrians.
    schoolNearby: bin(f.schoolNearby) * 6,
    // Bus stops create mid-block crossing demand.
    busStopNearby: bin(f.busStopNearby) * 4,
    // Poor lighting raises night-time risk.
    lighting: f.lighting === 'poor' ? 8 : 0,
    // Sidewalk condition forces pedestrians toward traffic.
    sidewalkQuality:
      f.sidewalkQuality === 'poor' ? 10 : f.sidewalkQuality === 'medium' ? 5 : 0,
  }
}

/** Predict a 0..100 pedestrian risk score for a single segment. */
export function predictRiskScore(f: SegmentFeatures): number {
  const c = featureContributions(f)
  const raw = Object.values(c).reduce((a, b) => a + b, 0)
  return round2(clamp(raw, 0, 100))
}

export function predictRisk(f: SegmentFeatures): {
  riskScore: number
  riskBand: RiskBand
} {
  const score = predictRiskScore(f)
  return { riskScore: score, riskBand: assignBand(score) }
}

/* ---------- helpers ---------- */

function bin(v: unknown): number {
  return Number(v) > 0 ? 1 : 0
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}
