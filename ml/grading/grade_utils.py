"""
French sport climbing grade ordering, comparison, and warm-up logic.
"""

GRADE_ORDER = [
    "1", "2", "3", "4",
    "5a", "5a+", "5b", "5b+", "5c", "5c+",
    "6a", "6a+", "6b", "6b+", "6c", "6c+",
    "7a", "7a+", "7b", "7b+", "7c", "7c+",
    "8a", "8a+", "8b", "8b+", "8c", "8c+",
    "9a", "9a+", "9b", "9b+", "9c",
]
GRADE_TO_VALUE = {g.lower(): i for i, g in enumerate(GRADE_ORDER)}


def grade_to_value(grade: str | None) -> int | None:
    if not grade:
        return None
    return GRADE_TO_VALUE.get(grade.strip().lower())


def value_to_grade(value: int) -> str:
    return GRADE_ORDER[max(0, min(value, len(GRADE_ORDER) - 1))]


def grade_tier(project_value: int) -> tuple[int, int]:
    """
    Returns (min_steps, max_steps) — how many grade-steps below the
    project grade is a reasonable warm-up range. Lower grades get a
    narrower range since there's less room below them; higher grades
    get more room to search.
    """
    if project_value <= 9:      # up to 5c+
        return (1, 2)
    elif project_value <= 13:   # 6a - 6b+
        return (2, 4)
    elif project_value <= 17:   # 6c - 7a+
        return (3, 5)
    elif project_value <= 21:   # 7b - 7c+
        return (4, 6)
    else:                       # 8a and above
        return (5, 7)


def qualifies_for_floor(
    project_value: int,
    floor_value: int,
    grade_min: str | None,
    grade_max: str | None,
) -> bool:
    """
    True if this sector's range includes the project grade AND has
    something at or below floor_value to warm up on.
    """
    min_val = grade_to_value(grade_min)
    max_val = grade_to_value(grade_max)

    if min_val is None and max_val is None:
        return False
    if min_val is None:
        min_val = max_val
    if max_val is None:
        max_val = min_val

    has_project_route = min_val <= project_value <= max_val
    has_warmup_room = min_val <= floor_value or min_val < project_value

    return has_project_route and has_warmup_room