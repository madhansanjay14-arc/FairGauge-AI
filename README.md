# FairGauge AI
### Responsible AI Auditing & Optimization Platform

**Don't just measure how accurate your AI is. Measure how fair it is.**

FairGauge AI is a Responsible AI auditing platform that helps developers identify, understand, and evaluate potential demographic disparities in machine learning systems.

An AI model can achieve excellent prediction accuracy while producing significantly different outcomes for different demographic groups.

FairGauge AI addresses this challenge by bringing model evaluation, fairness auditing, explainability, bias mitigation, and audit reporting into one integrated platform.

**Our objective: Make AI decisions more transparent, measurable, and accountable.**

---

## The Problem: Accuracy Does Not Guarantee Fairness

Imagine an AI-powered recruitment system that predicts whether a candidate should be hired.

The model achieves 100% accuracy on its test dataset. At first glance, it appears successful.

But what if its positive prediction rate is significantly higher for one demographic group than another?

Traditional model evaluation may not reveal this issue because accuracy alone does not measure fairness.

Developers need tools that help them investigate questions such as:

- Are different demographic groups receiving different prediction outcomes?
- Is the model treating qualified candidates differently?
- Which features influence the model's predictions?
- Can mitigation techniques reduce identified disparities?
- What trade-offs occur between fairness and predictive performance?

**FairGauge AI turns these questions into measurable audit results.**

---

## Our Solution

FairGauge AI provides an integrated workflow for evaluating machine learning models from both performance and fairness perspectives.

Users can upload a dataset, inspect its quality, run an AI audit, analyze demographic disparities, explore mitigation results, understand model predictions, and export an audit report.

Rather than treating fairness as a single score, the platform provides multiple evaluation perspectives to support more informed decisions.

---

## Application Preview

![FairGauge AI Dashboard](docs/images/dashboard.png)

---

## What Makes FairGauge AI Different?

| Capability | What it provides |
|---|---|
| Dataset Intelligence | Dataset inspection and quality analysis |
| Model Evaluation | Standard machine learning performance metrics |
| Fairness Auditing | Demographic parity and equal opportunity analysis |
| Disparity Detection | Identification of potential group-level differences |
| Explainable AI | SHAP-based model explanations |
| Bias Mitigation | Reweighing-based mitigation experiment |
| Comparative Analysis | Before-and-after fairness and performance comparison |
| Audit Reporting | Downloadable PDF audit reports |

---

## How It Works

FairGauge AI follows an end-to-end auditing workflow.

**01 — Upload**

Upload a structured CSV dataset for evaluation.

**02 — Inspect**

Examine dataset records, columns, missing values, duplicates, and basic statistics.

**03 — Evaluate**

Train and evaluate a Logistic Regression model using a training and testing split.

**04 — Audit**

Calculate fairness metrics across demographic groups and identify potential disparities.

**05 — Explain**

Use SHAP to examine global feature importance and individual prediction explanations.

**06 — Mitigate**

Apply reweighing to adjust training sample weights and investigate fairness changes.

**07 — Compare**

Compare original and mitigated models using fairness and predictive performance metrics.

**08 — Report**

Generate a PDF report containing audit findings and recommendations.

---

## System Architecture

```text
                   USER
                    |
                    v
             REACT FRONTEND
              Vite + CSS
                    |
                    v
             FASTAPI BACKEND
                    |
                    v
              DATA VALIDATION
                    |
                    v
             DATA PROCESSING
              Pandas / NumPy
                    |
                    v
          LOGISTIC REGRESSION MODEL
               Scikit-learn
                    |
          +---------+----------+
          |         |          |
          v         v          v
       MODEL     FAIRNESS    SHAP
     EVALUATION   AUDITING  EXPLAINER
          |         |          |
          +---------+----------+
                    |
                    v
             BIAS MITIGATION
                Reweighing
                    |
                    v
              RECOMMENDATIONS
                    |
                    v
             COMPARATIVE RESULTS
                    |
                    v
               REACT DASHBOARD
                    |
                    v
                PDF REPORT
```

---

## Fairness Intelligence

FairGauge AI evaluates model behaviour using multiple fairness indicators.

### 1. Demographic Parity Difference

Measures the difference in positive prediction rates between two demographic groups.

`DPD = Selection Rate (Group B) - Selection Rate (Group A)`

### 2. Selection Rate Ratio

Compares the lower selection rate with the higher selection rate.

`SRR = Lower Selection Rate / Higher Selection Rate`

### 3. True Positive Rate

Measures the proportion of actual positive cases correctly predicted.

`TPR = TP / (TP + FN)`

### 4. Equal Opportunity Difference

Compares true positive rates across demographic groups.

`EOD = TPR (Group A) - TPR (Group B)`

These metrics help identify different dimensions of potential unfairness. No single metric is sufficient to establish whether an AI system is fair.

---

## Experimental Evaluation

### Demonstration: AI-Based Hiring

To demonstrate the auditing workflow, we created a synthetic hiring dataset containing 500 records.

The dataset includes:

- Gender
- Years of experience
- Test scores
- Interview scores
- Hiring outcomes

A gender-related score difference was deliberately introduced into the synthetic data to demonstrate how disparities can appear in model predictions.

