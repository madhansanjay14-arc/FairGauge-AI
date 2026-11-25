\# FairGauge AI

\### Responsible AI Auditing \& Optimization Platform



FairGauge AI is an AI-powered auditing platform designed to evaluate machine learning models for fairness, performance, explainability, and potential demographic disparities.



It helps developers and organizations understand how AI models make predictions, identify differences in outcomes across demographic groups, and explore fairness mitigation techniques.



\---



\## 1. Problem Statement



AI systems are increasingly used in areas such as recruitment, healthcare, finance, and education. However, machine learning models can produce unequal outcomes for different demographic groups, even when their overall prediction accuracy appears high.



Traditional model evaluation mainly focuses on performance metrics such as accuracy and precision, often overlooking fairness concerns.



\*\*FairGauge AI addresses this challenge by combining model performance evaluation, fairness auditing, explainability, and mitigation analysis in one platform.\*\*



\## 2. Key Features



\- \*\*CSV Dataset Upload:\*\* Upload structured CSV datasets for auditing.

\- \*\*Dataset Inspection:\*\* Examine records, columns, missing values, duplicate records, and basic statistics.

\- \*\*AI Model Evaluation:\*\* Evaluate model performance using accuracy, precision, recall, and F1-score.

\- \*\*Fairness Auditing:\*\* Calculate demographic parity, selection rates, selection rate ratio, and equal opportunity metrics.

\- \*\*Disparity Detection:\*\* Identify potential differences in model outcomes between demographic groups.

\- \*\*Explainable AI:\*\* Use SHAP to understand feature contributions to model predictions.

\- \*\*Bias Mitigation:\*\* Apply a reweighing technique to explore changes in fairness and model performance.

\- \*\*Recommendations:\*\* Generate recommendations based on detected fairness and performance issues.

\- \*\*What-If Analysis:\*\* Explore fairness metric changes using adjustable thresholds.

\- \*\*PDF Audit Reports:\*\* Export audit findings and results as PDF reports.



\## 3. Application Preview



!\[FairGauge AI Dashboard](docs/images/dashboard.png)



\## 4. System Architecture



```text

&#x20;                USER

&#x20;                 |

&#x20;                 v

&#x20;       REACT FRONTEND

&#x20;       (Vite + Tailwind CSS)

&#x20;                 |

&#x20;                 | CSV Upload / API Request

&#x20;                 v

&#x20;         FASTAPI BACKEND

&#x20;                 |

&#x20;         DATA VALIDATION

&#x20;                 |

&#x20;                 v

&#x20;       MACHINE LEARNING MODEL

&#x20;         (Scikit-learn)

&#x20;                 |

&#x20;         +-------+--------+

&#x20;         |       |        |

&#x20;         v       v        v

&#x20;      MODEL   FAIRNESS   SHAP

&#x20;    EVALUATION AUDITING EXPLAINABILITY

&#x20;         |       |        |

&#x20;         +-------+--------+

&#x20;                 |

&#x20;                 v

&#x20;         BIAS MITIGATION

&#x20;            (Reweighing)

&#x20;                 |

&#x20;                 v

&#x20;         RECOMMENDATIONS

&#x20;                 |

&#x20;                 v

&#x20;         AUDIT RESULTS

&#x20;                 |

&#x20;                 v

&#x20;       REACT DASHBOARD

&#x20;                 |

&#x20;                 v

&#x20;         PDF AUDIT REPORT

```



\## 5. Technology Stack



| Component | Technologies |

|---|---|

| Frontend | React, Vite |

| Styling | Tailwind CSS 4, CSS |

| Charts | Recharts |

| Icons | Lucide React |

| Backend | Python, FastAPI |

| Data Processing | Pandas, NumPy |

| Machine Learning | Scikit-learn |

| Explainable AI | SHAP |

| PDF Generation | jsPDF |

| Deployment | Vercel, Render |

| Version Control | Git, GitHub |



\## 6. Fairness Metrics



FairGauge AI evaluates model fairness using the following metrics.



\### Demographic Parity Difference (DPD)



Measures the difference in positive prediction rates between two demographic groups.



`DPD = Selection Rate (Group B) - Selection Rate (Group A)`



\### Selection Rate Ratio (SRR)



Measures the ratio between the lower and higher group selection rates.



`SRR = Lower Selection Rate / Higher Selection Rate`



\### True Positive Rate (TPR)



Measures the proportion of actual positive cases correctly predicted.



`TPR = TP / (TP + FN)`



\### Equal Opportunity Difference (EOD)



Measures the difference in true positive rates between demographic groups.



`EOD = TPR (Group A) - TPR (Group B)`



These metrics are used as fairness screening indicators. Their interpretation depends on the application context and the fairness requirements of the system.



\## 7. Experimental Results



The current demonstration uses a \*\*synthetic hiring dataset containing 500 records\*\*.



The dataset includes demographic information, experience, test scores, interview scores, and hiring outcomes.



A Logistic Regression model is trained using an 80:20 train-test split.



\### Original Model Results



| Metric | Result |

|---|---:|

| Accuracy | 100% |

| Precision | 100% |

| Recall | 100% |

| F1-Score | 100% |

| Male Selection Rate | 86.49% |

| Female Selection Rate | 55.56% |

| Absolute Selection Rate Gap | 30.93 percentage points |

| Selection Rate Ratio | 0.6424 |

| Equal Opportunity Difference | 0 |



\### After Bias Mitigation



FairGauge AI applies a reweighing technique to adjust training sample weights.



