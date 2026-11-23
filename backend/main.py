import pandas as pd

from io import BytesIO

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
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

    # Validate uploaded file
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

        data = pd.read_csv(BytesIO(contents))

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
                detail=f"Missing columns: {missing}"
            )

        if data.empty:
            raise HTTPException(
                status_code=400,
                detail="The uploaded dataset is empty."
            )

        if data[required_columns].isnull().any().any():
            raise HTTPException(
                status_code=400,
                detail="Dataset contains missing values."
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

        # Validate target column
        if set(data["hired"].unique()) != {0, 1}:
            raise HTTPException(
                status_code=400,
                detail="The hired column must contain both 0 and 1."
            )

        # Validate numerical columns
        numeric_columns = [
            "experience",
            "test_score",
            "interview_score",
            "hired"
        ]

        for col in numeric_columns:
            data[col] = pd.to_numeric(
                data[col],
                errors="raise"
            )

        if not data["hired"].isin([0, 1]).all():
            raise HTTPException(
                status_code=400,
                detail="The hired column must contain only 0 and 1."
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

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42,
            stratify=y
        )

        # --------------------------------------------------
        # STEP 4: TRAIN MACHINE LEARNING MODEL
        # --------------------------------------------------

        model = LogisticRegression(
            max_iter=1000
        )

        model.fit(
            X_train,
            y_train
        )

        # Predict hiring outcomes
        predictions = model.predict(X_test)

        # --------------------------------------------------
        # STEP 5: CALCULATE MODEL PERFORMANCE
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
        # STEP 6: CALCULATE DEMOGRAPHIC PARITY
        # --------------------------------------------------

        # Retrieve original gender values for test records
        groups = data.loc[
            X_test.index,
            "gender"
        ]

        # Match predictions with their original test indexes
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
        # STEP 7: CALCULATE EQUAL OPPORTUNITY
        # --------------------------------------------------

        eop_report = calculate_equal_opportunity(
            y_true=y_test,
            y_pred=predictions,
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

            "dataset": {
                "total_records": int(len(data)),
                "training_records": int(len(X_train)),
                "testing_records": int(len(X_test))
            },

            "model_performance": model_performance,

            "demographic_parity": fairness_report,

            "equal_opportunity": eop_report,

            "recommendations": recommendations,

            "disclaimer": (
                "Fairness metrics are screening indicators, "
                "not proof of discrimination. Recommendations "
                "require human review before implementation."
            )
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )