"""Stability detection of "Multi-Agent Debate for LLM Judges with Adaptive Stability Detection" (NeurIPS 2025).

The paper fits, per debate round t, a two-component Beta-Binomial mixture to the number of correct judges
S^t (out of k) observed over a set of tasks, and stops when the Kolmogorov-Smirnov distance between the
fitted distributions of consecutive rounds stays below 0.05 for 2 rounds.

This needs a sample of many cases, so it cannot run inside one user's verdict. It is used offline, on an
evaluation set, to check whether the cheap per-verdict rule in app/verdict.py stops at a sensible round.
Requires scipy (requirements-dev.txt).
"""

import numpy as np
from scipy.optimize import minimize
from scipy.stats import beta, betabinom

GRID = np.linspace(0, 1, 1001)


def fit_mixture(scores, k, iterations=100, tolerance=1e-6):
    """EM for S ~ w*BB(k,a1,b1) + (1-w)*BB(k,a2,b2). Returns (w, a1, b1, a2, b2)."""
    scores = np.asarray(scores)
    weight, shapes = 0.5, [np.array([2.0, 5.0]), np.array([5.0, 2.0])]  # one low-accuracy and one high-accuracy component
    previous = -np.inf
    for _ in range(iterations):
        parts = np.array([weight * betabinom.pmf(scores, k, *shapes[0]), (1 - weight) * betabinom.pmf(scores, k, *shapes[1])]) + 1e-300
        likelihood = float(np.log(parts.sum(axis=0)).sum())
        responsibility = parts / parts.sum(axis=0)  # E-step
        weight = float(np.clip(responsibility[0].mean(), 1e-3, 1 - 1e-3))  # M-step: weight in closed form, shapes by L-BFGS-B
        for index in range(2):
            objective = lambda log_shape: -float((responsibility[index] * betabinom.logpmf(scores, k, *np.exp(log_shape))).sum())
            shapes[index] = np.exp(minimize(objective, np.log(shapes[index]), method="L-BFGS-B", bounds=[(-4, 6)] * 2).x)
        if abs(likelihood - previous) < tolerance:
            break
        previous = likelihood
    return (weight, *shapes[0], *shapes[1])


def mixture_cdf(parameters):
    weight, a1, b1, a2, b2 = parameters
    return weight * beta.cdf(GRID, a1, b1) + (1 - weight) * beta.cdf(GRID, a2, b2)


def ks_between(first, second) -> float:
    """D_t = sup |F^t - F^(t-1)| over the latent judge-accuracy distribution."""
    return float(np.abs(mixture_cdf(first) - mixture_cdf(second)).max())


def stopping_round(scores_by_round, k, threshold=0.05, patience=2):
    """Replay the paper's rule on per-round score samples. Returns (round or None, [D_2, D_3, ...])."""
    fits = [fit_mixture(scores, k) for scores in scores_by_round]
    distances = [ks_between(fits[t - 1], fits[t]) for t in range(1, len(fits))]
    run = 0
    for index, distance in enumerate(distances):
        run = run + 1 if distance < threshold else 0
        if run >= patience:
            return index + 2, distances
    return None, distances
