import pandas as pd


def calculate_reweighing_weights(sensitive_groups, target):

    data = pd.DataFrame({
        "group": sensitive_groups,
        "target": target
    })

    # Overall probabilities
    group_probability = data["group"].value_counts(normalize=True)
    target_probability = data["target"].value_counts(normalize=True)

    # Joint probability of each group and outcome
    joint_probability = (
        data.groupby(["group", "target"], observed=True)
        .size() / len(data)
    )

    weights = []

    for _, row in data.iterrows():

        group = row["group"]
        outcome = row["target"]

        joint = joint_probability.get((group, outcome), 0)

        if joint == 0:
            raise ValueError(
                "Cannot calculate weights for an absent group-outcome combination."
            )

        weight = (
            group_probability[group] * target_probability[outcome]
        ) / joint

        weights.append(weight)

    return weights