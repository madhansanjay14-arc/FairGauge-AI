def generate_recommendations(
    demographic_parity,
    equal_opportunity,
    model_performance
):
    recommendations = []

    # 1. Check demographic parity
    dpd = abs(
        demographic_parity["demographic_parity_difference"]
    )

    if dpd >= 0.05:
        recommendations.append({
            "category": "Demographic Parity",
            "severity": "High",
            "finding": (
                f"A selection-rate difference of "
                f"{dpd * 100:.2f} percentage points was detected."
            ),
            "recommendation": (
                "Investigate differences in selection outcomes "
                "between demographic groups. Examine dataset "
                "composition, feature selection and model decisions."
            )
        })

    else:
        recommendations.append({
            "category": "Demographic Parity",
            "severity": "Low",
            "finding": "No large selection-rate gap was detected.",
            "recommendation": (
                "Continue monitoring selection rates across "
                "demographic groups."
            )
        })

    # 2. Check selection rate ratio
    ratio = demographic_parity["selection_rate_ratio"]

    if ratio < 0.8:
        recommendations.append({
            "category": "Selection Rate Ratio",
            "severity": "High",
            "finding": (
                f"The selection rate ratio is {ratio:.4f}."
            ),
            "recommendation": (
                "Review the model's selection patterns and investigate "
                "whether sensitive attributes or proxy features "
                "influence its decisions."
            )
        })

    else:
        recommendations.append({
            "category": "Selection Rate Ratio",
            "severity": "Low",
            "finding": (
                f"The selection rate ratio is {ratio:.4f}."
            ),
            "recommendation": (
                "Continue monitoring the selection rate ratio "
                "during future model evaluations."
            )
        })

    # 3. Check equal opportunity
    eod = equal_opportunity[
        "equal_opportunity_difference"
    ]

    if eod is None:
        recommendations.append({
            "category": "Equal Opportunity",
            "severity": "Medium",
            "finding": (
                "Equal Opportunity Difference could not be calculated."
            ),
            "recommendation": (
                "Check whether both demographic groups contain "
                "actual positive cases in the test dataset."
            )
        })

    elif abs(eod) >= 0.05:
        recommendations.append({
            "category": "Equal Opportunity",
            "severity": "High",
            "finding": (
                f"True positive rates differ by "
                f"{abs(eod) * 100:.2f} percentage points."
            ),
            "recommendation": (
                "Investigate whether qualified candidates from "
                "different groups are being correctly identified "
                "at different rates."
            )
        })

    else:
        recommendations.append({
            "category": "Equal Opportunity",
            "severity": "Low",
            "finding": (
                "No large true positive rate difference was detected."
            ),
            "recommendation": (
                "Continue monitoring true positive rates across "
                "demographic groups."
            )
        })

    # 4. Check model accuracy
    accuracy = model_performance["accuracy"]

    if accuracy < 70:
        recommendations.append({
            "category": "Model Performance",
            "severity": "Medium",
            "finding": f"Model accuracy is {accuracy}%.",
            "recommendation": (
                "Review data quality, feature selection and model "
                "configuration. Evaluate performance on additional "
                "representative data."
            )
        })

    else:
        recommendations.append({
            "category": "Model Performance",
            "severity": "Low",
            "finding": f"Model accuracy is {accuracy}%.",
            "recommendation": (
                "Continue evaluating model performance on "
                "representative unseen datasets."
            )
        })

    return recommendations

if __name__ == "__main__":

    demographic_parity = {
        "demographic_parity_difference": -0.3093,
        "selection_rate_ratio": 0.6424
    }

    equal_opportunity = {
        "equal_opportunity_difference": 0.0
    }

    model_performance = {
        "accuracy": 100
    }

    result = generate_recommendations(
        demographic_parity,
        equal_opportunity,
        model_performance
    )

    for item in result:
        print("\nCategory:", item["category"])
        print("Severity:", item["severity"])
        print("Finding:", item["finding"])
        print("Recommendation:", item["recommendation"])