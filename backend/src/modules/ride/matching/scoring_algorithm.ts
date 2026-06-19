export class ScoringFormula {
  /**
   * Calculates a driver's match score based on the CTO blueprint formula.
   * score = (0.4 * inverse_distance) + (0.2 * rating) + (0.2 * acceptance_rate) + (0.2 * idle_time)
   */
  static calculateScore(
    distanceKm: number,
    rating: number, // out of 5
    acceptanceRate: number, // percentage 0-100
    idleTimeMinutes: number // how long since their last ride
  ): number {
    
    // Normalize distance (closer is better, so we invert it. Cap to prevent infinity)
    const inverseDistance = distanceKm === 0 ? 1 : Math.min(1 / distanceKm, 1);
    
    // Normalize rating (convert 5-star to 0-1 scale)
    const normalizedRating = rating / 5.0;
    
    // Normalize acceptance rate (0-100 to 0-1 scale)
    const normalizedAcceptance = acceptanceRate / 100.0;
    
    // Normalize idle time (e.g., cap at 60 minutes for max bonus)
    const normalizedIdle = Math.min(idleTimeMinutes / 60.0, 1.0);

    // Apply weights from blueprint
    const score = 
      (0.4 * inverseDistance) +
      (0.2 * normalizedRating) +
      (0.2 * normalizedAcceptance) +
      (0.2 * normalizedIdle);

    return score;
  }
}