import { useState } from "react";
import { jsPDF } from "jspdf";
import {
  ShieldCheck,
  LayoutDashboard,
  FileUp,
  Activity,
  Settings,
  CheckCircle,
  AlertTriangle,
  BrainCircuit,
  Loader2,
  Database,
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";


// Parse CSV text while supporting quoted values and commas inside quotes.
function parseCSVText(text) {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  if (rows.length === 0) return { headers: [], records: [] };

  const headers = rows[0].map((header, index) =>
    (header.trim() || `Column ${index + 1}`).replace(/^\uFEFF/, "")
  );
  const records = rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? "").trim();
    });
    return record;
  });

  return { headers, records };
}


function App() {

  // ================= REACT STATE =================

  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activePage, setActivePage] = useState("dashboard");
  const [datasetPreview, setDatasetPreview] = useState({ headers: [], records: [] });
  const [datasetError, setDatasetError] = useState("");


  async function handleFileSelection(selectedFile) {
    setFile(selectedFile);
    setResults(null);
    setError("");
    setDatasetError("");
    setDatasetPreview({ headers: [], records: [] });

    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setDatasetError("Please select a CSV file.");
      return;
    }

    try {
      const text = await selectedFile.text();
      const parsed = parseCSVText(text);
      if (parsed.headers.length === 0) {
        throw new Error("The selected CSV file is empty or has no header row.");
      }
      if (parsed.records.length === 0) {
        throw new Error("The CSV contains column headers but no data records.");
      }
      setDatasetPreview(parsed);
    } catch (err) {
      setDatasetError(err.message || "Unable to read this CSV file.");
    }
  }


  // ================= RUN AI AUDIT =================

  async function runAudit() {

    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);

    const formData = new FormData();
    formData.append("file", file);

    try {

      const response = await fetch(
        "http://127.0.0.1:8000/audit",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Audit failed. Please check your CSV file."
        );
      }

      setResults(data);

    } catch (err) {

      setError(
        err.message ||
        "Unable to connect to the backend. Check whether FastAPI is running."
      );

    } finally {

      setLoading(false);

    }
  }

  // ================= PDF AUDIT REPORT =================

