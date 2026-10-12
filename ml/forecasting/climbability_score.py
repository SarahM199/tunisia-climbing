"""
Rule-based climbability scoring. Takes one day's weather, a sector's
shade info, and the planned climbing hour, and returns a score.
"""

ORIENTATION_SHADE_ESTIMATE = {
    "N": 17, "NE": 13, "E": 13, "SE": 15,
    "S": None, "SW": None, "W": None, "NW": 16,
}


def get_shade_info(sector: dict | None) -> dict:
    if not sector:
        return {"shade_by_hour": None, "source": "unavailable"}

    if sector.get("shade_by_hour") is not None:
        return {"shade_by_hour": sector["shade_by_hour"], "source": "measured"}

    orientation = sector.get("orientation")
    if orientation and orientation in ORIENTATION_SHADE_ESTIMATE:
        estimate = ORIENTATION_SHADE_ESTIMATE[orientation]
        if estimate is not None:
            return {"shade_by_hour": estimate, "source": "estimated"}

    return {"shade_by_hour": None, "source": "unavailable"}


def score_day(day: dict, sector: dict | None = None, climb_hour: float = 12.0) -> dict:
    """
    climb_hour: the hour (24h, can be fractional e.g. 14.5 for 14:30) you
    plan to be climbing. Used to check if the sector will already be
    shaded by the time you're actually there.
    """
    score = 100
    reasons = []

    shade_info = get_shade_info(sector)
    shade_by_hour = shade_info["shade_by_hour"]
    shade_source = shade_info["source"]

    shaded_at_climb_time = shade_by_hour is not None and climb_hour >= shade_by_hour

    def shade_note():
        if shade_source == "measured":
            return f"shaded by {shade_by_hour}:00"
        elif shade_source == "estimated":
            return f"likely shaded by ~{shade_by_hour}:00 (estimated from orientation)"
        return None

    if day["precipitation_mm"] > 5:
        score -= 60
        reasons.append("Significant rain expected")
    elif day["precipitation_mm"] > 0.5:
        score -= 25
        reasons.append("Light rain possible")

    # TEMPERATURE SCORING
    # Real climbing conditions: anything above 35°C is genuinely dangerous.
    # Even with shade, rock absorbs heat and skin-contact temps are higher
    # than air temperature.
    temp = day["temp_max_c"]

    if temp > 40:
        # Above 40°C: basically unclimbable. Shade helps a little but not enough.
        if shaded_at_climb_time:
            score -= 55
            reasons.append(f"Dangerously hot ({temp}°C), {shade_note()} helps slightly")
        else:
            score -= 75
            reasons.append(f"Dangerously hot ({temp}°C) — do not climb in direct sun")
    elif temp > 35:
        # 35–40°C: very uncomfortable. Only feasible with shade.
        if shaded_at_climb_time:
            score -= 35
            reasons.append(f"Very hot ({temp}°C), but {shade_note()}")
        else:
            score -= 55
            reasons.append(f"Very hot ({temp}°C), sun-exposed — high heat risk")
    elif temp > 30:
        # 30–35°C: hot but manageable with shade.
        if shaded_at_climb_time:
            score -= 10
            reasons.append(f"Warm ({temp}°C), {shade_note()} — shade makes it OK")
        else:
            score -= 30
            reasons.append(f"Hot ({temp}°C), sun-exposed — consider shade timing")
    elif temp < 5:
        score -= 30
        reasons.append(f"Very cold ({temp}°C) — fingers will suffer")
    elif temp < 10:
        score -= 15
        reasons.append(f"Cold ({temp}°C) — layer up")


    if day["wind_max_kmh"] > 50:
        score -= 25
        reasons.append("Strong wind")
    elif day["wind_max_kmh"] > 35:
        score -= 10
        reasons.append("Breezy")

    score = max(0, min(100, score))

    if score >= 80:
        label = "Excellent"
    elif score >= 60:
        label = "Good"
    elif score >= 35:
        label = "Marginal"
    else:
        label = "Poor"

    return {
        "score": score,
        "label": label,
        "reasons": reasons or ["Good conditions"],
        "shade_by_hour": shade_by_hour,
        "shade_data_source": shade_source,
    }


def score_forecast(forecast: list[dict], sector: dict | None = None, climb_hour: float = 12.0) -> list[dict]:
    return [{**day, **score_day(day, sector, climb_hour)} for day in forecast]