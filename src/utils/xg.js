// Ported from notebook xG formula
export function calculateXG(shot) {
  const { start_x, start_y, outcome, type: shotType, shot_technique,
    first_time_shot, pressure_on, assist_type } = shot

  if (shotType === 'Penalty') return 0.76
  if (start_x <= 80) return 0.01

  const dist = Math.sqrt((120 - start_x) ** 2 + (40 - start_y) ** 2)

  const v1x = 120 - start_x, v1y = 36 - start_y
  const v2x = 120 - start_x, v2y = 44 - start_y
  const dot = v1x * v2x + v1y * v2y
  const mag1 = Math.sqrt(v1x ** 2 + v1y ** 2)
  const mag2 = Math.sqrt(v2x ** 2 + v2y ** 2)
  const cosA = Math.max(-1, Math.min(1, dot / (mag1 * mag2 + 1e-9)))
  const angle = Math.acos(cosA) * (180 / Math.PI)

  let z = -0.5

  if (shotType === 'Free Kick') z += 0.7
  z -= 0.10 * dist
  z += 0.012 * angle

  if (shot_technique === 'Header') z -= 0.80
  else if (shot_technique === 'Volley') z -= 0.20

  if (assist_type === 'Through ball') z += 0.6
  else if (assist_type === 'Cross') z -= 0.4
  else if (assist_type === 'Rebound') z += 0.5
  else if (assist_type === 'Free Kick') z += 0.3

  if (first_time_shot === 1) z += 0.4

  const pressured = pressure_on === true || pressure_on === 'Yes' || pressure_on === 1
  if (pressured) z -= 0.90
  else if (!pressured && outcome === 'Block') z -= 0.60

  let xg = 1 / (1 + Math.exp(-z))
  if (start_x > 80 && xg < 0.01) xg = 0.02
  if (start_x >= 95 && start_x <= 103 && start_y >= 15 && start_y <= 65 && xg < 0.02) xg = 0.02

  return xg
}

export function calculateXGOT(shot, xg) {
  if (!['Goal', 'Save'].includes(shot.outcome)) return 0
  const placementY = Math.abs((shot.end_y ?? 40) - 40)
  const multiplier = placementY >= 3.0 ? 1.6 : placementY >= 1.5 ? 1.1 : 0.6
  return Math.min(xg * multiplier, 0.99)
}