| Metric | Before Mitigation | After Mitigation |

|---|---:|---:|

| Accuracy | 100% | 97% |

| Selection Rate Gap | 30.93 pp | 25.05 pp |

| Selection Rate Ratio | 0.6424 | 0.701 |

| Equal Opportunity Difference | 0 | 0.0312 |



\*\*Key Observation:\*\*



The reweighing technique reduced the selection rate gap by 5.88 percentage points in this experiment.



However, model accuracy decreased from 100% to 97%, and the equal opportunity difference changed from 0 to 0.0312.



This demonstrates the trade-off that can occur between model performance and fairness objectives.



\*Note: These results are from a synthetic demonstration dataset and should not be interpreted as evidence of real-world discrimination or model performance.\*



\## 8. Bias Mitigation Methodology



FairGauge AI implements a reweighing approach.



The method calculates sample weights based on the relationship between demographic groups and outcome classes.



These weights are used during model training to explore whether group-related disparities can be reduced.



The platform compares the original and mitigated models using both fairness and performance metrics.



Mitigation is not guaranteed to eliminate bias. Its effectiveness must be evaluated for each dataset and application.



\## 9. Explainable AI



FairGauge AI integrates SHAP (SHapley Additive exPlanations) to provide model explanations.



The platform provides:



\- Global feature importance using mean absolute SHAP values.

\- Local explanations for individual predictions.

\- Insights into how features contribute to model outputs.



SHAP explanations describe model behaviour; they do not establish causal relationships.



\## 10. Project Structure



```text

FairGauge-AI/

|

|-- backend/

|   |-- main.py

|   |-- fairness.py

|   |-- mitigation.py

|   |-- recommendations.py

|   |-- create\_dataset.py

|   |-- train\_model.py

|   |-- test\_fairness.py

|

|-- frontend/

|   |-- public/

|   |-- src/

|   |   |-- components/

|   |   |   |-- FairnessMetrics.jsx

|   |   |-- App.jsx

|   |   |-- App.css

|   |   |-- index.css

|   |   |-- main.jsx

|   |-- package.json

|

|-- datasets/

|-- reports/

|-- requirements.txt

|-- README.md

|-- .gitignore

```



\## 11. Installation and Setup



\### Prerequisites



\- Python 3.10 or later

\- Node.js and npm

\- Git



\### Step 1: Clone the Repository



```bash

git clone https://github.com/madhansanjay14-arc/FairGauge-AI.git



cd FairGauge-AI

```



\### Step 2: Set Up the Backend



Create a Python virtual environment:



```bash

python -m venv venv

```



Activate it on Windows PowerShell:



```powershell

.\\venv\\Scripts\\Activate.ps1

```



Install the dependencies:



```bash

pip install -r requirements.txt

```



Start the FastAPI backend:



```bash

uvicorn backend.main:app --reload

```



Backend URL:



`http://127.0.0.1:8000`



API documentation:



`http://127.0.0.1:8000/docs`



\### Step 3: Set Up the Frontend



Open another terminal:



```bash

cd frontend

```



Install dependencies:



```bash

npm install

```



Create a `.env` file inside the frontend directory:



```env

VITE\_API\_BASE\_URL=http://127.0.0.1:8000

```



Start the frontend:



```bash

npm run dev

```



Frontend URL:



`http://localhost:5173`



\*\*Note:\*\* Keep the backend and frontend running in separate terminals. Restart the Vite development server after changing environment variables.



\## 12. API Endpoints



| Method | Endpoint | Description |

|---|---|---|

| GET | `/` | Backend home endpoint |

| GET | `/health` | Health check |

| POST | `/audit` | Upload and audit a CSV dataset |



Interactive API documentation is available at:



`http://127.0.0.1:8000/docs`



\## 13. Dataset Requirements



The demonstration hiring dataset uses the following columns:



| Column | Description |

|---|---|

| gender | Demographic group |

| experience | Years of experience |

| test\_score | Assessment score |

| interview\_score | Interview score |

| hired | Hiring outcome (0 or 1) |



The current demonstration expects the gender groups Male and Female and both outcome classes to be present.



The dataset is synthetic and is intended for demonstration and experimentation.



\## 14. Limitations



\- Current experimental results use a synthetic hiring dataset.

\- Fairness metrics depend on the selected demographic groups and evaluation criteria.

\- Reweighing does not guarantee that all disparities will be eliminated.

\- SHAP explanations describe model behaviour rather than causality.

\- Results from synthetic data cannot establish fairness in real-world AI systems.



\## 15. Future Improvements



\- Support additional fairness metrics and mitigation algorithms.

\- Extend auditing to multiple demographic attributes.

\- Evaluate models using larger and more diverse real-world datasets.

\- Add support for additional machine learning models.

\- Improve audit reporting and explainability.

\- Explore continuous fairness monitoring.



\## 16. Live Demo and Repository



\*\*GitHub Repository:\*\*  

https://github.com/madhansanjay14-arc/FairGauge-AI



\*\*Live Application:\*\*  

https://fair-gauge-ai.vercel.app/



\*\*Backend API:\*\*  

https://fairgauge-ai-backend.onrender.com



\## 17. Team



\*\*Team Name:\*\* DataWizards



\*\*Institution:\*\* Sri Krishna College of Engineering and Technology (SKCET)



\*\*Project:\*\* FairGauge AI – Responsible AI Auditing \& Optimization Platform



\---



\*FairGauge AI aims to make AI systems more transparent, accountable, and fair through measurable auditing, explainability, and responsible optimization.\*

