import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Activity,
  Scale,
  Target,
} from "lucide-react";


function MetricCard({ title, value, description, icon: Icon, status }) {
  const statusStyles = {
    warning: "bg-amber-100 text-amber-700",
    success: "bg-green-100 text-green-700",
    neutral: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="fairness-metric-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="flex items-center justify-between">

        <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
          <Icon size={24} />
        </div>

        {status && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              statusStyles[status.type] || statusStyles.neutral
            }`}
          >
            {status.label}
          </span>
        )}

      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">
        {title}
      </p>

      <h3 className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </h3>

      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        {description}
      </p>

    </div>
  );
}


function ComparisonCard({ title, original, mitigated, unit = "" }) {
  const hasMitigated = Number.isFinite(Number(mitigated));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">

      <p className="text-sm font-semibold text-slate-600">
        {title}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4">

        <div>
          <p className="text-xs text-slate-400">
            Original
          </p>

          <p className="mt-1 text-xl font-bold text-slate-800">
            {Number(original).toFixed(2)}{unit}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-400">
            After Mitigation
          </p>

          <p className="mt-1 text-xl font-bold text-blue-600">
            {hasMitigated
              ? `${Number(mitigated).toFixed(2)}${unit}`
              : "N/A"}
          </p>
        </div>

      </div>

    </div>
  );
}


export default function FairnessMetrics({ results }) {
  const [threshold, setThreshold] = useState(0.50);

  if (!results) {
    return (
      <section className="fairness-empty-state rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

        <div className="text-center">

          <ShieldCheck
            size={48}
            className="mx-auto text-slate-300"
          />

          <h2 className="mt-4 text-2xl font-bold text-slate-800">
            Fairness Analysis
          </h2>

          <p className="mt-3 text-slate-500">
            Run an AI audit from the Dashboard to view detailed
            fairness metrics and demographic comparisons.
          </p>

        </div>

      </section>
    );
  }


  const dp = results.demographic_parity;
  const eo = results.equal_opportunity;
  const mitigation = results.mitigation;

  if (!dp || !eo) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
        Fairness metrics are missing from the audit response.
        Please run the audit again.
      </div>
    );
  }


  const maleRate = Number(dp.group_a_selection_rate);
  const femaleRate = Number(dp.group_b_selection_rate);

  const dpDifference = Number(dp.demographic_parity_difference);
  const absoluteGap = Number(dp.absolute_difference);
  const selectionRatio = Number(dp.selection_rate_ratio);

  const maleTpr = Number(eo.male_tpr);
  const femaleTpr = Number(eo.female_tpr);

  const eod = Number(eo.equal_opportunity_difference);


  const selectionData = [
    {
      group: "Male",
      original: maleRate,
      mitigated: mitigation?.demographic_parity?.group_a_selection_rate,
    },
    {
      group: "Female",
      original: femaleRate,
      mitigated: mitigation?.demographic_parity?.group_b_selection_rate,
    },
  ];


  const tprData = [
    {
      group: "Male",
      original: maleTpr,
      mitigated: mitigation?.equal_opportunity?.male_tpr,
    },
    {
      group: "Female",
      original: femaleTpr,
      mitigated: mitigation?.equal_opportunity?.female_tpr,
    },
  ];


  const mitigatedDp = mitigation?.demographic_parity;
  const mitigatedEo = mitigation?.equal_opportunity;


  const hasValidDp = Number.isFinite(dpDifference);
  const hasValidEod = Number.isFinite(eod);


  const dpStatus =
    hasValidDp && Math.abs(dpDifference) >= 0.05
      ? {
          label: "Potential disparity",
          type: "warning",
        }
      : {
          label: "Below screening threshold",
          type: "success",
        };


  const ratioStatus =
    Number.isFinite(selectionRatio) && selectionRatio < 0.8
      ? {
          label: "Needs review",
          type: "warning",
        }
      : {
          label: "Above screening threshold",
          type: "success",
        };


  const eodStatus =
    hasValidEod && Math.abs(eod) >= 0.05
      ? {
          label: "Potential disparity",
          type: "warning",
        }
      : {
          label: "Below screening threshold",
          type: "success",
        };

  // Interactive decision-threshold simulator. It recomputes metrics from
  // held-out test-set probabilities returned by the backend.
  const simulatorRows = Array.isArray(results.threshold_simulator)
    ? results.threshold_simulator
    : [];

  const simulated = (() => {
    if (!simulatorRows.length) return null;

    const rows = simulatorRows.map((row) => ({
      actual: Number(row.actual),
      group: String(row.group),
      predicted: Number(row.probability) >= threshold ? 1 : 0,
    }));

    const groupStats = (groupName) => {
      const groupRows = rows.filter((row) => row.group === groupName);
      const selected = groupRows.filter((row) => row.predicted === 1).length;
      const positives = groupRows.filter((row) => row.actual === 1);
      const truePositives = positives.filter((row) => row.predicted === 1).length;
      return {
        total: groupRows.length,
        selectionRate: groupRows.length ? (selected / groupRows.length) * 100 : null,
        tpr: positives.length ? (truePositives / positives.length) * 100 : null,
      };
    };

    const male = groupStats("Male");
    const female = groupStats("Female");
    const correct = rows.filter((row) => row.actual === row.predicted).length;
    const accuracy = rows.length ? (correct / rows.length) * 100 : null;
    const dpd = male.selectionRate !== null && female.selectionRate !== null
      ? (female.selectionRate - male.selectionRate) / 100
      : null;
    const eodValue = male.tpr !== null && female.tpr !== null
      ? (female.tpr - male.tpr) / 100
      : null;
    const gap = male.selectionRate !== null && female.selectionRate !== null
      ? Math.abs(female.selectionRate - male.selectionRate)
      : null;
    const ratio = male.selectionRate !== null && female.selectionRate !== null
      ? (Math.max(male.selectionRate, female.selectionRate) === 0
          ? 0
          : Math.min(male.selectionRate, female.selectionRate) /
            Math.max(male.selectionRate, female.selectionRate))
      : null;

    return { accuracy, male, female, dpd, eod: eodValue, gap, ratio, count: rows.length };
  })();

  return (

    <section className="fairness-page space-y-8">

      {/* PAGE HEADER */}

      <header>

        <p className="text-sm font-medium text-blue-600">
          Responsible AI / Fairness Analysis
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Fairness Analysis
        </h2>

        <p className="mt-2 max-w-3xl text-slate-500">
          Evaluate differences in model outcomes across demographic
          groups and examine how the reweighing mitigation technique
          changes the measured fairness indicators.
        </p>

      </header>


      {/* OVERALL STATUS */}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">

        <div className="flex items-start gap-4">

          <AlertTriangle
            size={28}
            className="mt-1 shrink-0 text-amber-600"
          />

          <div>

            <h3 className="font-bold text-amber-900">
              Fairness Screening Summary
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-amber-800">
              {dpStatus.type === "warning"
                ? `A selection-rate difference of ${absoluteGap.toFixed(2)} percentage points was detected between the evaluated groups. Further investigation is recommended.`
                : "The demographic parity difference is below the configured screening threshold. Continue monitoring the model across representative datasets."}
            </p>

            <p className="mt-2 text-xs text-amber-700">
              This is a screening result, not a legal determination
              or proof of discrimination.
            </p>

          </div>

        </div>

      </div>


      {/* METRIC CARDS */}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

        <MetricCard
          title="Demographic Parity Difference"
          value={hasValidDp ? dpDifference.toFixed(4) : "N/A"}
          description={`Absolute selection-rate gap: ${Number.isFinite(absoluteGap) ? absoluteGap.toFixed(2) : "N/A"} percentage points.`}
          icon={Scale}
          status={dpStatus}
        />

        <MetricCard
          title="Selection Rate Ratio"
          value={Number.isFinite(selectionRatio) ? selectionRatio.toFixed(4) : "N/A"}
          description="Ratio of the lower selection rate to the higher selection rate."
          icon={Activity}
          status={ratioStatus}
        />

        <MetricCard
          title="Equal Opportunity Difference"
          value={hasValidEod ? eod.toFixed(4) : "N/A"}
          description="Difference in true positive rates between the evaluated groups."
          icon={Target}
          status={eodStatus}
        />

      </div>


      {/* SELECTION RATE CHART */}

      <div className="fairness-chart-card rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">

        <div className="mb-6">

          <h3 className="text-xl font-bold text-slate-900">
            Demographic Selection Rate Comparison
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Compare the percentage of Male and Female records
            receiving positive model predictions.
          </p>

        </div>


        <ResponsiveContainer width="100%" height={320}>

          <BarChart
            data={selectionData}
            margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
          >

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="group" />

            <YAxis
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />

            <Tooltip
              formatter={(value) => [
                `${Number(value).toFixed(2)}%`,
                "Selection Rate",
              ]}
            />

            <Legend />

            <Bar
              dataKey="original"
              name="Original Model"
              fill="#2563eb"
              radius={[6, 6, 0, 0]}
            />

            {mitigation && (
              <Bar
                dataKey="mitigated"
                name="After Reweighing"
                fill="#16a34a"
                radius={[6, 6, 0, 0]}
              />
            )}

          </BarChart>

        </ResponsiveContainer>

      </div>


      {/* TRUE POSITIVE RATE CHART */}

      <div className="fairness-chart-card rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">

        <div className="mb-6">

          <h3 className="text-xl font-bold text-slate-900">
            Equal Opportunity Comparison
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Compare true positive rates (TPR) across demographic groups.
            TPR measures how many actual positive cases were correctly
            identified by the model.
          </p>

        </div>


        <ResponsiveContainer width="100%" height={300}>

          <BarChart data={tprData}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="group" />

            <YAxis
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />

            <Tooltip
              formatter={(value) => [
                `${Number(value).toFixed(2)}%`,
                "True Positive Rate",
              ]}
            />

            <Legend />

            <Bar
              dataKey="original"
              name="Original Model"
              fill="#7c3aed"
              radius={[6, 6, 0, 0]}
            />

            {mitigation && (
              <Bar
                dataKey="mitigated"
                name="After Reweighing"
                fill="#0891b2"
                radius={[6, 6, 0, 0]}
              />
            )}

          </BarChart>

        </ResponsiveContainer>

      </div>


      {/* BEFORE VS AFTER MITIGATION */}

      {mitigation && (

        <div className="fairness-mitigation-card rounded-2xl border border-blue-200 bg-blue-50/50 p-7">

          <div className="mb-6 flex items-center gap-3">

            <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
              <ShieldCheck size={25} />
            </div>

            <div>

              <h3 className="text-xl font-bold text-slate-900">
                Before vs After Mitigation
              </h3>

              <p className="text-sm text-slate-500">
                Impact of the reweighing technique on fairness metrics.
              </p>

            </div>

          </div>


          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            <ComparisonCard
              title="Demographic Parity Difference"
              original={dpDifference}
              mitigated={mitigatedDp?.demographic_parity_difference}
            />

            <ComparisonCard
              title="Selection Rate Ratio"
              original={selectionRatio}
              mitigated={mitigatedDp?.selection_rate_ratio}
            />

            <ComparisonCard
              title="Equal Opportunity Difference"
              original={eod}
              mitigated={mitigatedEo?.equal_opportunity_difference}
            />

          </div>


          <div className="mt-6 rounded-xl border border-blue-200 bg-white p-5">

            <h4 className="font-bold text-slate-800">
              Mitigation Interpretation
            </h4>

            <p className="mt-2 text-sm leading-relaxed text-slate-600">

              {Number.isFinite(Number(mitigatedDp?.absolute_difference))
                ? `The original selection gap was ${absoluteGap.toFixed(2)} percentage points. After reweighing, the measured gap was ${Number(mitigatedDp.absolute_difference).toFixed(2)} percentage points.`
                : "Mitigated demographic parity results are unavailable."}

              {" "}

              The mitigation technique changes the model's measured
              outcomes, but does not guarantee that the resulting model
              is fair.

            </p>

          </div>

        </div>

      )}


      {/* WHAT-IF SIMULATOR */}

      <section className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm md:p-7">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Interactive tool</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Fairness What-If Simulator</h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                Change the decision threshold and see how predictions, accuracy and group fairness indicators change on the same held-out test records.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700">Original model · Test set</span>
          </div>

          {simulatorRows.length === 0 ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              The simulator data is not available in this audit response. Restart the backend with the updated main.py file and run the audit again.
            </div>
          ) : (
            <>
              <div className="mt-6 rounded-xl bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label htmlFor="fairness-threshold" className="text-sm font-semibold text-slate-700">Decision threshold</label>
                  <span className="rounded-lg bg-indigo-100 px-3 py-1.5 text-lg font-bold text-indigo-800">{threshold.toFixed(2)}</span>
                </div>
                <input
                  id="fairness-threshold"
                  type="range"
                  min="0.10"
                  max="0.90"
                  step="0.01"
                  value={threshold}
                  onChange={(event) => setThreshold(Number(event.target.value))}
                  className="mt-4 w-full cursor-pointer accent-indigo-600"
                />
                <div className="mt-1 flex justify-between text-xs text-slate-400"><span>0.10 · More inclusive</span><span>0.90 · More selective</span></div>
                <p className="mt-3 text-xs text-slate-500">A record is predicted as Hired when its model probability is greater than or equal to the selected threshold.</p>
              </div>

              {simulated && (
                <>
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["Test accuracy", `${simulated.accuracy.toFixed(2)}%`],
                      ["Selection-rate gap", `${simulated.gap.toFixed(2)} pp`],
                      ["Selection-rate ratio", simulated.ratio.toFixed(3)],
                      ["Equal opportunity diff.", simulated.eod === null ? "N/A" : simulated.eod.toFixed(3)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-white bg-white p-4">
                        <p className="text-xs font-medium text-slate-500">{label}</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[['Male', simulated.male], ['Female', simulated.female]].map(([name, stats]) => (
                      <div key={name} className="rounded-xl border border-white bg-white p-4">
                        <p className="font-semibold text-slate-800">{name}</p>
                        <div className="mt-3 flex justify-between gap-3 text-sm"><span className="text-slate-500">Selection rate</span><strong>{stats.selectionRate === null ? "N/A" : `${stats.selectionRate.toFixed(2)}%`}</strong></div>
                        <div className="mt-2 flex justify-between gap-3 text-sm"><span className="text-slate-500">True positive rate</span><strong>{stats.tpr === null ? "N/A" : `${stats.tpr.toFixed(2)}%`}</strong></div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-slate-600">
                    Simulation uses {simulated.count} held-out test records and the original model's predicted probabilities. It changes only the classification threshold; it does not retrain the model or apply mitigation. Metrics are screening indicators and should be interpreted with context.
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </section>


      {/* FAIRNESS METRIC GUIDE — visually separate from the simulator */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Quick reference</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Understanding Fairness Metrics</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
              Use these definitions to interpret the indicators shown above. No single metric provides a complete fairness assessment.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">3 key indicators</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-xl border border-blue-200 bg-blue-50/60 p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">01 · DPD</span>
              <Scale size={20} className="text-blue-600" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Demographic Parity Difference</h4>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">Measures the difference in positive prediction rates between the evaluated groups. A value closer to zero means more similar selection rates.</p>
            <div className="mt-4 rounded-lg border border-blue-100 bg-white p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Formula</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">Female selection rate − Male selection rate</p>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">Negative: female rate is lower. Positive: female rate is higher. Zero: rates are equal.</p>
          </article>

          <article className="rounded-xl border border-violet-200 bg-violet-50/60 p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">02 · SRR</span>
              <Activity size={20} className="text-violet-600" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Selection Rate Ratio</h4>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">Compares the lower group selection rate with the higher group selection rate. A value closer to one means more similar selection rates.</p>
            <div className="mt-4 rounded-lg border border-violet-100 bg-white p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-violet-700">Formula</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">Lower selection rate ÷ Higher selection rate</p>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">A ratio below 0.80 is used here as a screening rule of thumb, not a universal legal test.</p>
          </article>

          <article className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">03 · EOD</span>
              <Target size={20} className="text-emerald-600" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Equal Opportunity Difference</h4>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">Measures the difference in true positive rates. It compares how often actual positive cases are correctly identified across groups.</p>
            <div className="mt-4 rounded-lg border border-emerald-100 bg-white p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Formula</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">Female TPR − Male TPR</p>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">A value closer to zero means more similar true positive rates.</p>
          </article>
        </div>

        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm leading-relaxed text-amber-900"><strong>Interpretation note:</strong> These metrics can disagree because they measure different aspects of model outcomes. Treat them as screening indicators for further investigation, not proof of discrimination or a complete fairness verdict.</p>
        </div>
      </section>


      {/* FINAL DISCLAIMER */}

      <div className="rounded-xl border border-green-200 bg-green-50 p-5">

        <div className="flex items-start gap-3">

          <CheckCircle
            size={23}
            className="mt-1 shrink-0 text-green-600"
          />

          <div>

            <h4 className="font-bold text-green-900">
              Responsible AI Notice
            </h4>

            <p className="mt-2 text-sm leading-relaxed text-green-800">
              Fairness metrics are indicators for further investigation,
              not proof of discrimination. Different fairness metrics
              can produce different conclusions. Human review and
              contextual evaluation are necessary before making
              decisions based on these results.
            </p>

          </div>

        </div>

      </div>

    </section>

  );
}