The model uses Logistic Regression with an 80:20 training and testing split.

### Original Model Performance

| Metric | Result |
|---|---:|
| Accuracy | 100% |
| Precision | 100% |
| Recall | 100% |
| F1-Score | 100% |

Despite perfect predictive metrics on this synthetic test split, the fairness audit identified a substantial difference in group selection rates.

### Fairness Findings

| Metric | Result |
|---|---:|
| Male Selection Rate | 86.49% |
| Female Selection Rate | 55.56% |
| Absolute Selection Rate Gap | 30.93 percentage points |
| Selection Rate Ratio | 0.6424 |
| Equal Opportunity Difference | 0 |

**Key insight:** A model can achieve excellent predictive performance while still exhibiting substantial differences in demographic selection rates.

---

## Bias Mitigation Experiment

FairGauge AI implements a reweighing-based mitigation approach.

The method calculates sample weights using demographic group membership and outcome classes. These weights are applied during model training.

We compare the original and mitigated models to understand how the mitigation process affects fairness and predictive performance.

### Before vs After

| Evaluation Metric | Original Model | Mitigated Model |
|---|---:|---:|
| Accuracy | 100% | 97% |
| Selection Rate Gap | 30.93 pp | 25.05 pp |
| Selection Rate Ratio | 0.6424 | 0.701 |
| Equal Opportunity Difference | 0 | 0.0312 |

### What Did We Learn?

- The selection rate gap decreased by 5.88 percentage points.
- The selection rate ratio improved from 0.6424 to 0.701.
- Accuracy decreased from 100% to 97%.
- Equal opportunity difference changed from 0 to 0.0312.

This experiment demonstrates that fairness mitigation involves evaluating multiple objectives rather than optimizing a single metric.

**We do not claim that the model became completely fair. We demonstrate how mitigation changes measurable outcomes and why those changes must be evaluated carefully.**

*Experimental results are based on synthetic demonstration data. They are not evidence of real-world discrimination or generalizable model performance.*

---

## Explainable AI

FairGauge AI integrates SHAP (SHapley Additive exPlanations) to improve model transparency.

The implementation provides:

**Global Explanations**
- Mean absolute SHAP values.
- Feature importance analysis.
- Understanding which features contribute most to model outputs.

**Local Explanations**
- Individual prediction explanations.
- Feature-level contributions to a specific prediction.

SHAP explanations help describe model behaviour but do not establish causal relationships.

---

## Technical Implementation

| Layer | Technology |
|---|---|
| Frontend | React 19 |
| Build Tool | Vite |
| Styling | Tailwind CSS 4, CSS |
| Visualization | Recharts |
| Icons | Lucide React |
| Backend | Python, FastAPI |
| Data Processing | Pandas, NumPy |
| Machine Learning | Scikit-learn |
| Explainability | SHAP |
| PDF Generation | jsPDF |
| Deployment | Vercel, Render |
| Version Control | Git, GitHub |

### Backend API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Backend home endpoint |
| GET | `/health` | Health check |
| POST | `/audit` | CSV dataset auditing |

Interactive API documentation is available through FastAPI Swagger UI.

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

## Run Locally

### Prerequisites

- Python 3.10+
- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/madhansanjay14-arc/FairGauge-AI.git

cd FairGauge-AI
```

### 2. Install backend dependencies

```bash
python -m venv venv
```

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install packages:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
uvicorn backend.main:app --reload
```

Backend:

`http://127.0.0.1:8000`

API documentation:

`http://127.0.0.1:8000/docs`

### 3. Install frontend dependencies

Open another terminal:

```bash
cd frontend
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

---

## Responsible AI Considerations

FairGauge AI is designed as an auditing and decision-support tool, not an automatic certification system for fairness.

Important considerations:

- Fairness metrics depend on the application context and selected protected attributes.
- Demographic parity does not represent a universal definition of fairness.
- Synthetic datasets cannot establish real-world discrimination.
- Mitigation techniques may introduce trade-offs between different evaluation metrics.
- SHAP explanations do not prove causality.
- Human review and domain-specific validation remain important.

---

## Future Roadmap

Our next development priorities include:

- Support for additional fairness metrics.
- Auditing multiple demographic attributes.
- Integration of additional mitigation algorithms.
- Evaluation across more machine learning models.
- Testing with larger and more diverse real-world datasets.
- Improved audit explainability and reporting.
- Continuous fairness monitoring for deployed models.

These are planned improvements, not claims about the current implementation.

---

## Live Project

**Application:**  
https://fair-gauge-ai.vercel.app/

**Backend API:**  
https://fairgauge-ai-backend.onrender.com

**Source Code:**  
https://github.com/madhansanjay14-arc/FairGauge-AI

---

## Team

**Team Name:** DataWizards

**Institution:** Sri Krishna College of Engineering and Technology (SKCET)

**Project:** FairGauge AI – Responsible AI Auditing & Optimization Platform

---

### Our Vision

We believe that evaluating an AI system should go beyond asking whether it predicts correctly.

We must also ask whether its decisions are understandable, measurable, and fair.

**FairGauge AI — Building AI that can be evaluated, explained, and improved.**
