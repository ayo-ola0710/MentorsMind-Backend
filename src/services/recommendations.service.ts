import db from '../config/db';

export class RecommendationService {
  static async getRecommendedMentors(learnerId: number) {
    // Basic logic: Find mentors who teach skills the learner is interested in
    const query = `
      SELECT m.* FROM mentors m
      JOIN mentor_skills ms ON m.id = ms.mentor_id
      WHERE ms.skill_name IN (
        SELECT unnest(interests) FROM learners WHERE id = $1
      )
      LIMIT 5
    `;
    const result = await db.query(query, [learnerId]);
    return result.rows;
  }
}
