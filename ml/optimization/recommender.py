"""
Given a project grade (and optionally a date/time), finds sectors that
offer both the project grade and enough easier routes to warm up on,
widening the warm-up search until matches are found, then ranks by
forecasted conditions.
"""
from forecasting.weather_client import get_daily_forecast, resolve_forecast_day
from forecasting.climbability_score import score_day
from grading.grade_utils import grade_to_value, grade_tier, qualifies_for_floor


def widen_search(crags: list[dict], project_value: int, min_steps: int, max_steps: int):
    """
    Tries increasingly wider warm-up floors until at least one sector
    qualifies. Returns (candidates, steps_used) where each candidate is
    {"crag": crag_dict, "sector": sector_dict}.
    """
    for steps in range(min_steps, max_steps + 1):
        floor_value = max(0, project_value - steps)
        candidates = []
        for crag in crags:
            for sector in crag.get("sectors", []):
                if qualifies_for_floor(
                    project_value, floor_value, sector.get("grade_min"), sector.get("grade_max")
                ):
                    candidates.append({"crag": crag, "sector": sector})
        if candidates:
            return candidates, steps
    return [], max_steps


def score_candidates(candidates: list[dict], target_date: str, climb_hour: float | None) -> list[dict]:
    """
    Fetches weather per unique crag (avoids re-fetching for every sector
    at the same crag) and scores each candidate sector.
    """
    forecast_cache: dict[int, list[dict]] = {}
    results = []

    for candidate in candidates:
        crag = candidate["crag"]
        sector = candidate["sector"]

        if crag.get("latitude") is None or crag.get("longitude") is None:
            continue

        if crag["id"] not in forecast_cache:
            forecast_cache[crag["id"]] = get_daily_forecast(crag["latitude"], crag["longitude"], days=16)
        forecast = forecast_cache[crag["id"]]

        day_info = resolve_forecast_day(forecast, target_date)

        # climb_hour is optional — None means "don't factor in time of day"
        scored = score_day(day_info, sector, climb_hour=climb_hour if climb_hour is not None else 12.0)

        results.append({
            "crag_id": crag["id"],
            "crag_name": crag["name"],
            "sector_id": sector["id"],
            "sector_name": sector["name"],
            "grade_min": sector.get("grade_min"),
            "grade_max": sector.get("grade_max"),
            "climbing_type": sector.get("climbing_type"),  
            "rating": sector.get("rating"),
            "rating_count": sector.get("rating_count", 0),
            "adjusted_rating": sector.get("adjusted_rating"),
            "date_used": day_info["date"],
            "exact_date_match": day_info["exact_match"],
            "time_considered": climb_hour is not None,
            **scored,
        })

    # Conditions come first — a 5-star sector at 44°C is still a bad idea.
    # Rating only breaks ties between sectors with equally good conditions.
    #
    # We sort on adjusted_rating, not the raw mean. That's what stops a lone
    # 5-star rating outranking twenty ratings averaging 4.6, and it already
    # accounts for sample size — so rating_count is no longer needed as a
    # second tiebreaker. Unrated sectors arrive carrying the global prior,
    # which puts "unknown" mid-table rather than bottom.
    results.sort(
        key=lambda r: (
            r["score"],
            r["adjusted_rating"] if r["adjusted_rating"] is not None else 0.0,
        ),
        reverse=True,
    )
    return results



def recommend_sectors(
    crags: list[dict],
    target_date: str,
    project_grade: str,
    climb_hour: float | None = None,
    top_n: int = 10,
) -> dict:
    project_value = grade_to_value(project_grade)
    if project_value is None:
        raise ValueError(f"Unrecognized grade: '{project_grade}'")

    min_steps, max_steps = grade_tier(project_value)
    candidates, steps_used = widen_search(crags, project_value, min_steps, max_steps)

    if not candidates:
        return {"results": [], "warmup_steps_used": None}

    scored = score_candidates(candidates, target_date, climb_hour)
    return {"results": scored[:top_n], "warmup_steps_used": steps_used}