function downloadAuditReport() {
  if (!results) return;

  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let y = 20;

  function addText(text, fontSize = 10, bold = false) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(fontSize);

    const lines = doc.splitTextToSize(
      String(text),
      pageWidth - 30
    );

    if (y + lines.length * 6 > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }

    doc.text(lines, 15, y);
    y += lines.length * 6 + 3;
  }

  function addSection(title) {
    y += 5;
    addText(title, 14, true);
    doc.setDrawColor(200);
    doc.line(15, y, pageWidth - 15, y);
    y += 5;
  }

  // Report heading
  addText("FairGauge AI", 22, true);
  addText("Responsible AI Audit Report", 16, true);
  addText(`Generated: ${new Date().toLocaleString()}`);
  
  // Dataset
  addSection("1. Dataset Information");

  addText(`Total Records: ${results.dataset.total_records}`);
  addText(`Training Records: ${results.dataset.training_records}`);
  addText(`Testing Records: ${results.dataset.testing_records}`);

  // Original performance
  addSection("2. Original Model Performance");

  Object.entries(results.model_performance).forEach(
    ([name, value]) => {
      addText(`${name.replaceAll("_", " ")}: ${value}%`);
    }
  );

  // Demographic parity
  addSection("3. Demographic Parity");

  const dp = results.demographic_parity;

  addText(`Male Selection Rate: ${dp.group_a_selection_rate}%`);
  addText(`Female Selection Rate: ${dp.group_b_selection_rate}%`);
  addText(`Difference: ${dp.absolute_difference} percentage points`);
  addText(`Selection Rate Ratio: ${dp.selection_rate_ratio}`);
  addText(`Status: ${dp.status}`);

  // Equal opportunity
  addSection("4. Equal Opportunity");

  const eop = results.equal_opportunity;

  addText(`Male TPR: ${eop.male_tpr ?? "N/A"}%`);
  addText(`Female TPR: ${eop.female_tpr ?? "N/A"}%`);
  addText(
    `Equal Opportunity Difference: ${
      eop.equal_opportunity_difference ?? "N/A"
    }`
  );

  // Mitigation
  if (results.mitigation) {
    const m = results.mitigation;

    addSection("5. Bias Mitigation Results");

    addText(`Method: ${m.method}`);

    addText("Mitigated Model Performance:", 11, true);

    Object.entries(m.model_performance).forEach(
      ([name, value]) => {
        addText(`${name.replaceAll("_", " ")}: ${value}%`);
      }
    );

    addText("Mitigated Demographic Parity:", 11, true);

    addText(
      `Male Selection Rate: ${m.demographic_parity.group_a_selection_rate}%`
    );

    addText(
      `Female Selection Rate: ${m.demographic_parity.group_b_selection_rate}%`
    );

    addText(
      `Selection Gap: ${m.demographic_parity.absolute_difference} percentage points`
    );

    addText(
      `Selection Rate Ratio: ${m.demographic_parity.selection_rate_ratio}`
    );

    addText("Mitigated Equal Opportunity:", 11, true);

    addText(`Male TPR: ${m.equal_opportunity.male_tpr ?? "N/A"}%`);
    addText(`Female TPR: ${m.equal_opportunity.female_tpr ?? "N/A"}%`);
    addText(
      `EOD: ${m.equal_opportunity.equal_opportunity_difference ?? "N/A"}`
    );
  }

  // SHAP explainability
  if (results.explainability) {
    const shap = results.explainability;

    addSection("6. SHAP Explainability");
    addText(`Method: ${shap.method || "SHAP"}`);
    addText(`Output scale: ${shap.output_scale || "Not specified"}`);
    addText(
      "Global feature importance (mean absolute SHAP values):",
      11,
      true
    );

    const globalImportance = shap.global_feature_importance || [];
    if (globalImportance.length > 0) {
      globalImportance.forEach((item, index) => {
        addText(
          `${index + 1}. ${item.feature}: ${Number(item.importance).toFixed(4)}`
        );
      });
    } else {
      addText("Global feature importance was not provided.");
    }

    const individual = shap.individual_prediction;
    if (individual) {
      addText("Sample individual prediction:", 11, true);
      addText(
        `Predicted class: ${
          individual.predicted_class === 1
            ? "Hired (1)"
            : individual.predicted_class === 0
            ? "Not Hired (0)"
            : individual.predicted_class
        }`
      );
      addText(`Probability of Hired: ${individual.probability_hired ?? "N/A"}%`);
      addText(`Base value: ${individual.base_value ?? "N/A"}`);
      addText("Feature contributions:", 10, true);

      const contributions = individual.feature_contributions || [];
      if (contributions.length > 0) {
        contributions.forEach((item) => {
          addText(
            `${item.feature} (value: ${item.feature_value ?? "N/A"}): ${Number(item.shap_value).toFixed(4)}`
          );
        });
      } else {
        addText("Individual feature contributions were not provided.");
      }
    } else {
      addText("No individual prediction explanation was provided.");
    }

    addText(
      "Interpretation: SHAP values describe how features contribute to this model's output. Positive and negative values move the prediction in different directions on the stated output scale. These explanations are not causal evidence and do not establish that a feature caused an outcome."
    );
  }

  // Recommendations
  addSection("7. Audit Recommendations");

  (results.recommendations || []).forEach((item, index) => {
    addText(`${index + 1}. ${item.category} - ${item.severity} Priority`, 11, true);
    addText(`Finding: ${item.finding}`);
    addText(`Recommendation: ${item.recommendation}`);
  });

  // Disclaimer
  addSection("8. Disclaimer");

  addText(results.disclaimer);
  addText(
    "This report presents screening indicators, not proof of discrimination or a guarantee of fairness."
  );

  // Footer
  addText("Generated by FairGauge AI - Prototype Version 1.0");

  doc.save("FairGauge_AI_Audit_Report.pdf");
}


  // ================= DASHBOARD METRICS =================

  const metrics = results
    ? [
        {
          title: "Original Model Accuracy",
          value: `${results.model_performance.accuracy}%`,
          description: "Prediction accuracy before mitigation",
        },
        {
          title: "Dataset Records",
          value: results.dataset.total_records,
          description: "Total records analysed",
        },
        {
          title: "Training Records",
          value: results.dataset.training_records,
          description: "Used for training",
        },
        {
          title: "Testing Records",
          value: results.dataset.testing_records,
          description: "Used for evaluation",
        },
      ]
    : [];


  // ================= ORIGINAL SELECTION DATA =================

  const selectionData = results
    ? [
        {
          group: "Male",
          rate: results.demographic_parity.group_a_selection_rate,
        },
        {
          group: "Female",
          rate: results.demographic_parity.group_b_selection_rate,
        },
      ]
    : [];


  // ================= PERFORMANCE DATA =================

  const performanceData = results
    ? Object.entries(results.model_performance).map(
        ([name, value]) => ({
          metric: name.replaceAll("_", " "),
          score: value,
        })
      )
    : [];


  // ================= MITIGATION DATA =================

  const mitigation = results?.mitigation;

  // SHAP explainability data
const explainability = results?.explainability;

const globalShapData =
  explainability?.global_feature_importance || [];

const individualShapData =
  explainability?.individual_prediction?.feature_contributions || [];

