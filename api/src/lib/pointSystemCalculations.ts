import { db } from './db'

/**
 * In `RankedPublications`, we rank each user's publications by `citation_count`.
 * We then define a user's h-index in the typical manner:
 *   "the maximum rank r such that citation_count >= r"
 * The final h_index is capped at 100.
 */
export async function calculateUserHIndex(): Promise<void> {
  await db.$executeRaw`
        WITH RankedPublications AS (
          SELECT
            pu.user_id AS userid,
            p.citation_count,
            ROW_NUMBER() OVER (
              PARTITION BY pu.user_id
              ORDER BY p.citation_count DESC
            ) AS rank
          FROM compass."Publication" p
          JOIN compass."PublicationUser" pu
            ON p.id = pu.publication_id
        ),
        HIndexPerUser AS (
          SELECT
            userid,
            MAX(rank) AS h_index
          FROM RankedPublications
          WHERE citation_count >= rank
          GROUP BY userid
        )
        UPDATE compass."User" u
        SET h_index = LEAST(HIndexPerUser.h_index, 100)
        FROM HIndexPerUser
        WHERE u.id = HIndexPerUser.userid
      `
}

/**
 * Compute and store the 'conference_value' for each conference (compass."Event")
 * This is the average of (h_index) for all authors in that conference.
 * Capped between 1 and 100.
 */
export async function calculateConferenceValue(): Promise<void> {
  await db.$executeRaw`
        WITH user_confs AS (
          SELECT DISTINCT
            p.conference,
            pu.user_id
          FROM compass."Publication" p
          JOIN compass."PublicationUser" pu
            ON p.id = pu.publication_id
          WHERE p.conference IS NOT NULL
          GROUP BY p.conference, pu.user_id
        ),
        averages AS (
          SELECT
            uc.conference,
            AVG(u.h_index) AS avg_h_index
          FROM user_confs uc
          JOIN compass."User" u
            ON uc.user_id = u.id
          GROUP BY uc.conference
        )
        UPDATE compass."Event" e
        SET conference_value = LEAST(GREATEST(1, averages.avg_h_index), 100)
        FROM averages
        WHERE e.lisperator_id = averages.conference
      `
}

/**
 * We use a "DecayLookup" table to find a precomputed factor
 * based on how many days have passed since publication or citation creation.
 * This step calculates the "decayed" base score plus the sum
 * of decayed citation values for each publication.
 */
export async function calculateCitationScoresAndDecay(): Promise<void> {
  await db.$executeRaw`DROP TABLE IF EXISTS citation_scores;`

  // A) Summation of decayed citations, referencing the DecayLookup table
  await db.$executeRaw`
    CREATE TEMP TABLE citation_scores AS
    SELECT
      p.id AS publication_id,
      SUM(
        CASE
          WHEN c.author_sc = false
            AND dl_c.decay_factor IS NOT NULL
          THEN ((e.conference_value / 5.0) * dl_c.decay_factor)
          ELSE 0
        END
      ) AS decayed_citations
    FROM compass."Publication" p
    JOIN compass."Event" e
      ON p.conference = e.lisperator_id
    LEFT JOIN compass."Citation" c
      ON p.id = c.publication_id
    LEFT JOIN compass."DecayLookup" dl_c
      ON DATE_PART(
        'day',
        NOW() - GREATEST(c.creation_date, COALESCE(p.date_published, CURRENT_DATE))
      )::INT = dl_c.days
    GROUP BY p.id
  `

  // B) Update `overall_score` by calculating base score inline and combining with decayed citations
  await db.$executeRaw`
    UPDATE compass."Publication" pub
    SET overall_score = (
      (GREATEST(1, LEAST(COALESCE(pub.review_score, 1), 5)) * (COALESCE(e.conference_value, 1)) * dl_p.decay_factor)
      + COALESCE(cs.decayed_citations, 0)
    )
    FROM citation_scores cs,
         compass."DecayLookup" dl_p,
         compass."Event" e
    WHERE pub.id = cs.publication_id
      AND pub.conference = e.lisperator_id
      AND DATE_PART(
        'day',
        NOW() - COALESCE(pub.date_published, CURRENT_DATE)
      )::INT = dl_p.days
  `
}
