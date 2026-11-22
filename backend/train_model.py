import pandas as pd

from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix
)

from fairness import (
    calculate_fairness,
    calculate_equal_opportunity
)


# ==========================================
# 1. LOAD DATASET
# ==========================================

dataset_path = (
    Path(__file__).resolve().parent.parent
    / "datasets"
    / "hiring_data.csv"
)

data = pd.read_csv(dataset_path)

print("\n======================================")
print("       FAIRGAUGE AI - MODEL AUDIT")
print("======================================")

print("Total dataset records:", len(data))


# ==========================================
# 2. SEPARATE FEATURES AND TARGET
# ==========================================

X = data[
    [
        "gender",
        "experience",
        "test_score",
        "interview_score"
    ]
]

y = data["hired"]


# ==========================================
# 3. ENCODE CATEGORICAL DATA
# ==========================================

X = pd.get_dummies(
    X,
    columns=["gender"],
    drop_first=True
)


# ==========================================
# 4. SPLIT DATASET
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

print("\nTraining records:", len(X_train))
print("Testing records:", len(X_test))


# ==========================================
# 5. TRAIN MACHINE LEARNING MODEL
# ==========================================

model = LogisticRegression(max_iter=1000)

model.fit(X_train, y_train)

print("\nModel training completed successfully!")


# ==========================================
# 6. GENERATE PREDICTIONS
# ==========================================

predictions = model.predict(X_test)


# ==========================================
# 7. MODEL PERFORMANCE METRICS
# ==========================================

accuracy = accuracy_score(y_test, predictions)

precision = precision_score(
    y_test,
    predictions,
    zero_division=0
)

recall = recall_score(
    y_test,
    predictions,
    zero_division=0
)

f1 = f1_score(
    y_test,
    predictions,
    zero_division=0
)

cm = confusion_matrix(y_test, predictions)


print("\n======================================")
print("       MODEL PERFORMANCE")
print("======================================")

print("Accuracy:", round(accuracy * 100, 2), "%")
print("Precision:", round(precision * 100, 2), "%")
print("Recall:", round(recall * 100, 2), "%")
print("F1 Score:", round(f1 * 100, 2), "%")

print("\nConfusion Matrix:")
print(cm)


# ==========================================
# 8. ML MODEL REPORT
# ==========================================

print("\n======================================")
print("       ML MODEL REPORT")
print("======================================")

print("Dataset records:", len(data))
print("Training records:", len(X_train))
print("Testing records:", len(X_test))
print("Model accuracy:", round(accuracy * 100, 2), "%")


# ==========================================
# 9. PRESERVE DEMOGRAPHIC INFORMATION
# ==========================================

group_test = data.loc[X_test.index, "gender"]

predicted_series = pd.Series(
    predictions,
    index=X_test.index
)

# Identify demographic groups
male_mask = group_test == "Male"
female_mask = group_test == "Female"


# ==========================================
# 10. DEMOGRAPHIC PARITY AUDIT
# ==========================================

male_total = int(male_mask.sum())
female_total = int(female_mask.sum())

male_selected = int(
    predicted_series[male_mask].sum()
)

female_selected = int(
    predicted_series[female_mask].sum()
)

fairness_report = calculate_fairness(
    group_a_total=male_total,
    group_a_selected=male_selected,
    group_b_total=female_total,
    group_b_selected=female_selected
)


print("\n======================================")
print("       FAIRNESS AUDIT REPORT")
print("======================================")

print("Group A: Male")
print("Group B: Female")

for key, value in fairness_report.items():
    print(f"{key}: {value}")


# ==========================================
# 11. EQUAL OPPORTUNITY AUDIT
# ==========================================

eop_report = calculate_equal_opportunity(
    y_true=y_test,
    y_pred=predictions,
    sensitive_groups=group_test
)


print("\n======================================")
print("       EQUAL OPPORTUNITY AUDIT")
print("======================================")

for key, value in eop_report.items():
    print(f"{key}: {value}")


# ==========================================
# 12. AUDIT COMPLETED
# ==========================================

print("\n======================================")
print("       FAIRGAUGE AI AUDIT COMPLETED")
print("======================================")