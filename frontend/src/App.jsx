import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import FairnessMetrics from "./components/FairnessMetrics";
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
  Sun,
  Moon,
  Wifi,
  WifiOff,
  Monitor,
  HelpCircle,
  X,
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

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

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
  const [isDatasetDragging, setIsDatasetDragging] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("fairgauge-theme") || "light");
  const [apiStatus, setApiStatus] = useState("checking");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  useEffect(() => {
    localStorage.setItem("fairgauge-theme", theme);
  }, [theme]);

  // Scroll to the PDF report action after the audit completes, leaving
  // enough room above it so the button remains visible below the workspace header.
  useEffect(() => {
    if (!results) return;
    const timer = window.setTimeout(() => {
      const reportAction = document.getElementById("audit-results");
      if (!reportAction) return;

      const targetTop =
        reportAction.getBoundingClientRect().top + window.scrollY - 125;

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [results]);

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE_URL}/health`)
      .then((response) => {
        if (!response.ok) throw new Error("Backend unavailable");
        return response.json();
      })
      .then(() => { if (mounted) setApiStatus("online"); })
      .catch(() => { if (mounted) setApiStatus("offline"); });
    return () => { mounted = false; };
  }, []);


  async function handleFileSelection(selectedFile) {
    setIsDemoMode(false);
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

  async function runAudit(selectedFile = file) {

    if (!selectedFile) {
      setError("Please select a CSV file first.");
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {

      const response = await fetch(
        `${API_BASE_URL}/audit`,
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

  // Load the bundled synthetic dataset for preview. The user starts the audit separately.
  async function loadSampleDemo() {
    setError("");
    setDatasetError("");
    setResults(null);
    try {
      const response = await fetch("/demo_hiring_data.csv");
      if (!response.ok) {
        throw new Error("Demo dataset not found. Check frontend/public/demo_hiring_data.csv.");
      }
      const csvBlob = await response.blob();
      const demoFile = new File([csvBlob], "demo_hiring_data.csv", { type: "text/csv" });
      await handleFileSelection(demoFile);
      setIsDemoMode(true);
    } catch (err) {
      setError(err.message || "Unable to load the sample demo dataset.");
    }
  }

  // ================= PDF AUDIT REPORT =================

function downloadAuditReport() {
  if (!results) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const navy = [15, 23, 42];
  const blue = [37, 99, 235];
  const paleBlue = [239, 246, 255];
  const slate = [71, 85, 105];
  const green = [5, 150, 105];
  const amber = [217, 119, 6];
  let y = 18;

  const safe = (value, fallback = "N/A") =>
    value === undefined || value === null || value === "" ? fallback : value;

  function addPageFrame() {
    // Draw the top strip when a new page is created.
    // Footers are added once in the final page-numbering pass below.
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, 9, "F");
  }

  function ensureSpace(height = 12) {
    if (y + height > pageHeight - 21) {
      doc.addPage();
      addPageFrame();
      y = 20;
    }
  }

  function addParagraph(text, options = {}) {
    const {
      size = 9,
      color = slate,
      bold = false,
      indent = 0,
      lineHeight = 4.8,
      gap = 2,
    } = options;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(safe(text, "")), contentWidth - indent);
    ensureSpace(lines.length * lineHeight + gap);
    doc.text(lines, margin + indent, y);
    y += lines.length * lineHeight + gap;
  }

  function addSection(title, number) {
    ensureSpace(17);
    y += 3;
    doc.setFillColor(...paleBlue);
    doc.roundedRect(margin, y - 4, contentWidth, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...blue);
    doc.text(`${number}. ${title}`, margin + 4, y + 2.5);
    y += 13;
  }

  function addKeyValue(label, value, color = slate) {
    ensureSpace(7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...navy);
    doc.text(`${label}:`, margin + 1, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...color);
    const labelWidth = Math.min(doc.getTextWidth(`${label}:`) + 3, contentWidth * 0.48);
    const valueLines = doc.splitTextToSize(String(safe(value)), contentWidth - labelWidth - 2);
    doc.text(valueLines, margin + labelWidth, y);
    y += Math.max(5, valueLines.length * 4.5) + 1.5;
  }

  function addMetricTiles(items) {
    const gap = 3;
    const tileWidth = (contentWidth - gap * (items.length - 1)) / items.length;
    const tileHeight = 22;
    ensureSpace(tileHeight + 4);
    items.forEach((item, index) => {
      const x = margin + index * (tileWidth + gap);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, tileWidth, tileHeight, 2, 2, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...slate);
      doc.text(String(item.label), x + 3, y + 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...(item.color || blue));
      doc.text(String(item.value), x + 3, y + 15);
    });
    y += tileHeight + 5;
  }

  function addComparisonBars(label, original, mitigated, maxValue = 100) {
    const values = [
      { name: "Original", value: Number(original), color: blue },
      { name: "After mitigation", value: Number(mitigated), color: green },
    ];
    values.forEach((item) => {
      if (!Number.isFinite(item.value)) return;
      ensureSpace(11);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...slate);
      doc.text(`${label} · ${item.name}`, margin, y);
      const barX = margin + 48;
      const barWidth = contentWidth - 69;
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(barX, y - 3.2, barWidth, 4, 1, 1, "F");
      doc.setFillColor(...item.color);
      const scaled = Math.max(0, Math.min(barWidth, (Math.abs(item.value) / maxValue) * barWidth));
      doc.roundedRect(barX, y - 3.2, scaled, 4, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...navy);
      doc.text(`${item.value.toFixed(2)}${label.includes("rate") || label.includes("TPR") ? "%" : ""}`, pageWidth - margin, y, { align: "right" });
      y += 7;
    });
  }

  // Cover header
  doc.setFillColor(...navy);
  doc.rect(0, 0, pageWidth, 48, "F");
  doc.setFillColor(...blue);
  doc.roundedRect(margin, 12, 12, 12, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("FG", margin + 3, 20);
  doc.setFontSize(21);
  doc.text("FairGauge AI", margin + 18, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(219, 234, 254);
  doc.text("Responsible AI Audit Report", margin + 18, 28);
  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin + 18, 37);
  y = 59;

  addParagraph("AUDIT OVERVIEW", { size: 8, color: blue, bold: true, gap: 3 });
  addParagraph(
    "This report summarizes model performance, demographic fairness screening, mitigation results, explainability findings and recommended areas for human review.",
    { size: 10, color: navy, lineHeight: 5.5, gap: 5 }
  );

  addSection("Dataset Information", "01");
  addMetricTiles([
    { label: "Total records", value: safe(results.dataset?.total_records) },
    { label: "Training records", value: safe(results.dataset?.training_records) },
    { label: "Testing records", value: safe(results.dataset?.testing_records) },
  ]);

  addSection("Original Model Performance", "02");
  const originalPerformance = results.model_performance || {};
  addMetricTiles(
    Object.entries(originalPerformance).slice(0, 4).map(([name, value]) => ({
      label: name.replaceAll("_", " "),
      value: `${value}%`,
      color: Number(value) >= 70 ? green : amber,
    }))
  );
  addParagraph(
    "Performance values describe this evaluation split and should not be interpreted as a guarantee of performance on new or real-world data.",
    { size: 8, color: slate, gap: 4 }
  );

  addSection("Demographic Parity", "03");
  const dp = results.demographic_parity || {};
  addMetricTiles([
    { label: "Male selection rate", value: `${safe(dp.group_a_selection_rate)}%` },
    { label: "Female selection rate", value: `${safe(dp.group_b_selection_rate)}%` },
    { label: "Selection-rate gap", value: `${safe(dp.absolute_difference)} pp`, color: amber },
  ]);
  addKeyValue("Demographic parity difference", safe(dp.demographic_parity_difference));
  addKeyValue("Selection rate ratio", safe(dp.selection_rate_ratio));
  addKeyValue("Screening status", safe(dp.status), amber);

  addSection("Equal Opportunity", "04", 42);
  const eop = results.equal_opportunity || {};
  addMetricTiles([
    { label: "Male TPR", value: `${safe(eop.male_tpr)}%` },
    { label: "Female TPR", value: `${safe(eop.female_tpr)}%` },
    { label: "EOD", value: safe(eop.equal_opportunity_difference) },
  ]);
  addParagraph("Equal Opportunity Difference compares true positive rates across the evaluated groups.", { size: 8 });

  if (results.mitigation) {
    const mitigation = results.mitigation;
    const mitigatedDp = mitigation.demographic_parity || {};
    const mitigatedEop = mitigation.equal_opportunity || {};
    addSection("Bias Mitigation Results", "05");
    addParagraph(`Method: ${safe(mitigation.method)}`, { bold: true, color: navy });
    addParagraph("Before-and-after selection-rate comparison", { size: 9, bold: true, color: navy });
    addComparisonBars("Male selection rate", dp.group_a_selection_rate, mitigatedDp.group_a_selection_rate);
    addComparisonBars("Female selection rate", dp.group_b_selection_rate, mitigatedDp.group_b_selection_rate);
    addMetricTiles([
      { label: "Original gap", value: `${safe(dp.absolute_difference)} pp`, color: amber },
      { label: "Mitigated gap", value: `${safe(mitigatedDp.absolute_difference)} pp`, color: green },
      { label: "Mitigated SRR", value: safe(mitigatedDp.selection_rate_ratio) },
    ]);
    addParagraph("Mitigated model performance", { bold: true, color: navy });
    Object.entries(mitigation.model_performance || {}).forEach(([name, value]) =>
      addKeyValue(name.replaceAll("_", " "), `${value}%`)
    );
    addKeyValue("Mitigated male TPR", `${safe(mitigatedEop.male_tpr)}%`);
    addKeyValue("Mitigated female TPR", `${safe(mitigatedEop.female_tpr)}%`);
    addKeyValue("Mitigated EOD", safe(mitigatedEop.equal_opportunity_difference));
    addParagraph(
      "Mitigation changes measured outcomes but does not guarantee that the resulting model is fair. Review fairness indicators alongside performance and contextual requirements.",
      { size: 8, color: amber, lineHeight: 4.5 }
    );
  }

  if (results.explainability) {
    const shap = results.explainability;
    addSection("SHAP Explainability", "06");
    addKeyValue("Method", safe(shap.method, "SHAP"));
    addKeyValue("Output scale", safe(shap.output_scale));
    addParagraph("Global feature importance (mean absolute SHAP values)", { bold: true, color: navy });
    (shap.global_feature_importance || []).forEach((item, index) => {
      addKeyValue(`${index + 1}. ${item.feature}`, Number(item.importance).toFixed(4));
    });

    const individual = shap.individual_prediction;
    if (individual) {
      addParagraph("Sample individual prediction", { bold: true, color: navy, gap: 3 });
      addMetricTiles([
        { label: "Prediction", value: individual.predicted_class === 1 ? "Hired" : "Not hired" },
        { label: "Hiring probability", value: `${safe(individual.probability_hired)}%` },
        { label: "Base value", value: safe(individual.base_value) },
      ]);
      (individual.feature_contributions || []).forEach((item) => {
        addKeyValue(
          `${item.feature} (value: ${safe(item.feature_value)})`,
          Number(item.shap_value).toFixed(4),
          Number(item.shap_value) >= 0 ? green : amber
        );
      });
    }
    addParagraph(
      "SHAP values describe how features contribute to this model's output on the stated scale. They are not causal evidence and do not establish that a feature caused an outcome.",
      { size: 8, color: slate, lineHeight: 4.5 }
    );
  }

  addSection("Audit Recommendations", "07");
  (results.recommendations || []).forEach((item, index) => {
    addParagraph(`${index + 1}. ${safe(item.category)} · ${safe(item.severity)} priority`, {
      bold: true,
      color: item.severity === "High" ? amber : blue,
      gap: 2,
    });
    addParagraph(`Finding: ${safe(item.finding)}`, { indent: 2, gap: 1 });
    addParagraph(`Recommended action: ${safe(item.recommendation)}`, { indent: 2, gap: 4 });
  });

  addSection("Responsible AI Disclaimer", "08");
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(253, 230, 138);
  const disclaimerText =
    "Fairness metrics are screening indicators, not proof of discrimination. Recommendations require human review before implementation. Bias mitigation results are experimental and do not guarantee fairness. SHAP explanations describe model contributions, not causal effects.";
  const disclaimerLines = doc.splitTextToSize(disclaimerText, contentWidth - 12);
  const disclaimerHeight = disclaimerLines.length * 4.6 + 10;
  ensureSpace(disclaimerHeight + 5);
  doc.roundedRect(margin, y - 3, contentWidth, disclaimerHeight, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(120, 80, 20);
  doc.text(disclaimerLines, margin + 6, y + 3);
  y += disclaimerHeight + 4;

  addParagraph(
    "Synthetic demonstration note: The hiring dataset used in this demonstration is synthetic and deliberately constructed to illustrate potential gender-based disparities. The reported model performance and fairness metrics should not be interpreted as evidence about real-world hiring systems.",
    { size: 8, color: slate, lineHeight: 4.5, gap: 4 }
  );

  // Apply a consistent header and exactly one correctly numbered footer to every page.
  const totalPages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    if (page > 1) addPageFrame();

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("FairGauge AI  |  Responsible AI Audit", margin, pageHeight - 7);
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  }

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

    <div className={`app-shell min-h-screen ${theme === "dark" ? "theme-dark" : "theme-light"} bg-slate-100 text-slate-800`}>

      {/* ================= SIDEBAR ================= */}

      <aside className="app-sidebar fixed left-0 top-0 z-20 hidden h-screen w-64 border-r border-slate-800 bg-slate-950 p-6 text-white shadow-2xl md:block">

        <div className="mb-12 flex items-center gap-3">

          <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg shadow-blue-900/40">
            <ShieldCheck size={26} />
          </div>

          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
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

      <main className="app-main min-h-screen p-5 md:ml-64 md:p-9">
        <div className="app-topbar mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/90 px-5 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600"><BrainCircuit size={20} /></div>
            <div>
              <p className="text-sm font-bold tracking-wide text-slate-800">FAIRGAUGE AI</p>
              <p className="text-xs text-slate-500">Responsible AI workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${apiStatus === "online" ? "bg-emerald-50 text-emerald-700" : apiStatus === "offline" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
              {apiStatus === "online" ? <Wifi size={14} /> : <WifiOff size={14} />}
              API {apiStatus === "checking" ? "Checking" : apiStatus === "online" ? "Connected" : "Offline"}
            </span>
            <button
              type="button"
              onClick={() => setShowHelpGuide(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
              aria-label="Open FairGauge AI usage guide"
            >
              <HelpCircle size={16} />
              How to Use
            </button>
            <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50" aria-label="Toggle color theme">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </div>

        {showHelpGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setShowHelpGuide(false);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="fairgauge-help-title"
              className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-blue-700">
                    <HelpCircle size={14} /> Quick start guide
                  </div>
                  <h2 id="fairgauge-help-title" className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">How to Use FairGauge AI</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Follow this workflow to inspect a dataset, audit a model, investigate fairness indicators and export your findings.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelpGuide(false)}
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Close usage guide"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { title: "Upload a dataset", detail: "On Dashboard, choose a structured CSV file or click Try Sample Demo to load the synthetic hiring example." },
                  { title: "Inspect the dataset", detail: "Open Dataset Audit to preview records and review row counts, columns, missing cells, duplicates and numeric summaries." },
                  { title: "Run the AI audit", detail: "Return to Dashboard and select Run AI Audit. FairGauge validates the CSV, trains the model and calculates evaluation metrics." },
                  { title: "Explore fairness", detail: "Open Fairness Analysis to compare demographic selection rates, true positive rates and before/after mitigation indicators." },
                  { title: "Understand predictions", detail: "Review SHAP global feature importance and the individual prediction explanation on the Dashboard. SHAP contributions describe model behaviour, not causation." },
                  { title: "Review mitigation", detail: "Compare the original model with the reweighed model. Check fairness indicators together with performance; mitigation does not guarantee fairness." },
                  { title: "Try the What-If Simulator", detail: "In Fairness Analysis, move the decision-threshold slider and observe how predictions, accuracy and group metrics change on the held-out test set." },
                  { title: "Export the report", detail: "After a successful audit, use Download PDF Audit Report on the Dashboard to save the audit summary and findings." },
                ].map((step, index) => (
                  <article key={step.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold text-white">{index + 1}</span>
                      <h3 className="font-bold text-slate-900">{step.title}</h3>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{step.detail}</p>
                  </article>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-900">Important responsible AI notes</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-800">
                  <li>The bundled hiring dataset is synthetic and intended only for demonstration.</li>
                  <li>Fairness metrics are screening indicators, not proof of discrimination or proof that a model is fair.</li>
                  <li>Review fairness and performance together. Human review and contextual evaluation remain necessary.</li>
                </ul>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowHelpGuide(false)}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  Got it
                </button>
              </div>
            </section>
          </div>
        )}

        {activePage === "dashboard" && (
          <>
        {/* DASHBOARD INTRO */}
        <header className="dashboard-hero mb-7 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-white via-blue-50 to-indigo-50 p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                <ShieldCheck size={14} /> Responsible AI workspace
              </div>
              <p className="text-sm font-medium text-slate-500">Responsible AI / Dashboard</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">AI Audit Dashboard</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
                Understand model performance, discover potential fairness disparities and review mitigation outcomes in one place.
              </p>
            </div>
            <div className="rounded-2xl border border-white bg-white/90 p-5 text-blue-600 shadow-sm">
              <BrainCircuit size={42} strokeWidth={1.7} />
              <p className="mt-2 text-xs font-semibold text-slate-500">Audit workspace</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 border-t border-blue-100 pt-5 sm:grid-cols-3">
            <div className="flex items-center gap-2 text-sm text-slate-600"><Database size={16} className="text-blue-600" /> CSV dataset inspection</div>
            <div className="flex items-center gap-2 text-sm text-slate-600"><Activity size={16} className="text-blue-600" /> Fairness & performance metrics</div>
            <div className="flex items-center gap-2 text-sm text-slate-600"><ShieldCheck size={16} className="text-blue-600" /> Explainable audit results</div>
          </div>
        </header>

        {/* DATASET UPLOAD */}
        <section className="upload-panel mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600"><FileUp size={24} /></div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Upload your dataset</h3>
                <p className="mt-1 text-sm text-slate-500">Select a structured CSV file to begin the fairness audit.</p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">CSV format · Local preview</span>
          </div>

          <label className="upload-dropzone flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-5 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50">
            <div className="mb-3 rounded-2xl bg-white p-3 text-blue-600 shadow-sm"><FileUp size={26} /></div>
            <span className="text-sm font-bold text-slate-800">Choose a CSV file</span>
            <span className="mt-1 text-xs text-slate-500">Click here to browse your computer · .csv only</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleFileSelection(e.target.files?.[0] || null)}
              className="sr-only"
            />
          </label>

          {file && (
            <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${datasetError ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
              <div className="flex items-center gap-2 text-sm">
                {datasetError ? <AlertTriangle size={17} className="text-rose-600" /> : <CheckCircle size={17} className="text-emerald-600" />}
                <span className={`font-semibold ${datasetError ? "text-rose-700" : "text-emerald-700"}`}>{file.name}</span>
                <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
              <span className={`text-xs font-semibold ${datasetError ? "text-rose-700" : "text-emerald-700"}`}>{datasetError ? "Needs attention" : "File selected"}</span>
            </div>
          )}

          {datasetError && <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">{datasetError}</div>}
          {error && <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</div>}

          {file && !datasetError && !results && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900" role="status">
              <p className="font-semibold">
                {isDemoMode ? "Sample dataset loaded successfully!" : "Dataset selected successfully!"}
              </p>
              <p className="mt-1">
                Your CSV is ready for review. Visit{" "}
                <button
                  type="button"
                  onClick={() => setActivePage("dataset")}
                  className="font-bold text-blue-700 underline decoration-blue-400 underline-offset-2 hover:text-blue-900"
                >
                  Dataset Audit
                </button>{" "}
                to inspect the uploaded data, preview records and check data quality.
                Once reviewed, return to the Dashboard and click <strong>Run AI Audit</strong>.
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Your CSV is previewed in the browser and sent to the configured audit API when you run the audit.</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={loadSampleDemo}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Activity size={17} /> Try Sample Demo
              </button>
              <button
                onClick={() => runAudit()}
              disabled={loading || !file || Boolean(datasetError) || datasetPreview.headers.length === 0 || datasetPreview.records.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
                {loading ? <><Loader2 size={17} className="animate-spin" /> Analysing dataset...</> : <><Activity size={17} /> Run AI Audit</>}
              </button>
            </div>
          </div>
        </section>

        {/* EMPTY STATE: show only before a file is selected */}
        {!results && !loading && !file && !error && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <Database className="mx-auto mb-4 text-slate-300" size={42} />
            <h3 className="text-lg font-bold text-slate-800">Ready to analyse your AI model?</h3>
            <p className="mt-2 text-sm text-slate-500">Choose a CSV dataset above. Your audit summary and visualisations will appear here.</p>
          </div>
        )}


        {/* ================= LOADING STATE ================= */}

        {loading && (

          <div className="rounded-2xl border border-blue-100 bg-white p-12 text-center shadow-sm" role="status" aria-live="polite">

            <Loader2
              className="mx-auto mb-4 animate-spin text-blue-600"
              size={40}
            />

            <h3 className="font-semibold text-slate-900">
              Running AI Audit
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Sending your dataset to the audit API. The backend is validating the CSV, evaluating the model, calculating fairness metrics and preparing the results.
            </p>

            <div className="mx-auto mt-6 h-2 max-w-md overflow-hidden rounded-full bg-blue-100">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" />
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Please keep this page open. Results will appear here when the audit is complete.
            </p>

          </div>

        )}


        {/* ================= AUDIT RESULTS ================= */}

        {results && (

          <>

          {isDemoMode && (
            <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-700"><AlertTriangle size={20} /></div>
                <div>
                  <h3 className="font-bold text-amber-900">Synthetic demonstration dataset</h3>
                  <p className="mt-1 text-sm leading-6 text-amber-800">This sample hiring dataset is synthetic and deliberately designed to demonstrate how fairness metrics can reveal group disparities. The results are illustrative only and are not evidence about real hiring practices or proof of discrimination.</p>
                  <p className="mt-2 text-sm font-semibold text-amber-900">Interpret the metrics together: reducing one measured gap does not guarantee that a model is fair.</p>
                </div>
              </div>
            </section>
          )}

          <div id="audit-results" className="mb-6 scroll-mt-6 flex justify-end">
  <button
    onClick={downloadAuditReport}
    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
  >
    Download PDF Audit Report
  </button>
</div>

            {/* ================= METRIC CARDS ================= */}

            <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric, index) => {
                const MetricIcon = [Activity, Database, BrainCircuit, CheckCircle][index] || Activity;
                const iconStyles = ["bg-blue-50 text-blue-600", "bg-violet-50 text-violet-600", "bg-cyan-50 text-cyan-700", "bg-emerald-50 text-emerald-700"][index] || "bg-blue-50 text-blue-600";
                return (
                  <div key={metric.title} className="dashboard-metric-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.title}</p>
                        <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{metric.value}</h3>
                      </div>
                      <div className={`rounded-xl p-3 ${iconStyles}`}><MetricIcon size={21} /></div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">{metric.description}</p>
                    <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${["w-full bg-blue-500", "w-4/5 bg-violet-500", "w-3/4 bg-cyan-500", "w-1/4 bg-emerald-500"][index] || "w-1/2 bg-blue-500"}`} /></div>
                  </div>
                );
              })}
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

              <div className="dashboard-chart-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md md:p-7">

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

              <div className="dashboard-chart-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md md:p-7">

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

              <div className="dashboard-chart-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md md:p-7">

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

              <div className="dashboard-chart-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md md:p-7">

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
            <header className="dataset-page-header">
              <p className="text-sm font-semibold tracking-wide text-blue-600">RESPONSIBLE AI / DATASET AUDIT</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Dataset Audit</h2>
                  <p className="mt-2 max-w-3xl text-slate-500">
                    Understand your data before training. Inspect structure, completeness, duplicates and numeric distributions.
                  </p>
                </div>
                {datasetPreview.headers.length > 0 && (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    Dataset loaded
                  </span>
                )}
              </div>
            </header>

            <div className="dataset-upload-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-blue-100 p-3 text-blue-600"><FileUp size={23} /></div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Upload your dataset</h3>
                  <p className="text-sm text-slate-500">Choose a CSV file or drag it into the upload area. Previewing happens locally in your browser.</p>
                </div>
              </div>

              <label
                htmlFor="dataset-audit-file"
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDatasetDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDatasetDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDatasetDragging(false);
                  handleFileSelection(event.dataTransfer.files?.[0] || null);
                }}
                className={`dataset-dropzone flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition ${
                  isDatasetDragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/60"
                }`}
              >
                <div className="mb-3 rounded-2xl bg-white p-3 text-blue-600 shadow-sm">
                  <FileUp size={26} />
                </div>
                <span className="font-semibold text-slate-800">
                  {isDatasetDragging ? "Drop your CSV file here" : "Drag and drop your CSV file"}
                </span>
                <span className="mt-1 text-sm text-slate-500">or click to browse your computer</span>
                <span className="mt-3 rounded-lg bg-white px-3 py-1 text-xs font-medium text-slate-500">CSV files only</span>
                <input
                  id="dataset-audit-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => handleFileSelection(event.target.files?.[0] || null)}
                  className="sr-only"
                />
              </label>

              {file && (
                <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
                  datasetError ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"
                }`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`rounded-lg p-2 ${datasetError ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>
                      {datasetError ? <AlertTriangle size={19} /> : <CheckCircle size={19} />}
                    </div>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-semibold ${datasetError ? "text-red-800" : "text-emerald-800"}`}>{file.name}</p>
                      <p className={`text-xs ${datasetError ? "text-red-700" : "text-emerald-700"}`}>
                        {datasetError ? "File needs attention" : `${(file.size / 1024).toFixed(1)} KB · Ready for preview`}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    datasetError ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {datasetError ? "Check file" : "File selected"}
                  </span>
                </div>
              )}

              {datasetError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
                  {datasetError}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">Your CSV stays in the browser until you run an audit from the Dashboard.</p>
                {datasetPreview.headers.length > 0 && !datasetError && (
                  <button
                    onClick={() => setActivePage("dashboard")}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    Continue to AI Audit
                  </button>
                )}
              </div>
            </div>

            {datasetPreview.headers.length > 0 && !datasetError && (() => {
              const { headers, records } = datasetPreview;
              const missingByColumn = headers.map((header) => ({
                name: header,
                missing: records.filter((record) => !String(record[header] ?? "").trim()).length,
                unique: new Set(records.map((record) => record[header]).filter((value) => String(value ?? "").trim() !== "")).size,
              }));
              const totalMissing = missingByColumn.reduce((sum, column) => sum + column.missing, 0);
              const duplicateRows = records.length - new Set(
                records.map((record) => JSON.stringify(headers.map((header) => record[header])))
              ).size;
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

              const summaryCards = [
                { label: "Total records", value: records.length.toLocaleString(), note: "Rows detected", tone: "blue" },
                { label: "Total columns", value: headers.length, note: "Fields detected", tone: "violet" },
                { label: "Missing cells", value: totalMissing.toLocaleString(), note: "Blank or empty values", tone: totalMissing ? "amber" : "green" },
                { label: "Duplicate rows", value: duplicateRows.toLocaleString(), note: "Exact duplicate records", tone: duplicateRows ? "amber" : "green" },
              ];

              return (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {summaryCards.map((item) => (
                      <div key={item.label} className="dataset-stat-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-500">{item.label}</p>
                            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{item.value}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                          </div>
                          <span className={`h-2.5 w-2.5 rounded-full ${
                            item.tone === "amber" ? "bg-amber-500" :
                            item.tone === "green" ? "bg-emerald-500" :
                            item.tone === "violet" ? "bg-violet-500" : "bg-blue-500"
                          }`} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="dataset-panel rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Dataset preview</h3>
                        <p className="mt-1 text-sm text-slate-500">A quick look at the first 10 records in your file.</p>
                      </div>
                      <span className="max-w-full truncate rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">{file?.name}</span>
                    </div>
                    <div className="dataset-table-wrap overflow-x-auto rounded-xl border border-slate-200">
                      <table className="dataset-table min-w-full border-collapse text-left text-sm">
                        <thead>
                          <tr>
                            {headers.map((header) => <th key={header} className="whitespace-nowrap px-4 py-3 font-semibold">{header}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {records.slice(0, 10).map((record, rowIndex) => (
                            <tr key={rowIndex}>
                              {headers.map((header) => (
                                <td key={header} className="whitespace-nowrap px-4 py-3">
                                  {record[header] ? record[header] : <span className="font-medium text-amber-600">(blank)</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Showing {Math.min(records.length, 10)} of {records.length.toLocaleString()} records.</p>
                  </div>

                  <div className="dataset-panel rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Data quality report</h3>
                        <p className="mt-1 text-sm text-slate-500">Missing values and distinct-value counts for every column.</p>
                      </div>
                      <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        totalMissing === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {totalMissing === 0 ? "No missing cells" : `${totalMissing} cells need review`}
                      </span>
                    </div>
                    <div className="dataset-table-wrap overflow-x-auto rounded-xl border border-slate-200">
                      <table className="dataset-table min-w-full text-left text-sm">
                        <thead>
                          <tr>
                            <th className="px-4 py-3">Column</th>
                            <th className="px-4 py-3">Missing values</th>
                            <th className="px-4 py-3">Unique values</th>
                            <th className="px-4 py-3">Quality status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {missingByColumn.map((column) => (
                            <tr key={column.name}>
                              <td className="px-4 py-3 font-semibold">{column.name}</td>
                              <td className="px-4 py-3">{column.missing}</td>
                              <td className="px-4 py-3">{column.unique}</td>
                              <td className="px-4 py-3">
                                {column.missing === 0
                                  ? <span className="font-semibold text-emerald-600">✓ No missing values</span>
                                  : <span className="font-semibold text-amber-600">Needs review</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {numericSummaries.length > 0 && (
                    <div className="dataset-panel rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-5">
                        <h3 className="text-lg font-bold text-slate-900">Numeric column statistics</h3>
                        <p className="mt-1 text-sm text-slate-500">Minimum, maximum and mean values for detected numeric columns.</p>
                      </div>
                      <div className="dataset-table-wrap overflow-x-auto rounded-xl border border-slate-200">
                        <table className="dataset-table min-w-full text-left text-sm">
                          <thead>
                            <tr>
                              <th className="px-4 py-3">Column</th>
                              <th className="px-4 py-3">Minimum</th>
                              <th className="px-4 py-3">Maximum</th>
                              <th className="px-4 py-3">Mean</th>
                            </tr>
                          </thead>
                          <tbody>
                            {numericSummaries.map((item) => (
                              <tr key={item.name}>
                                <td className="px-4 py-3 font-semibold">{item.name}</td>
                                <td className="px-4 py-3">{item.min}</td>
                                <td className="px-4 py-3">{item.max}</td>
                                <td className="px-4 py-3 font-semibold">{item.mean.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className={`rounded-2xl border p-5 ${
                    totalMissing === 0
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}>
                    <div className="flex items-start gap-3">
                      {totalMissing === 0 ? <CheckCircle className="mt-0.5 shrink-0" size={21} /> : <AlertTriangle className="mt-0.5 shrink-0" size={21} />}
                      <div>
                        <p className="font-bold">{totalMissing === 0 ? "Initial data quality check passed" : "Data quality review recommended"}</p>
                        <p className="mt-1 text-sm leading-relaxed">
                          {totalMissing === 0
                            ? "No blank cells were detected in this CSV preview."
                            : `${totalMissing} blank cells were detected. Review and handle them before training or auditing a model.`}
                          {" "}This is a basic structural check, not a complete validation of dataset suitability.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </section>
        )}

        {activePage === "fairness" && <FairnessMetrics results={results} />}

        {activePage === "settings" && (
          <section className="space-y-6">
            <header>
              <p className="text-sm font-semibold text-blue-600">WORKSPACE / PREFERENCES</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Settings</h2>
              <p className="mt-2 text-slate-500">Personalise the workspace and inspect the current audit configuration.</p>
            </header>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="settings-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><Monitor size={22} /></div><div><h3 className="text-lg font-bold">Appearance</h3><p className="text-sm text-slate-500">Choose how FairGauge AI looks.</p></div></div>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setTheme("light")} className={`rounded-xl border p-4 text-left transition ${theme === "light" ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"}`}><Sun className="mb-3 text-amber-500" /><span className="block font-semibold">Light</span><span className="text-xs text-slate-500">Bright workspace</span></button>
                  <button type="button" onClick={() => setTheme("dark")} className={`rounded-xl border p-4 text-left transition ${theme === "dark" ? "border-blue-500 bg-blue-950/40 ring-2 ring-blue-900" : "border-slate-200 hover:border-slate-300"}`}><Moon className="mb-3 text-indigo-400" /><span className="block font-semibold">Dark</span><span className="text-xs text-slate-500">Low-light workspace</span></button>
                </div>
                <p className="mt-4 text-xs text-slate-500">Your preference is saved in this browser and restored on your next visit.</p>
              </div>

              <div className="settings-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-3 text-emerald-600"><Activity size={22} /></div><div><h3 className="text-lg font-bold">System status</h3><p className="text-sm text-slate-500">Current application connectivity.</p></div></div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4"><span className="text-sm font-medium text-slate-600">FastAPI backend</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${apiStatus === "online" ? "bg-emerald-100 text-emerald-700" : apiStatus === "offline" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{apiStatus === "online" ? "Connected" : apiStatus === "offline" ? "Not reachable" : "Checking"}</span></div>
                <p className="mt-3 break-all text-xs text-slate-500">API endpoint: {API_BASE_URL}</p>
                <p className="mt-2 text-xs text-slate-500">Status is checked when the application opens. Start the FastAPI server if the backend is offline.</p>
              </div>

              <div className="settings-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-3 text-amber-600"><ShieldCheck size={22} /></div><div><h3 className="text-lg font-bold">Audit preferences</h3><p className="text-sm text-slate-500">Current screening configuration.</p></div></div>
                <div className="space-y-3 text-sm"><div className="flex justify-between gap-4 border-b border-slate-100 pb-3"><span className="text-slate-500">Demographic parity difference</span><strong>5 percentage points</strong></div><div className="flex justify-between gap-4 border-b border-slate-100 pb-3"><span className="text-slate-500">Selection rate ratio</span><strong>0.80 screening rule</strong></div><div className="flex justify-between gap-4"><span className="text-slate-500">Equal opportunity difference</span><strong>0.05 screening threshold</strong></div></div>
                <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">These are prototype screening thresholds, not universal fairness standards or legal conclusions. Thresholds are currently controlled by backend code; this page displays them but does not change audit calculations.</p>
              </div>

              <div className="settings-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-600"><BrainCircuit size={22} /></div><div><h3 className="text-lg font-bold">About FairGauge AI</h3><p className="text-sm text-slate-500">Responsible AI auditing prototype.</p></div></div>
                <p className="text-sm leading-relaxed text-slate-600">FairGauge AI helps inspect model performance, demographic selection outcomes, equal opportunity indicators and model explanations in one workflow.</p>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-4"><span className="text-sm text-slate-500">Application version</span><strong className="text-sm">Prototype 1.0</strong></div>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">Fairness metrics are screening indicators, not proof of discrimination. SHAP explanations describe model behaviour and are not causal evidence. Human review and contextual evaluation remain necessary.</p>
              </div>
            </div>
          </section>
        )}

      </main>

    </div>

  );

}

export default App;