"""
Wraps the Open-Meteo API — free, no API key needed.
Docs: https://open-meteo.com/en/docs
"""
import requests
from datetime import date as _date

BASE_URL = "https://api.open-meteo.com/v1/forecast"


def get_daily_forecast(latitude: float, longitude: float, days: int = 7) -> list[dict]:
    """
    Returns a list of daily forecast dicts, one per day, each with:
    date, temp_max_c, temp_min_c, precipitation_mm, wind_max_kmh
    """
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": [
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "wind_speed_10m_max",
        ],
        "forecast_days": days,
        "timezone": "auto",
    }

    response = requests.get(BASE_URL, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()

    daily = data["daily"]
    forecast = []
    for i, date in enumerate(daily["time"]):
        forecast.append({
            "date": date,
            "temp_max_c": daily["temperature_2m_max"][i],
            "temp_min_c": daily["temperature_2m_min"][i],
            "precipitation_mm": daily["precipitation_sum"][i],
            "wind_max_kmh": daily["wind_speed_10m_max"][i],
        })
    return forecast


def resolve_forecast_day(forecast: list[dict], target_date: str) -> dict:
    """
    Finds target_date in the forecast. If it's not present (e.g. it's in
    the past, or beyond the forecast window), falls back to the closest
    available date instead of failing outright.
    Returns the day dict, plus 'exact_match': bool and 'requested_date'.
    """
    exact = next((d for d in forecast if d["date"] == target_date), None)
    if exact is not None:
        return {**exact, "exact_match": True, "requested_date": target_date}

    target = _date.fromisoformat(target_date)
    closest = min(
        forecast,
        key=lambda d: abs((_date.fromisoformat(d["date"]) - target).days),
    )
    return {**closest, "exact_match": False, "requested_date": target_date}