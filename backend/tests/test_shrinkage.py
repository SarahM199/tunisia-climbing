"""
Tests for the rating shrinkage maths.

Pure functions, no database, no network — so these run in milliseconds and
can't fail for environmental reasons.
"""

import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "ml"))

import pytest

from ratings.shrinkage import (
    FALLBACK_PRIOR,
    bayesian_average,
    resolve_prior_mean,
)

PRIOR = 3.6  # stand-in for a realistic global mean


# --- the test that justifies the whole project -----------------------------

def test_well_evidenced_rating_beats_a_lone_perfect_score():
    """
    The bug this was built to fix: a single 5-star rating should NOT
    outrank twenty ratings averaging 4.6.
    """
    lone_five = bayesian_average(5.0, 1, PRIOR)
    well_liked = bayesian_average(4.6, 20, PRIOR)

    assert well_liked > lone_five


# --- the invariant ---------------------------------------------------------

@pytest.mark.parametrize(
    "raw_mean, n",
    [(5.0, 1), (1.0, 1), (4.6, 20), (3.2, 50), (2.0, 3), (4.9, 200)],
)
def test_result_always_lies_between_raw_mean_and_prior(raw_mean, n):
    """
    A weighted average of two numbers cannot escape the range between them.
    If this ever fails, the formula is wrong.
    """
    adjusted = bayesian_average(raw_mean, n, PRIOR)
    low, high = sorted([raw_mean, PRIOR])
    assert low <= adjusted <= high


# --- edge cases ------------------------------------------------------------

def test_unrated_sector_returns_the_prior():
    """Unknown should sit mid-table, not at the bottom."""
    assert bayesian_average(None, 0, PRIOR) == PRIOR


def test_unrated_sector_does_not_raise_on_none():
    """raw_mean is None in the database for unrated sectors."""
    assert bayesian_average(None, 0, PRIOR) == pytest.approx(PRIOR)


def test_zero_count_with_a_stray_mean_still_returns_prior():
    """n is the authority on whether there's evidence, not raw_mean."""
    assert bayesian_average(4.8, 0, PRIOR) == PRIOR


def test_rating_equal_to_prior_does_not_move():
    """Nothing to shrink towards — it's already there."""
    assert bayesian_average(PRIOR, 7, PRIOR) == pytest.approx(PRIOR)


def test_zero_weight_disables_shrinkage():
    """m <= 0 means 'trust the raw mean', and must not divide by zero."""
    assert bayesian_average(5.0, 1, PRIOR, m=0) == pytest.approx(5.0)


# --- behaviour of the weight ----------------------------------------------

def test_weights_are_fifty_fifty_when_n_equals_m():
    """
    The most useful way to read m: at n == m, a sector's own average earns
    exactly half the weight.
    """
    m = 5.0
    raw = 5.0
    expected = (raw + PRIOR) / 2
    assert bayesian_average(raw, int(m), PRIOR, m=m) == pytest.approx(expected)


def test_more_evidence_moves_closer_to_the_raw_mean():
    """Monotonic convergence — the core property we rely on."""
    raw = 5.0
    distances = [
        abs(raw - bayesian_average(raw, n, PRIOR)) for n in (1, 5, 20, 100)
    ]
    assert distances == sorted(distances, reverse=True)


def test_converges_on_raw_mean_with_lots_of_ratings():
    """So this never needs revisiting if ratings take off."""
    assert bayesian_average(4.6, 100_000, PRIOR) == pytest.approx(4.6, abs=0.01)


def test_higher_weight_compresses_the_spread():
    """
    Large m squashes everything towards the prior, which is why we don't
    copy IMDb's value.
    """
    def spread(m):
        scores = [bayesian_average(r, 1, PRIOR, m=m) for r in (1.0, 5.0)]
        return max(scores) - min(scores)

    assert spread(1) > spread(5) > spread(25)


def test_low_rating_is_pulled_up_and_high_is_pulled_down():
    """Shrinkage works from both directions."""
    assert bayesian_average(1.0, 1, PRIOR) > 1.0
    assert bayesian_average(5.0, 1, PRIOR) < 5.0


# --- the prior -------------------------------------------------------------

def test_prior_falls_back_when_there_are_no_ratings():
    """An empty database shouldn't require special-casing by callers."""
    assert resolve_prior_mean(None) == FALLBACK_PRIOR


def test_prior_passes_through_a_real_value():
    assert resolve_prior_mean(4.1) == pytest.approx(4.1)
