import { useState } from "react";

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
} from "recharts";


function App() {

  // React state
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  // Upload CSV and run AI audit
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


  // Dashboard metric cards
  const metrics = results
    ? [
        {
          title: "Model Accuracy",
          value: `${results.model_performance.accuracy}%`,
          description: "Prediction accuracy",
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


  // Selection rate chart data
  const selectionData = results
    ? [
        {
          group: "Male",
          rate:
            results.demographic_parity.group_a_selection_rate,
        },
        {
          group: "Female",
          rate:
            results.demographic_parity.group_b_selection_rate,
        },
      ]
    : [];


  // Model performance chart data
  const performanceData = results
    ? Object.entries(results.model_performance).map(
        ([name, value]) => ({
          metric: name.replaceAll("_", " "),
          score: value,
        })
      )
    : [];


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

          <div className="flex items-center gap-3 rounded-xl bg-blue-600 px-4 py-3">
            <LayoutDashboard size={19} />
            Dashboard
          </div>

          <div className="flex items-center gap-3 px-4 py-3 text-slate-400">
            <FileUp size={19} />
            Dataset Audit
          </div>

          <div className="flex items-center gap-3 px-4 py-3 text-slate-400">
            <Activity size={19} />
            Fairness Analysis
          </div>

          <div className="flex items-center gap-3 px-4 py-3 text-slate-400">
            <Settings size={19} />
            Settings
          </div>

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

              const selectedFile = e.target.files?.[0] || null;

              setFile(selectedFile);
              setResults(null);
              setError("");

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

            {/* METRIC CARDS */}

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


            {/* MODEL PERFORMANCE */}

            <section className="mb-8 rounded-2xl bg-white p-7 shadow-sm">

              <h3 className="mb-6 text-xl font-bold">
                Model Performance
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


            {/* ================= CHARTS ================= */}

            <section className="mb-8 grid gap-5 lg:grid-cols-2">


              {/* SELECTION RATE CHART */}

              <div className="rounded-2xl bg-white p-7 shadow-sm">

                <h3 className="mb-2 text-xl font-bold">
                  Selection Rate Comparison
                </h3>

                <p className="mb-6 text-sm text-slate-500">
                  Comparing hiring selection rates between demographic groups.
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
                  Model Performance Comparison
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


            {/* SYNTHETIC DATASET NOTE */}

            <p className="mt-5 text-xs leading-relaxed text-slate-500">
              Demonstration note: Results are based on the uploaded dataset.
              The current hiring example uses synthetic data with deliberately
              constructed gender-based differences. Fairness metrics are
              screening indicators and do not independently establish
              discrimination or prove that a model is fair.
            </p>

          </>

        )}

      </main>

    </div>

  );

}

export default App;