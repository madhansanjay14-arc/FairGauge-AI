import pandas as pd


# ==========================================
# 1. DEMOGRAPHIC PARITY AUDIT
# ==========================================

def calculate_fairness(
    group_a_total,
    group_a_selected,
    group_b_total,
    group_b_selected
):
    # Validate input
    if group_a_total <= 0 or group_b_total <= 0:
        raise ValueError("Group totals must be greater than zero.")

    if not (0 <= group_a_selected <= group_a_total):
        raise ValueError("Invalid Group A selected count.")

    if not (0 <= group_b_selected <= group_b_total):
        raise ValueError("Invalid Group B selected count.")

    # Calculate selection rates
    rate_a = group_a_selected / group_a_total
    rate_b = group_b_selected / group_b_total

    # Demographic Parity Difference
    dpd = rate_b - rate_a

    # Selection Rate Ratio
    higher_rate = max(rate_a, rate_b)
    lower_rate = min(rate_a, rate_b)

    selection_rate_ratio = (
        lower_rate / higher_rate
        if higher_rate > 0 else 0
    )

    return {
        "group_a_selection_rate": round(rate_a * 100, 2),
        "group_b_selection_rate": round(rate_b * 100, 2),
        "demographic_parity_difference": round(dpd, 4),
        "absolute_difference": round(abs(dpd) * 100, 2),
        "selection_rate_ratio": round(selection_rate_ratio, 4),
        "status": (
            "Potential disparity detected"
            if abs(dpd) >= 0.05
            else "No large selection-rate gap detected"
        )
    }


# ==========================================
# 2. EQUAL OPPORTUNITY AUDIT
# ==========================================

def calculate_equal_opportunity(
    y_true,
    y_pred,
    sensitive_groups
):

    # Convert inputs into pandas Series
    y_true = pd.Series(y_true).reset_index(drop=True)
    y_pred = pd.Series(y_pred).reset_index(drop=True)

    sensitive_groups = pd.Series(
        sensitive_groups
    ).reset_index(drop=True)

    # Validate input lengths
    if not (
        len(y_true) == len(y_pred) == len(sensitive_groups)
    ):
        raise ValueError(
            "All input arrays must have equal lengths."
        )

    results = {}

    # Calculate TPR for each demographic group
    for group in ["Male", "Female"]:

        mask = sensitive_groups == group

        actual = y_true[mask]
        predicted = y_pred[mask]

        true_positive = (
            (actual == 1) & (predicted == 1)
        ).sum()

        false_negative = (
            (actual == 1) & (predicted == 0)
        ).sum()

        denominator = true_positive + false_negative

        tpr = (
            true_positive / denominator
            if denominator > 0 else None
        )

        results[group] = (
            round(float(tpr) * 100, 2)
            if tpr is not None else None
        )

    male_tpr = results["Male"]
    female_tpr = results["Female"]

    # Equal Opportunity Difference
    eod = (
        (female_tpr - male_tpr) / 100
        if male_tpr is not None and female_tpr is not None
        else None
    )

    return {
        "male_tpr": male_tpr,
        "female_tpr": female_tpr,
        "equal_opportunity_difference": (
            round(eod, 4) if eod is not None else None
        )
    }