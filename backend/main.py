import pandas as pd
import shap
import os

from io import BytesIO

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pandas.errors import EmptyDataError, ParserError

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score
)

from backend.fairness import (
    calculate_fairness,
    calculate_equal_opportunity
)

from backend.recommendations import generate_recommendations

from backend.mitigation import calculate_reweighing_weights


# --------------------------------------------------
# 1. INITIALIZE FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="FairGauge AI",
    description="Responsible AI Auditing and Optimization Platform",
    version="1.0.0"
)


# --------------------------------------------------
# 2. ENABLE CORS FOR REACT FRONTEND
# --------------------------------------------------

frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGIN", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        *frontend_origins
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# 3. HOME ENDPOINT
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to FairGauge AI",
        "status": "Backend is running successfully"
    }


# --------------------------------------------------
# 4. HEALTH CHECK ENDPOINT
# --------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


# --------------------------------------------------
# 5. AI AUDIT ENDPOINT
# --------------------------------------------------

@app.post("/audit")
async def audit_dataset(file: UploadFile = File(...)):

    # --------------------------------------------------
    # VALIDATE UPLOADED FILE
    # --------------------------------------------------

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a CSV file."
        )

    try:

        # --------------------------------------------------
        # STEP 1: READ CSV DATASET
        # --------------------------------------------------

        contents = await file.read()

        if not contents or not contents.strip():
            raise HTTPException(
                status_code=400,
                detail="The uploaded CSV file is empty. Please upload a CSV containing column headers and data records."
            )

        try:
            data = pd.read_csv(BytesIO(contents))
        except EmptyDataError:
            raise HTTPException(
                status_code=400,
                detail="The uploaded CSV file is empty or does not contain a valid header row."
            )
        except ParserError:
            raise HTTPException(
                status_code=400,
                detail="The CSV file could not be read. Please check its formatting and try again."
            )

        required_columns = [
            "gender",
            "experience",
            "test_score",
            "interview_score",
            "hired"
        ]

        missing = [
            col for col in required_columns
            if col not in data.columns
        ]

        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing)}"
            )

        if data.empty:
            raise HTTPException(
                status_code=400,
                detail="The uploaded dataset has column headers but no data records. Please add at least one data row."
            )

        if data[required_columns].isnull().any().any():
            missing_columns = data[required_columns].columns[
                data[required_columns].isnull().any()
            ].tolist()
            raise HTTPException(
                status_code=400,
                detail=(
                    "Dataset contains missing values in: "
                    f"{', '.join(missing_columns)}. "
                    "Please fill in these values before running the audit."
                )
            )

        # --------------------------------------------------
        # STEP 1B: VALIDATE DATA TYPES
        # --------------------------------------------------

        numeric_columns = [
            "experience",
            "test_score",
            "interview_score",
            "hired"
        ]

        for col in numeric_columns:
            original_values = data[col].copy()
            converted_values = pd.to_numeric(
                original_values,
                errors="coerce"
            )

            invalid_mask = converted_values.isna() & original_values.notna()

            if invalid_mask.any():
                invalid_value = str(original_values[invalid_mask].iloc[0])
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Invalid numeric value in the '{col}' column: "
                        f"'{invalid_value}'. Please enter valid numbers only."
                    )
                )

            data[col] = converted_values

        if not data["hired"].isin([0, 1]).all():
            raise HTTPException(
                status_code=400,
                detail="The hired column must contain only 0 and 1."
            )

        if data["hired"].nunique() != 2:
            raise HTTPException(
                status_code=400,
                detail="The hired column must contain both 0 and 1."
            )

        # Validate demographic groups
        if not set(data["gender"].unique()).issubset(
            {"Male", "Female"}
        ):
            raise HTTPException(
                status_code=400,
                detail="This prototype currently supports Male and Female groups."
            )

        if data["gender"].nunique() != 2:
            raise HTTPException(
                status_code=400,
                detail="Both Male and Female groups are required."
            )

        # --------------------------------------------------
        # STEP 2: SEPARATE FEATURES AND TARGET
        # --------------------------------------------------

        X = data[
            [
                "gender",
                "experience",
                "test_score",
                "interview_score"
            ]
        ]

        y = data["hired"]

        # Convert gender into numerical columns
        X = pd.get_dummies(
            X,
            columns=["gender"],
            drop_first=True,
            dtype=int
        )

        # --------------------------------------------------
        # STEP 3: SPLIT DATASET
        # --------------------------------------------------

        try:
            X_train, X_test, y_train, y_test = train_test_split(
                X,
                y,
                test_size=0.2,
                random_state=42,
                stratify=y
            )
        except ValueError as error:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The dataset does not contain enough records in each "
                    "hiring outcome group to create a reliable train/test split. "
                    "Please upload a larger dataset with examples of both outcomes."
                )
            )

        # --------------------------------------------------
        # STEP 4: TRAIN ORIGINAL MACHINE LEARNING MODEL
        # --------------------------------------------------

        model = LogisticRegression(
            max_iter=1000
        )

        model.fit(
            X_train,
            y_train
        )

        # Original model predictions and probabilities
        predictions = model.predict(X_test)
        prediction_probabilities = model.predict_proba(X_test)[:, 1]

        # Keep only the held-out test labels, protected-group labels and
        # probabilities needed for the interactive threshold simulator.
        # No training data or personally identifying fields are returned.
        simulator_groups = data.loc[X_test.index, "gender"].astype(str)
        threshold_simulator_data = [
            {
                "actual": int(actual),
                "group": str(group),
                "probability": float(probability),
            }
            for actual, group, probability in zip(
                y_test.tolist(),
                simulator_groups.tolist(),
                prediction_probabilities.tolist(),
            )
        ]

        # --------------------------------------------------
        # STEP 4B: TRAIN BIAS-MITIGATED MODEL
        # --------------------------------------------------

        # Get demographic groups for training records only
        train_groups = data.loc[
            X_train.index,
            "gender"
        ]

        # Calculate reweighing weights
        sample_weights = calculate_reweighing_weights(
            sensitive_groups=train_groups,
            target=y_train
        )

        # Create second Logistic Regression model
        mitigated_model = LogisticRegression(
            max_iter=1000
        )

        # Train using sample weights
        mitigated_model.fit(
            X_train,
            y_train,
            sample_weight=sample_weights
        )

        # Mitigated model predictions
        mitigated_predictions = mitigated_model.predict(X_test)

        # --------------------------------------------------
        # STEP 4C: EXPLAINABLE AI USING SHAP
        # --------------------------------------------------

        # Create SHAP explainer for original Logistic Regression
        explainer = shap.LinearExplainer(
            model,
            X_train
        )

        # Calculate SHAP values for test records
        shap_values = explainer(X_test)

        # Extract contribution values
        shap_array = shap_values.values

        # Calculate global feature importance
        global_importance = []

        for index, feature in enumerate(X_test.columns):

            importance = float(
                abs(shap_array[:, index]).mean()
            )

            global_importance.append({
                "feature": feature,
                "importance": round(importance, 4)
            })

        # Sort features by importance
        global_importance.sort(
            key=lambda item: item["importance"],
            reverse=True
        )

        # Explain the first test record
        sample = X_test.iloc[[0]]

        sample_shap = explainer(sample)

        sample_values = sample_shap.values[0]

        # Get model prediction
        sample_prediction = int(
            model.predict(sample)[0]
        )

        # Get probability of positive class
        sample_probability = float(
            model.predict_proba(sample)[0][1]
        )

        # Extract individual feature contributions
        local_explanation = []

        for index, feature in enumerate(sample.columns):

            local_explanation.append({

                "feature": feature,

                "feature_value": float(
                    sample.iloc[0, index]
                ),

                "shap_value": round(
                    float(sample_values[index]),
                    4
                )

            })

        # Extract SHAP base value
        base_value = float(
            sample_shap.base_values[0]
        )

        # Complete explainability report
        explainability_report = {

            "method": "SHAP LinearExplainer",

            "output_scale": "Log-odds",

            "global_feature_importance": global_importance,

            "individual_prediction": {

                "predicted_class": sample_prediction,

                "probability_hired": round(
                    sample_probability * 100,
                    2
                ),

                "base_value": round(
                    base_value,
                    4
                ),

                "feature_contributions": local_explanation

            }

        }

        # --------------------------------------------------
        # STEP 5: CALCULATE ORIGINAL MODEL PERFORMANCE
        # --------------------------------------------------

        accuracy = accuracy_score(
            y_test,
            predictions
        )

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

        model_performance = {

            "accuracy": round(accuracy * 100, 2),

            "precision": round(precision * 100, 2),

            "recall": round(recall * 100, 2),

            "f1_score": round(f1 * 100, 2)

        }

        # --------------------------------------------------
        # STEP 5B: MITIGATED MODEL PERFORMANCE
        # --------------------------------------------------

        mitigated_performance = {

            "accuracy": round(
                accuracy_score(
                    y_test,
                    mitigated_predictions
                ) * 100,
                2
            ),

            "precision": round(
                precision_score(
                    y_test,
                    mitigated_predictions,
                    zero_division=0
                ) * 100,
                2
            ),

            "recall": round(
                recall_score(
                    y_test,
                    mitigated_predictions,
                    zero_division=0
                ) * 100,
                2
            ),

            "f1_score": round(
                f1_score(
                    y_test,
                    mitigated_predictions,
                    zero_division=0
                ) * 100,
                2
            )

        }

        # --------------------------------------------------
        # STEP 6: ORIGINAL DEMOGRAPHIC PARITY
        # --------------------------------------------------

        # Retrieve original gender values for test records
        groups = data.loc[
            X_test.index,
            "gender"
        ]

        # Match predictions with original test indexes
        prediction_series = pd.Series(
            predictions,
            index=X_test.index
        )

        male_mask = groups == "Male"
        female_mask = groups == "Female"

        fairness_report = calculate_fairness(

            group_a_total=int(male_mask.sum()),

            group_a_selected=int(
                prediction_series[male_mask].sum()
            ),

            group_b_total=int(female_mask.sum()),

            group_b_selected=int(
                prediction_series[female_mask].sum()
            )

        )

        # --------------------------------------------------
        # STEP 7: ORIGINAL EQUAL OPPORTUNITY
        # --------------------------------------------------

        eop_report = calculate_equal_opportunity(
            y_true=y_test,
            y_pred=predictions,
            sensitive_groups=groups
        )

        # --------------------------------------------------
        # STEP 7B: MITIGATED FAIRNESS ANALYSIS
        # --------------------------------------------------

        mitigated_prediction_series = pd.Series(
            mitigated_predictions,
            index=X_test.index
        )

        mitigated_fairness = calculate_fairness(

            group_a_total=int(male_mask.sum()),

            group_a_selected=int(
                mitigated_prediction_series[male_mask].sum()
            ),

            group_b_total=int(female_mask.sum()),

            group_b_selected=int(
                mitigated_prediction_series[female_mask].sum()
            )

        )

        mitigated_eop = calculate_equal_opportunity(
            y_true=y_test,
            y_pred=mitigated_predictions,
            sensitive_groups=groups
        )

        # --------------------------------------------------
        # STEP 8: GENERATE AI AUDIT RECOMMENDATIONS
        # --------------------------------------------------

        recommendations = generate_recommendations(

            demographic_parity=fairness_report,

            equal_opportunity=eop_report,

            model_performance=model_performance

        )

        # --------------------------------------------------
        # STEP 9: RETURN COMPLETE AUDIT REPORT
        # --------------------------------------------------

        return {

            "message": "AI audit completed successfully",

            # Dataset information
            "dataset": {

                "total_records": int(len(data)),

                "training_records": int(len(X_train)),

                "testing_records": int(len(X_test))

            },

            # Original model results
            "model_performance": model_performance,

            "demographic_parity": fairness_report,

            "equal_opportunity": eop_report,

            # Held-out test-set data for the interactive threshold simulator
            "threshold_simulator": threshold_simulator_data,

            # Bias mitigation experiment results
            "mitigation": {

                "method": "Reweighing",

                "model_performance": mitigated_performance,

                "demographic_parity": mitigated_fairness,

                "equal_opportunity": mitigated_eop

            },

            # Explainable AI results
            "explainability": explainability_report,

            # Recommendations
            "recommendations": recommendations,

            # Disclaimer
            "disclaimer": (

                "Fairness metrics are screening indicators, "

                "not proof of discrimination. Recommendations "

                "require human review before implementation. "

                "Bias mitigation results are experimental and "

                "do not guarantee fairness. SHAP explanations "

                "describe model contributions, not causal effects."

            )

        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="The audit could not be completed because of an unexpected server error. Please verify the dataset and try again."
        )
