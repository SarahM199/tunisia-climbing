"""
Shared rating lookups.

Averages are computed with ONE aggregate query rather than one per sector.
Three endpoints need this (crag detail, sector list, recommendations), so
it lives here instead of being copy-pasted around.

This module does the SQL; the statistics live in ml/ratings/shrinkage.py.
Keeping that boundary means the shrinkage maths stays pure and testable
without a database.
"""

import os
import sys

# Same trick as recommend.py — makes the ml package importable
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml"))

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.crag import SectorRating
from ratings.shrinkage import DEFAULT_WEIGHT, bayesian_average, resolve_prior_mean


def get_global_prior(db: Session) -> float:
    """
    The global mean across every rating on the site — what thin evidence
    gets pulled towards.

    AVG over the individual rating rows is already count-weighted, which is
    what we want: a sector with 50 ratings should influence the prior 50x
    more than one with a single rating. Averaging the per-sector means
    instead would give every sector equal say, which is wrong.
    """
    return resolve_prior_mean(db.query(func.avg(SectorRating.rating)).scalar())


def get_rating_map(
    db: Session,
    sector_ids: list[int] | None = None,
    m: float = DEFAULT_WEIGHT,
) -> dict[int, dict]:
    """
    Returns {sector_id: {"rating": 4.3, "rating_count": 7, "adjusted_rating": 4.0}}.

    "rating" is the honest raw average — show this to users alongside the
    count, because nobody actually rated a sector 4.0.

    "adjusted_rating" is the sceptical version — rank on this.

    Sectors with no ratings are absent from the dict, so callers use
    .get(sector_id) and fall back to the prior from get_global_prior().
    """
    prior_mean = get_global_prior(db)

    query = db.query(
        SectorRating.sector_id,
        func.avg(SectorRating.rating).label("average"),
        func.count(SectorRating.id).label("count"),
    )

    if sector_ids is not None:
        if not sector_ids:
            return {}
        query = query.filter(SectorRating.sector_id.in_(sector_ids))

    rows = query.group_by(SectorRating.sector_id).all()

    return {
        sector_id: {
            "rating": round(float(average), 1),
            "rating_count": int(count),
            "adjusted_rating": round(
                bayesian_average(float(average), int(count), prior_mean, m), 3
            ),
        }
        for sector_id, average, count in rows
    }
