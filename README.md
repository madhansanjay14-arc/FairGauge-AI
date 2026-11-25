# FairGauge AI
### Responsible AI Auditing & Optimization Platform

**Beyond accuracy. Towards accountable AI.**

FairGauge AI is a web-based Responsible AI auditing platform developed to evaluate machine learning models beyond conventional performance metrics.

It combines dataset inspection, predictive performance evaluation, demographic fairness analysis, explainable AI, bias mitigation, and audit reporting into a single application.

The platform helps developers investigate potential demographic disparities, understand model behaviour, and evaluate the trade-offs involved in fairness mitigation.

**Our objective is simple: make machine learning systems easier to audit, understand, and improve.**

---

## The Problem

A machine learning model can achieve excellent prediction accuracy while producing different outcomes for different demographic groups.

Traditional model evaluation primarily focuses on accuracy, precision, recall, and F1-score. These metrics alone do not reveal every potential fairness concern.

For example, an AI-based recruitment model might predict hiring outcomes accurately while having substantially different selection rates across demographic groups.

Developers need a practical way to investigate:

- Whether prediction outcomes differ across demographic groups.
- Whether model performance hides potential fairness concerns.
- Which features contribute to model predictions.
- Whether mitigation techniques change identified disparities.
- What trade-offs occur between fairness and predictive performance.

## Our Solution

FairGauge AI provides an integrated workflow to inspect datasets, train and evaluate a machine learning model, calculate fairness metrics, explain predictions, apply a mitigation technique, and generate an audit report.

Rather than presenting fairness as a single score, it provides multiple measurements to support responsible model evaluation.

---

## Application Preview

![FairGauge AI Dashboard](docs/images/dashboard.png)

---

## Key Features

| Feature | Implementation |
|---|---|
| CSV Dataset Upload | Upload and validate structured datasets |
| Dataset Audit | Inspect records, columns, missing values, duplicates, and statistics |
| Model Evaluation | Accuracy, precision, recall, F1-score |
| Fairness Analysis | Demographic Parity Difference, Selection Rate Ratio, Equal Opportunity |
| Disparity Identification | Highlight potential differences in group outcomes |
| Explainable AI | Global and local SHAP explanations |
| Bias Mitigation | Reweighing-based training sample weights |
| Comparative Analysis | Compare original and mitigated model results |
| Recommendations | Generate audit recommendations |
| What-If Simulator | Explore fairness metrics using adjustable thresholds |
| PDF Export | Generate downloadable audit reports |

---

## How the Platform Works

The application follows an end-to-end auditing workflow.

1. **Upload Dataset:** The user uploads a CSV file.
2. **Validate and Inspect:** The backend validates the dataset and the frontend provides dataset inspection.
3. **Train and Evaluate:** A Logistic Regression model is trained and evaluated.
4. **Calculate Fairness:** The platform calculates group selection rates and fairness metrics.
5. **Explain Predictions:** SHAP is used to understand feature contributions.
6. **Apply Mitigation:** Reweighing is applied during model training.
7. **Compare Results:** Original and mitigated model performance and fairness are compared.
8. **Generate Report:** Audit results can be exported as a PDF.

---

## Technology Stack — Actual Implementation

This project uses a React-based frontend and a Python FastAPI backend.

### Frontend

| Technology | How We Used It |
|---|---|
| React 19 | Built the interactive dashboard and application components |
| Vite 8 | Frontend development server and production build |
| Tailwind CSS 4 | Utility-based styling integration |
| Custom CSS | Dashboard layout, themes, responsive styling, and UI components |
| Recharts | Fairness and model evaluation visualizations |
| Lucide React | Interface icons |
| jsPDF | Client-side PDF audit report generation |

### Backend

| Technology | How We Used It |
|---|---|
| Python | Backend application and audit logic |
| FastAPI | REST API and CSV upload processing |
| Uvicorn | ASGI server for running the backend |
| Pandas | CSV reading, validation, and dataset processing |
| NumPy | Numerical operations |
| Scikit-learn | Logistic Regression, train-test splitting, and model evaluation |
| SHAP | Model explainability using LinearExplainer |
| python-multipart | Multipart file upload handling |

### Development and Deployment

| Tool | Purpose |
|---|---|
| Git | Version control |
| GitHub | Source code repository |
| VS Code | Development environment |
| Vercel | Frontend deployment |
| Render | Backend deployment |