const individualPrediction =
  explainability?.individual_prediction;

  const mitigationSelectionData =
    results && mitigation
      ? [
          {
            group: "Male",
            original:
              results.demographic_parity.group_a_selection_rate,
            mitigated:
              mitigation.demographic_parity.group_a_selection_rate,
          },
          {
            group: "Female",
            original:
              results.demographic_parity.group_b_selection_rate,
            mitigated:
              mitigation.demographic_parity.group_b_selection_rate,
          },
        ]
      : [];


  const mitigationPerformanceData =
    results && mitigation
      ? Object.entries(results.model_performance).map(
          ([name, value]) => ({
            metric: name.replaceAll("_", " "),
            original: value,
            mitigated: mitigation.model_performance[name],
          })
        )
      : [];


  // ================= HELPER VALUES =================

  const originalGap =
    results?.demographic_parity?.absolute_difference ?? 0;

  const mitigatedGap =
    mitigation?.demographic_parity?.absolute_difference ?? 0;

  const gapReduction = originalGap - mitigatedGap;

  const originalRatio =
    results?.demographic_parity?.selection_rate_ratio ?? 0;

  const mitigatedRatio =
    mitigation?.demographic_parity?.selection_rate_ratio ?? 0;

  const originalEod =
    results?.equal_opportunity?.equal_opportunity_difference;

  const mitigatedEod =
    mitigation?.equal_opportunity?.equal_opportunity_difference;


  // ================= MAIN UI =================

  return (

    <div className="min-h-screen bg-slate-100 text-slate-800">

      {/* ================= SIDEBAR ================= */}

      <aside className="fixed left-0 top-0 hidden h-screen w-64 bg-slate-950 p-6 text-white md:block">

        <div className="mb-12 flex items-center gap-3">

          <div className="rounded-xl bg-blue-600 p-2">
            <ShieldCheck size={26} />
          </div>

          <div>
            <h1 className="text-xl font-bold">
              FairGauge AI
            </h1>

            <p className="text-xs text-slate-400">
              Responsible AI Auditing
            </p>
          </div>

        </div>

        <nav className="space-y-3">
          {[
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { id: "dataset", label: "Dataset Audit", icon: FileUp },
            { id: "fairness", label: "Fairness Analysis", icon: Activity },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setActivePage(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${activePage === item.id ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
                <Icon size={19} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-6 right-6 rounded-xl bg-slate-900 p-4">

          <p className="text-sm font-semibold">
            FairGauge AI
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Prototype Version 1.0
          </p>

        </div>

      </aside>


      {/* ================= MAIN CONTENT ================= */}

      <main className="p-5 md:ml-64 md:p-10">

        {activePage === "dashboard" && (
          <>
        {/* HEADER */}

        <header className="mb-10 flex items-center justify-between">

          <div>

            <p className="text-sm text-slate-500">
              Responsible AI / Dashboard
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              AI Audit Dashboard
            </h2>

            <p className="mt-2 text-slate-500">
              Analyse model performance and identify potential fairness disparities.
            </p>

          </div>

          <div className="rounded-xl bg-white p-3 shadow-sm">
            <BrainCircuit
              className="text-blue-600"
              size={25}
            />
          </div>

        </header>


        {/* ================= UPLOAD SECTION ================= */}

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">

          <div className="mb-5 flex items-center gap-3">

            <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
              <FileUp size={24} />
            </div>

            <div>

              <h3 className="text-xl font-bold">
                Upload Dataset
              </h3>

              <p className="text-sm text-slate-500">
                Upload a CSV file to perform an AI fairness audit.
              </p>

            </div>

          </div>


          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              handleFileSelection(e.target.files?.[0] || null);
            }}
            className="block w-full rounded-xl border border-slate-300 p-4 text-sm"
          />


          {file && (
            <p className="mt-3 text-sm text-green-700">
              Selected: {file.name}
            </p>
          )}


          <button
            onClick={runAudit}
            disabled={loading || !file}
            className="mt-5 flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >

            {loading ? (

              <>
                <Loader2 size={18} className="animate-spin" />
                Analysing Dataset...
              </>

            ) : (

              "Run AI Audit"

            )}

          </button>


          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

        </section>


        {/* ================= EMPTY STATE ================= */}

        {!results && !loading && (

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">

            <Database
              className="mx-auto mb-4 text-slate-300"
              size={48}
            />

            <h3 className="text-lg font-semibold">
              Ready to Analyse Your AI Model?
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Upload your dataset and run your first fairness audit.
            </p>

          </div>

        )}


        {/* ================= LOADING STATE ================= */}

        {loading && (

          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">

            <Loader2
              className="mx-auto mb-4 animate-spin text-blue-600"
              size={40}
            />

            <h3 className="font-semibold">
              Running AI Audit
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Processing dataset, training model and calculating fairness metrics...
            </p>

          </div>

        )}


        {/* ================= AUDIT RESULTS ================= */}

        {results && (

          <>

          <div className="mb-6 flex justify-end">
  <button
    onClick={downloadAuditReport}
    className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-green-700"
  >
    Download PDF Audit Report
  </button>
</div>

            {/* ================= METRIC CARDS ================= */}

            <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

              {metrics.map((metric) => (

                <div
                  key={metric.title}
                  className="rounded-2xl bg-white p-6 shadow-sm"
                >

                  <p className="text-sm text-slate-500">
                    {metric.title}
                  </p>

                  <h3 className="mt-3 text-3xl font-bold">
                    {metric.value}
                  </h3>

                  <p className="mt-2 text-xs text-slate-400">
                    {metric.description}
                  </p>

                </div>

              ))}

            </section>


            {/* ================= MODEL PERFORMANCE ================= */}

            <section className="mb-8 rounded-2xl bg-white p-7 shadow-sm">

              <h3 className="mb-6 text-xl font-bold">
                Original Model Performance
              </h3>

              <div className="grid gap-6 sm:grid-cols-4">

                {Object.entries(results.model_performance).map(
                  ([name, value]) => (

                    <div key={name}>

                      <p className="text-sm capitalize text-slate-500">
                        {name.replaceAll("_", " ")}
                      </p>

                      <p className="mt-2 text-2xl font-bold text-blue-600">
                        {value}%
                      </p>

                    </div>

                  )
                )}

              </div>

            </section>


            {/* ================= ORIGINAL CHARTS ================= */}

            <section className="mb-8 grid gap-5 lg:grid-cols-2">

              {/* SELECTION RATE CHART */}

              <div className="rounded-2xl bg-white p-7 shadow-sm">

                <h3 className="mb-2 text-xl font-bold">
                  Original Selection Rate
                </h3>

                <p className="mb-6 text-sm text-slate-500">
                  Selection rates before bias mitigation.
                </p>

                <ResponsiveContainer width="100%" height={280}>

                  <BarChart data={selectionData}>

                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey="group" />

                    <YAxis domain={[0, 100]} />

                    <Tooltip
                      formatter={(value) => [`${value}%`, "Selection Rate"]}
                    />

                    <Bar
                      dataKey="rate"
                      name="Selection Rate"
                      fill="#2563eb"
                      radius={[6, 6, 0, 0]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>


              {/* PERFORMANCE CHART */}

              <div className="rounded-2xl bg-white p-7 shadow-sm">

                <h3 className="mb-2 text-xl font-bold">
                  Original Model Performance
                </h3>

                <p className="mb-6 text-sm text-slate-500">
                  Evaluation metrics from the test dataset.
                </p>

                <ResponsiveContainer width="100%" height={280}>

                  <BarChart data={performanceData}>

                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      dataKey="metric"
                      tick={{ fontSize: 11 }}
                    />

                    <YAxis domain={[0, 100]} />

                    <Tooltip
                      formatter={(value) => [`${value}%`, "Score"]}
                    />

                    <Bar
                      dataKey="score"
                      name="Performance Score"
                      fill="#16a34a"
                      radius={[6, 6, 0, 0]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            </section>


            {/* ================= BEFORE VS AFTER MITIGATION ================= */}

            {mitigation && (

              <section className="mb-8 rounded-2xl border border-blue-200 bg-white p-7 shadow-sm">

                <div className="mb-6 flex items-center gap-3">

                  <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                    <ShieldCheck size={26} />
                  </div>

                  <div>

                    <h3 className="text-2xl font-bold">
                      Before vs After Bias Mitigation
                    </h3>

                    <p className="text-sm text-slate-500">
                      Comparing the original model with the reweighed model.
                    </p>

                  </div>

                </div>


                {/* MITIGATION METHOD */}

                <div className="mb-6 rounded-xl bg-blue-50 p-4">

                  <p className="font-semibold text-blue-900">
                    Mitigation Technique: {mitigation.method}
                  </p>

                  <p className="mt-1 text-sm text-blue-800">
                    Reweighing assigns different training weights to group-outcome combinations
                    to reduce the influence of imbalanced representation during model training.
                  </p>

                </div>


                {/* COMPARISON CARDS */}

                <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

                  <div className="rounded-xl border border-slate-200 p-5">

                    <p className="text-sm text-slate-500">
                      Original Selection Gap
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {originalGap} pp
                    </p>

                  </div>


                  <div className="rounded-xl border border-slate-200 p-5">

                    <p className="text-sm text-slate-500">
                      Mitigated Selection Gap
                    </p>

                    <p className="mt-2 text-2xl font-bold text-green-600">
                      {mitigatedGap} pp
                    </p>

                  </div>


                  <div className="rounded-xl border border-slate-200 p-5">

                    <p className="text-sm text-slate-500">
                      Gap Reduction
                    </p>

                    <p className={`mt-2 text-2xl font-bold ${
                      gapReduction >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {gapReduction > 0 ? "+" : ""}
                      {gapReduction.toFixed(2)} pp
                    </p>

                  </div>


                  <div className="rounded-xl border border-slate-200 p-5">

                    <p className="text-sm text-slate-500">
                      Selection Rate Ratio
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {originalRatio} → {mitigatedRatio}
                    </p>

                  </div>

                </div>


                {/* SELECTION RATE COMPARISON CHART */}

                <div className="mb-8 rounded-xl border border-slate-200 p-5">

                  <h4 className="mb-2 text-lg font-bold">
                    Selection Rate Comparison
                  </h4>

                  <p className="mb-5 text-sm text-slate-500">
                    Compare the selection rates of each demographic group before and after reweighing.
                  </p>

                  <ResponsiveContainer width="100%" height={300}>

                    <BarChart data={mitigationSelectionData}>

                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis dataKey="group" />

                      <YAxis domain={[0, 100]} />

                      <Tooltip
                        formatter={(value) => [`${value}%`, "Selection Rate"]}
                      />

                      <Legend />

                      <Bar
                        dataKey="original"
                        name="Original Model"
                        fill="#2563eb"
                        radius={[5, 5, 0, 0]}
                      />

                      <Bar
                        dataKey="mitigated"
                        name="After Reweighing"
                        fill="#16a34a"
                        radius={[5, 5, 0, 0]}
                      />

                    </BarChart>

                  </ResponsiveContainer>

                </div>


                {/* PERFORMANCE COMPARISON CHART */}

                <div className="mb-8 rounded-xl border border-slate-200 p-5">

                  <h4 className="mb-2 text-lg font-bold">
                    Model Performance Trade-off
                  </h4>

                  <p className="mb-5 text-sm text-slate-500">
                    Compare model performance before and after mitigation.
                  </p>

                  <ResponsiveContainer width="100%" height={300}>

                    <BarChart data={mitigationPerformanceData}>

                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis
                        dataKey="metric"
                        tick={{ fontSize: 11 }}
                      />

                      <YAxis domain={[0, 100]} />

                      <Tooltip
                        formatter={(value) => [`${value}%`, "Score"]}
                      />

                      <Legend />

                      <Bar
                        dataKey="original"
                        name="Original Model"
                        fill="#2563eb"
                        radius={[5, 5, 0, 0]}
                      />

                      <Bar
                        dataKey="mitigated"
                        name="After Reweighing"
                        fill="#16a34a"
                        radius={[5, 5, 0, 0]}
                      />

                    </BarChart>

                  </ResponsiveContainer>

                </div>


                {/* EQUAL OPPORTUNITY COMPARISON */}

                <div className="grid gap-5 sm:grid-cols-2">

                  <div className="rounded-xl bg-slate-50 p-5">

                    <h4 className="font-bold">
                      Equal Opportunity Difference
                    </h4>

                    <div className="mt-4 flex items-center justify-between">

                      <div>
                        <p className="text-xs text-slate-500">
                          Original
                        </p>

                        <p className="mt-1 text-2xl font-bold">
                          {originalEod ?? "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          After mitigation
                        </p>

                        <p className="mt-1 text-2xl font-bold">
                          {mitigatedEod ?? "N/A"}
                        </p>
                      </div>

                    </div>

                  </div>


                  <div className="rounded-xl bg-amber-50 p-5">

                    <h4 className="font-bold text-amber-900">
                      Mitigation Analysis
                    </h4>

                    <p className="mt-3 text-sm leading-relaxed text-amber-800">

                      {gapReduction > 0
                        ? `The selection-rate gap decreased by ${gapReduction.toFixed(2)} percentage points after reweighing.`
                        : gapReduction < 0
                        ? `The selection-rate gap increased by ${Math.abs(gapReduction).toFixed(2)} percentage points after reweighing.`
                        : "The selection-rate gap remained unchanged after reweighing."
                      }

                      {" "}The results should be evaluated alongside model performance and Equal Opportunity Difference.

                    </p>

                  </div>

                </div>


                {/* MITIGATION DISCLAIMER */}

                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">

                  <p className="text-sm leading-relaxed text-amber-900">

                    <strong>Important:</strong> Reweighing is an experimental bias mitigation
                    technique. A reduction in one fairness metric does not guarantee overall
                    fairness. Human review and further testing are required.

                  </p>

                </div>

              </section>

            )}


            {/* ================= FAIRNESS ANALYSIS ================= */}

            <section className="mb-8 grid gap-5 lg:grid-cols-2">

              {/* DEMOGRAPHIC PARITY */}

              <div className="rounded-2xl bg-white p-7 shadow-sm">

                <div className="mb-5 flex items-center gap-2">

                  <AlertTriangle className="text-amber-500" />

                  <h3 className="text-xl font-bold">
                    Demographic Parity
                  </h3>

                </div>


                <p className="text-sm text-slate-500">
                  Male selection rate
                </p>

                <p className="mb-4 text-2xl font-bold">
                  {results.demographic_parity.group_a_selection_rate}%
                </p>


                <p className="text-sm text-slate-500">
                  Female selection rate
                </p>

                <p className="mb-4 text-2xl font-bold">
                  {results.demographic_parity.group_b_selection_rate}%
                </p>


                <div className="rounded-xl bg-amber-50 p-4 text-amber-800">

                  <p className="font-semibold">
                    {results.demographic_parity.status}
                  </p>

                  <p className="mt-2 text-sm">
                    Selection rate difference:{" "}
                    {results.demographic_parity.absolute_difference}
                    percentage points
                  </p>

                  <p className="mt-2 text-sm">
                    Selection rate ratio:{" "}
                    {results.demographic_parity.selection_rate_ratio}
                  </p>

                  <p className="mt-2 text-sm">
                    Demographic parity difference:{" "}
                    {results.demographic_parity.demographic_parity_difference}
                  </p>

                </div>

              </div>


              {/* EQUAL OPPORTUNITY */}

              <div className="rounded-2xl bg-white p-7 shadow-sm">

                <h3 className="mb-5 text-xl font-bold">
                  Equal Opportunity
                </h3>


                <p className="text-sm text-slate-500">
                  Male True Positive Rate
                </p>

                <p className="mb-4 text-2xl font-bold">
                  {results.equal_opportunity.male_tpr ?? "N/A"}
                  {results.equal_opportunity.male_tpr !== null && "%"}
                </p>


                <p className="text-sm text-slate-500">
                  Female True Positive Rate
                </p>

                <p className="mb-4 text-2xl font-bold">
                  {results.equal_opportunity.female_tpr ?? "N/A"}
                  {results.equal_opportunity.female_tpr !== null && "%"}
                </p>


                <div className="rounded-xl bg-blue-50 p-4 text-blue-800">

                  <p className="font-semibold">
                    Equal Opportunity Difference
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {results.equal_opportunity.equal_opportunity_difference ?? "N/A"}
                  </p>

                  <p className="mt-2 text-sm">
                    Difference between the groups' true positive rates.
                  </p>

                </div>

              </div>

            </section>

            {/* SHAP Explainability Section */}
{explainability && (
  <section className="mt-8 space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-gray-800">
        SHAP Explainability
      </h2>
      <p className="text-sm text-gray-500 mt-1">
        Understand which features influence the AI model's predictions.
      </p>
    </div>

    {/* Global Feature Importance */}
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-lg font-semibold mb-2">
        Global Feature Importance
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Average absolute SHAP contribution across test records.
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={globalShapData}
          layout="vertical"
          margin={{ left: 30, right: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis
            type="category"
            dataKey="feature"
            width={120}
          />
          <Tooltip />
          <Bar
            dataKey="importance"
            fill="#6366f1"
            name="Mean |SHAP value|"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>

    {/* Individual Prediction Explanation */}
    {individualPrediction && (
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-2">
          Individual Prediction Explanation
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-5">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Prediction</p>
            <p className="text-xl font-bold">
              {individualPrediction.predicted_class === 1
                ? "Hired"
                : "Not Hired"}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Hiring Probability</p>
            <p className="text-xl font-bold">
              {individualPrediction.probability_hired}%
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Base Value</p>
            <p className="text-xl font-bold">
              {individualPrediction.base_value}
            </p>
            <p className="text-xs text-gray-400">Log-odds scale</p>
          </div>
        </div>

        <h4 className="font-semibold mb-3">
          Feature Contributions
        </h4>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={individualShapData}
            layout="vertical"
            margin={{ left: 30, right: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis
              type="category"
              dataKey="feature"
              width={120}
            />
            <Tooltip />
            <Bar
              dataKey="shap_value"
              name="SHAP Contribution (log-odds)"
              fill="#0d9488"
            />
          </BarChart>
        </ResponsiveContainer>

        <p className="text-sm text-gray-500 mt-3">
          Positive values push the prediction towards Hired.
          Negative values push it towards Not Hired.
          SHAP contributions describe model behaviour, not causation.
        </p>
      </div>
    )}
  </section>
)}


            {/* ================= AI RECOMMENDATIONS ================= */}

            <section className="mb-8 rounded-2xl bg-white p-7 shadow-sm">

              <div className="mb-6 flex items-center gap-3">

                <div className="rounded-xl bg-purple-100 p-3 text-purple-600">
                  <BrainCircuit size={25} />
                </div>

                <div>

                  <h3 className="text-xl font-bold">
                    AI Audit Recommendations
                  </h3>

                  <p className="text-sm text-slate-500">
                    Suggested actions based on detected fairness and performance findings.
                  </p>

                </div>

              </div>


              <div className="space-y-5">

                {(results.recommendations || []).map((item, index) => {

                  const severityStyles = {
                    High: "bg-red-100 text-red-700",
                    Medium: "bg-amber-100 text-amber-700",
                    Low: "bg-green-100 text-green-700",
                  };

                  return (

                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 p-5"
                    >

                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">

                        <h4 className="font-bold text-slate-800">
                          {item.category}
                        </h4>

                        <span
                          className={`rounded-full px-4 py-1 text-xs font-bold ${
                            severityStyles[item.severity] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.severity} Priority
                        </span>

                      </div>


                      <div className="mb-3">

                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Detected Finding
                        </p>

                        <p className="mt-1 text-sm text-slate-700">
                          {item.finding}
                        </p>

                      </div>


                      <div className="rounded-lg bg-blue-50 p-4">

                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                          Recommended Action
                        </p>

                        <p className="mt-2 text-sm leading-relaxed text-blue-900">
                          {item.recommendation}
                        </p>

                      </div>

                    </div>

                  );

                })}

              </div>

            </section>


            {/* ================= AUDIT DISCLAIMER ================= */}

            <section className="rounded-2xl border border-green-200 bg-green-50 p-6">

              <div className="flex items-center gap-3">

                <CheckCircle
                  className="text-green-600"
                  size={28}
                />

                <div>

                  <h3 className="font-bold text-green-800">
                    Audit Completed Successfully
                  </h3>

                  <p className="mt-1 text-sm text-green-700">
                    {results.disclaimer}
                  </p>

                </div>

              </div>

            </section>


            {/* ================= SYNTHETIC DATASET NOTE ================= */}

            <p className="mt-5 text-xs leading-relaxed text-slate-500">

              Demonstration note: Results are based on the uploaded dataset.
              The current hiring example uses synthetic data with deliberately
              constructed gender-based differences. Fairness metrics are
              screening indicators and do not independently establish
              discrimination or prove that a model is fair.

            </p>

          </>

        )}
          </>
        )}

        {activePage === "dataset" && (
          <section className="space-y-6">
            <header>
              <p className="text-sm text-slate-500">Responsible AI / Dataset Audit</p>
              <h2 className="mt-2 text-3xl font-bold">Dataset Audit</h2>
              <p className="mt-2 text-slate-500">
                Inspect dataset structure, quality, missing values and basic statistics before running an AI audit.
              </p>
            </header>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-blue-100 p-3 text-blue-600"><FileUp size={24} /></div>
                <div>
                  <h3 className="text-lg font-bold">Choose a CSV dataset</h3>
                  <p className="text-sm text-slate-500">The file is previewed locally in your browser.</p>
                </div>
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleFileSelection(e.target.files?.[0] || null)}
                className="block w-full rounded-xl border border-slate-300 p-4 text-sm"
              />
              {file && <p className="mt-3 text-sm text-green-700">Selected: {file.name}</p>}
              {datasetError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{datasetError}</p>}
              {datasetPreview.headers.length > 0 && (
                <button
                  onClick={() => setActivePage("dashboard")}
                  className="mt-4 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  Continue to AI Audit
                </button>
              )}
            </div>

            {datasetPreview.headers.length > 0 && (() => {
              const { headers, records } = datasetPreview;
              const missingByColumn = headers.map((header) => ({
                name: header,
                missing: records.filter((record) => !String(record[header] ?? "").trim()).length,
                unique: new Set(records.map((record) => record[header]).filter((value) => String(value ?? "").trim() !== "")).size,
              }));
              const totalMissing = missingByColumn.reduce((sum, column) => sum + column.missing, 0);
              const numericColumns = headers.filter((header) => {
                const values = records.map((record) => record[header]).filter((value) => String(value ?? "").trim() !== "");
                return values.length > 0 && values.every((value) => Number.isFinite(Number(value)));
              });
              const numericSummaries = numericColumns.map((header) => {
                const values = records.map((record) => Number(record[header])).filter(Number.isFinite).sort((a, b) => a - b);
                const sum = values.reduce((total, value) => total + value, 0);
                return {
                  name: header,
                  min: values[0],
                  max: values[values.length - 1],
                  mean: values.length ? sum / values.length : 0,
                };
              });

              return (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: "Total Records", value: records.length, note: "Data rows" },
                      { label: "Total Columns", value: headers.length, note: "Detected features" },
                      { label: "Missing Cells", value: totalMissing, note: "Blank or empty values" },
                      { label: "Duplicate Rows", value: records.length - new Set(records.map((record) => JSON.stringify(headers.map((header) => record[header])))).size, note: "Exact duplicate records" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-500">{item.label}</p>
                        <p className="mt-2 text-3xl font-bold">{item.value}</p>
                        <p className="mt-1 text-xs text-slate-400">{item.note}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold">Dataset Preview</h3>
                        <p className="text-sm text-slate-500">Showing up to the first 10 records.</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{file?.name}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse text-left text-sm">
                        <thead><tr className="bg-slate-50">
                          {headers.map((header) => <th key={header} className="border-b px-4 py-3 font-semibold">{header}</th>)}
                        </tr></thead>
                        <tbody>
                          {records.slice(0, 10).map((record, rowIndex) => (
                            <tr key={rowIndex} className="odd:bg-white even:bg-slate-50">
                              {headers.map((header) => <td key={header} className="border-b px-4 py-3">{record[header] || <span className="text-red-500">(blank)</span>}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <h3 className="mb-1 text-lg font-bold">Data Quality Report</h3>
                    <p className="mb-4 text-sm text-slate-500">Missing values and distinct-value counts for each column.</p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead><tr className="bg-slate-50"><th className="px-4 py-3">Column</th><th className="px-4 py-3">Missing Values</th><th className="px-4 py-3">Unique Values</th><th className="px-4 py-3">Quality</th></tr></thead>
                        <tbody>{missingByColumn.map((column) => (
                          <tr key={column.name} className="border-t">
                            <td className="px-4 py-3 font-medium">{column.name}</td>
                            <td className="px-4 py-3">{column.missing}</td>
                            <td className="px-4 py-3">{column.unique}</td>
                            <td className="px-4 py-3">{column.missing === 0 ? <span className="font-semibold text-green-600">No missing values</span> : <span className="font-semibold text-amber-600">Needs review</span>}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>

                  {numericSummaries.length > 0 && (
                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                      <h3 className="mb-1 text-lg font-bold">Numeric Column Statistics</h3>
                      <p className="mb-4 text-sm text-slate-500">Minimum, maximum and mean values for detected numeric columns.</p>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead><tr className="bg-slate-50"><th className="px-4 py-3">Column</th><th className="px-4 py-3">Minimum</th><th className="px-4 py-3">Maximum</th><th className="px-4 py-3">Mean</th></tr></thead>
                          <tbody>{numericSummaries.map((item) => (
                            <tr key={item.name} className="border-t"><td className="px-4 py-3 font-medium">{item.name}</td><td className="px-4 py-3">{item.min}</td><td className="px-4 py-3">{item.max}</td><td className="px-4 py-3">{item.mean.toFixed(2)}</td></tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className={`rounded-xl border p-4 ${totalMissing === 0 ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                    <p className="font-semibold">{totalMissing === 0 ? "Initial data quality check passed" : "Data quality review recommended"}</p>
                    <p className="mt-1 text-sm">{totalMissing === 0 ? "No blank cells were detected in this CSV preview." : `${totalMissing} blank cells were detected. Review and handle them before training or auditing a model.`} This is a basic structural check, not a complete validation of dataset suitability.</p>
                  </div>
                </>
              );
            })()}
          </section>
        )}

        {activePage === "fairness" && (
          <section className="rounded-2xl bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">Responsible AI / Fairness Analysis</p>
            <h2 className="mt-2 text-3xl font-bold">Fairness Analysis</h2>
            <p className="mt-3 text-slate-600">Run an audit from the Dashboard first. Detailed group comparisons and fairness metric visualizations will be added to this page in the next development phase.</p>
            {results ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-amber-50 p-5"><p className="text-sm text-amber-800">Demographic Parity Difference</p><p className="mt-2 text-2xl font-bold text-amber-900">{results.demographic_parity.demographic_parity_difference}</p></div>
                <div className="rounded-xl bg-blue-50 p-5"><p className="text-sm text-blue-800">Equal Opportunity Difference</p><p className="mt-2 text-2xl font-bold text-blue-900">{results.equal_opportunity.equal_opportunity_difference ?? "N/A"}</p></div>
              </div>
            ) : <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No audit results yet. Open Dashboard and run an audit to populate this page.</p>}
          </section>
        )}

        {activePage === "settings" && (
          <section className="rounded-2xl bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">Responsible AI / Settings</p>
            <h2 className="mt-2 text-3xl font-bold">Settings</h2>
            <p className="mt-3 text-slate-600">Configuration options will be added after the core audit pages are complete.</p>
            <div className="mt-6 rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold">Current prototype configuration</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
                <li>Backend API: http://127.0.0.1:8000</li>
                <li>Accepted dataset format: CSV</li>
                <li>Fairness screening thresholds are currently configured in the backend.</li>
              </ul>
            </div>
          </section>
        )}

      </main>

    </div>

  );

}

export default App;