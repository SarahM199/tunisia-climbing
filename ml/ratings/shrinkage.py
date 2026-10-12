"""
Rating shrinkage — making averages safe to rank on.

THE PROBLEM
A plain average treats one rating as seriously as fifty. A sector with a
single 5-star rating outranks one with twenty ratings averaging 4.6, which
is backwards: twenty people agreeing is far stronger evidence than one
person's opinion.

THE FIX
A Bayesian average. Every sector starts with `m` imaginary ratings sitting
at the global average, and its own ratings have to outweigh them:

    adjusted = (m * prior_mean + n * raw_mean) / (m + n)

Equivalently, as a tug-of-war between two weights that always sum to 1:

    adjusted = (n/(n+m)) * raw_mean  +  (m/(n+m)) * prior_mean

Two properties worth knowing, because they're why this works:

1. The result ALWAYS lies between raw_mean and prior_mean. It's a weighted
   average of the two, so it mathematically cannot escape that range.
   Useful as a sanity check on any output.

2. As n grows, the prior's weight shrinks to nothing and the result
   converges on raw_mean. So this needs no revisiting if ratings take off —
   it self-corrects.

NOTE ON WILSON
Wilson score intervals are the usual answer to this problem, but they model
a binomial proportion — up/down votes. Our ratings are 1-5 stars, which is
ordinal, and squashing them into a proportion would lose the difference
between "two people said 3" and "one said 1, one said 5". Bayesian average
is the right tool for star ratings.

This module is deliberately pure: no database, no pandas, no imports from
the app. That keeps it trivially testable and reusable.
"""

# How many ratings before a sector's own average earns 50% of the weight.
#
# At n == m the weights are exactly 50/50, which is the most useful way to
# read this number: "how many climbers do I need before I half-believe the
# average?" IMDb uses tens of thousands because they have millions of votes.
# Tunisia has a few hundred climbers, so 5 is the right order of magnitude —
# below 3 and one person swings everything, above ~10 and nothing moves.
DEFAULT_WEIGHT = 5.0

# Used only when the database holds no ratings at all and there's genuinely
# no prior to compute. Midpoint of the 1-5 scale.
FALLBACK_PRIOR = 3.0


def resolve_prior_mean(
    global_mean: float | None, fallback: float = FALLBACK_PRIOR
) -> float:
    """
    The prior is the global average across every rating on the site.

    Returns the fallback when there are no ratings yet, so callers never
    have to special-case an empty database.
    """
    if global_mean is None:
        return fallback
    return float(global_mean)


def bayesian_average(
    raw_mean: float | None,
    n: int,
    prior_mean: float,
    m: float = DEFAULT_WEIGHT,
) -> float:
    """
    Shrink a sector's own average towards the global prior, weighted by
    how much evidence supports it.

    Args:
        raw_mean:   the sector's own mean rating, or None if unrated
        n:          how many ratings that sector has
        prior_mean: the global mean across all ratings
        m:          the weight — imaginary ratings sitting at the prior

    Returns:
        The adjusted rating, always between raw_mean and prior_mean.

    An unrated sector returns exactly prior_mean. That's deliberate: a newly
    bolted sector is *unknown*, not bad, so it belongs mid-table rather than
    at the bottom. Note the formula gives this for free — with n=0 it reduces
    to (m * prior_mean) / m — but raw_mean is None in that case, so the
    arithmetic would raise. Hence the explicit guard.
    """
    if n <= 0 or raw_mean is None:
        return float(prior_mean)

    # m <= 0 means "don't shrink at all". Guarding here rather than letting
    # it divide by zero when n is also 0.
    if m <= 0:
        return float(raw_mean)

    return (m * float(prior_mean) + n * float(raw_mean)) / (m + n)