---

## System Architecture

```text
                  USER
                   |
                   v
          REACT 19 FRONTEND
              (Vite 8)
                   |
             HTTP REQUESTS
                   |
                   v
           FASTAPI BACKEND
                   |
                   v
           CSV VALIDATION
                   |
                   v
        PANDAS / NUMPY PROCESSING
                   |
                   v
        TRAIN / TEST DATA SPLIT
                   |
                   v
       LOGISTIC REGRESSION MODEL
             (Scikit-learn)
                   |
          +--------+---------+
          |        |         |
          v        v         v
      MODEL    FAIRNESS     SHAP
    EVALUATION  ANALYSIS  EXPLANATION
          |        |         |
          +--------+---------+
                   |
                   v
          REWEIGHING MITIGATION
                   |
                   v
         ORIGINAL VS MITIGATED
              COMPARISON
                   |
                   v
            RECOMMENDATIONS
                   |
                   v
           REACT DASHBOARD
                   |
                   v
             PDF REPORT
                (jsPDF)
```

---

## Fairness Evaluation

FairGauge AI implements fairness calculations to evaluate differences in outcomes between demographic groups.

### 1. Demographic Parity Difference (DPD)

Measures the difference in positive prediction rates between two groups.

`DPD = Selection Rate (Group B) - Selection Rate (Group A)`

The absolute value represents the magnitude of the difference.

### 2. Selection Rate Ratio (SRR)

Compares the lower selection rate with the higher selection rate.

`SRR = Lower Selection Rate / Higher Selection Rate`

### 3. True Positive Rate (TPR)

Measures the proportion of actual positive cases correctly predicted.

`TPR = TP / (TP + FN)`

### 4. Equal Opportunity Difference (EOD)

Measures the difference in true positive rates between groups.

`EOD = TPR (Group A) - TPR (Group B)`

For the current hiring demonstration:

- Group A = Female
- Group B = Male

These metrics are fairness screening indicators. Their interpretation depends on the application context and the fairness requirements of the system.

---

## Experimental Evaluation

### Demonstration Use Case: AI-Based Hiring

We developed a synthetic hiring dataset containing **500 records** to demonstrate how a machine learning model can produce different selection rates across demographic groups.

The dataset contains:

| Feature | Description |
|---|---|
| gender | Demographic group |
| experience | Years of experience |
| test_score | Assessment score |
| interview_score | Interview score |
| hired | Hiring outcome (0 or 1) |

A gender-related score difference was deliberately introduced into the synthetic dataset to demonstrate potential disparities.

### Model Training

- Algorithm: Logistic Regression
- Dataset size: 500 records
- Training records: 400
- Testing records: 100
- Split: 80:20
- Evaluation: Accuracy, Precision, Recall, F1-score

### Original Model Performance

| Metric | Result |
|---|---:|
| Accuracy | 100% |
| Precision | 100% |
| Recall | 100% |
| F1-Score | 100% |

### Original Model Fairness Results

| Metric | Result |
|---|---:|
| Male Selection Rate | 86.49% |
| Female Selection Rate | 55.56% |
| Absolute Selection Rate Gap | 30.93 percentage points |
| Selection Rate Ratio | 0.6424 |
| Equal Opportunity Difference | 0 |

**Observation:** Despite achieving 100% on the selected synthetic test split, the model demonstrates a substantial difference in selection rates between demographic groups.

This illustrates why model accuracy alone is not a sufficient measure of responsible AI behaviour.

---

## Bias Mitigation — Reweighing

FairGauge AI implements a reweighing-based mitigation technique.

The method calculates training sample weights based on demographic group membership and outcome classes.

These weights are passed to the Logistic Regression model during training.

The objective is to investigate whether adjusting the contribution of training samples changes demographic disparities.

### Before and After Mitigation

| Metric | Original | Mitigated |
|---|---:|---:|
| Accuracy | 100% | 97% |
| Selection Rate Gap | 30.93 pp | 25.05 pp |
| Selection Rate Ratio | 0.6424 | 0.701 |
| Equal Opportunity Difference | 0 | 0.0312 |

### Experimental Findings

- Selection rate gap decreased by 5.88 percentage points.
- Selection rate ratio improved from 0.6424 to 0.701.
- Accuracy decreased from 100% to 97%.
- Equal opportunity difference changed from 0 to 0.0312.

This experiment demonstrates that mitigation can improve one fairness indicator while changing other evaluation metrics.

**FairGauge AI does not claim that bias has been eliminated. It makes the effects of mitigation measurable and supports further investigation.**

*Important: All reported experimental results are from a synthetic demonstration dataset. They are not evidence of real-world discrimination or generalizable model performance.*

---

## Explainable AI — SHAP

FairGauge AI integrates SHAP (SHapley Additive exPlanations) using the `LinearExplainer`.

The implementation provides:

**Global Explanation**
- Mean absolute SHAP feature importance.
- Comparison of feature contributions across the model.

**Local Explanation**
- Explanation of an individual prediction.
- Feature-level contributions to the prediction output.

The SHAP explanations are based on model behaviour and are not causal explanations.

---

## Bias Recommendations

The backend generates recommendations based on identified fairness and model performance conditions.

The recommendations help users understand potential issues and areas requiring further investigation.

They are intended as decision-support guidance, not automatic proof of discrimination or certification of fairness.

---

## API Endpoints

The FastAPI backend exposes the following endpoints:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Backend home endpoint |
| GET | `/health` | Backend health check |
| POST | `/audit` | Upload and audit a CSV dataset |

Interactive API documentation:

`http://127.0.0.1:8000/docs`

---

## Project Structure

```text
FairGauge-AI/
│
├── backend/
│   ├── main.py
│   ├── fairness.py
│   ├── mitigation.py
│   ├── recommendations.py
│   ├── create_dataset.py
│   ├── train_model.py
│   └── test_fairness.py
│
├── frontend/
│   ├── public/
│   │   └── demo_hiring_data.csv
│   └── src/
│       ├── components/
│       │   └── FairnessMetrics.jsx
│       ├── App.jsx
│       ├── App.css
│       ├── index.css
│       └── main.jsx
│
├── datasets/
├── reports/
├── docs/
│   └── images/
│       └── dashboard.png
│
├── requirements.txt
├── README.md
└── .gitignore
```

---

## Run the Project Locally

### Prerequisites

- Python
- Node.js and npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/madhansanjay14-arc/FairGauge-AI.git

cd FairGauge-AI
```

### 2. Backend Setup

Create a virtual environment:

```bash
python -m venv venv
```

Activate it using Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Start the backend server:

```bash
uvicorn backend.main:app --reload
```

Backend:

`http://127.0.0.1:8000`

API documentation:

`http://127.0.0.1:8000/docs`

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install Node.js dependencies:

```bash
npm install
```

Create a `.env` file inside the frontend directory:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start the frontend:

```bash
npm run dev
```

Frontend:

`http://localhost:5173`

Keep both development servers running while using the application.

---

## Responsible AI: Limitations and Considerations

FairGauge AI is an auditing and decision-support platform, not an automatic fairness certification system.

- Synthetic demonstration data cannot establish real-world discrimination.
- Fairness metrics depend on the selected demographic attributes and application context.
- Demographic parity is not a universal definition of fairness.
- Mitigation techniques may introduce trade-offs between fairness and predictive performance.
- SHAP explanations do not establish causality.
- Real-world deployment requires further validation, domain expertise, and human review.

---

## Future Scope

Potential future development includes:

- Additional fairness metrics and mitigation algorithms.
- Support for multiple demographic attributes.
- Evaluation of additional machine learning algorithms.
- Testing with larger and more diverse real-world datasets.
- Expanded explainability and audit reporting.
- Continuous fairness monitoring for deployed models.

These are future development directions, not claims about the current implementation.

---

## Live Deployment

**Frontend Application:**  
https://fair-gauge-ai.vercel.app/

**Backend API:**  
https://fairgauge-ai-backend.onrender.com

**GitHub Repository:**  
https://github.com/madhansanjay14-arc/FairGauge-AI

---

## Team

**Team Name:** DataWizards

**Institution:** Sri Krishna College of Engineering and Technology (SKCET)

**Project:** FairGauge AI – Responsible AI Auditing & Optimization Platform

---

### Our Vision

We believe AI systems should not only be evaluated by how accurately they predict, but also by how their decisions affect different groups.

**FairGauge AI — Making AI measurable, explainable, and accountable.**
