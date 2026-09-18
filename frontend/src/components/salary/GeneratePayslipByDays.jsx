// src/components/salary/GeneratePayslipByDays.jsx
//
// A separate, lightweight payslip form for partial-month cases (an
// employee who only worked a custom number of days that month — mid-month
// joiner/exit, unpaid leave block, etc). It does NOT touch the existing
// PayslipGenerator.jsx — this is an additional entry point.
//
// Earnings, LOP Days/Amount, and Other Deductions all display exactly as
// they would for a full month (matching the reference payslip format) —
// only Net Pay itself reflects the days actually worked, via an explicit
// `netPayOverride` computed from prorated gross earnings minus the fixed
// deductions (PF + Prof Tax). See the long comment in buildPayload().
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../utils/apiConfig";
import { toISTDateString } from "../../utils/dateTimeUtils";
import { MONTHS } from "../../utils/constants";
import PayslipPreview from "./PayslipPreview";
import useMeta from "../../utils/useMeta";
import { FiCalendar, FiSearch } from "react-icons/fi";

const daysInMonth = (month, year) => new Date(year, month, 0).getDate();

const GeneratePayslipByDays = () => {
  const canonical = useMemo(
    () => `${window.location.origin}/admin-dashboard/salary/generate-by-days`,
    []
  );
  useMeta({
    title: "Generate Payslip by Days — Speshway HRMS",
    description: "Generate a payslip prorated for a custom number of days worked.",
    keywords: "payslip, payroll, prorated, LOP, HRMS",
    url: canonical,
    image: "/images/Logo.jpg",
    robots: "noindex,nofollow",
  });

  const navigate = useNavigate();
  const now = new Date();

  const [employees, setEmployees] = useState([]);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [employee, setEmployee] = useState(null); // fetched employee + template
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [daysWorked, setDaysWorked] = useState("");
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [error, setError] = useState(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${sessionStorage.getItem("token")}`,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/employee`, { headers: authHeaders() });
        if (res.data.success) {
          setEmployees(
            res.data.employees.map((emp) => ({
              employeeId: emp.employeeId,
              name: emp.userId?.name || "N/A",
            }))
          );
        }
      } catch (_) {
        // Non-fatal — search suggestions just won't populate.
      }
    })();
  }, []);

  const totalDays = daysInMonth(month, year);
  const daysWorkedNum = daysWorked === "" ? null : Math.max(0, Math.min(totalDays, Number(daysWorked)));

  // Days not worked — used only to compute the "Other Deductions" cut in
  // buildPayload (LOP Days/Amount both stay 0 on the payslip itself).
  const shortfallDays = daysWorkedNum == null ? 0 : Math.max(0, totalDays - daysWorkedNum);

  const handleDaysWorkedChange = (e) => {
    setDaysWorked(e.target.value);
  };

  const handleQueryChange = (e) => {
    const value = e.target.value;
    setEmployeeQuery(value);
    setEmployee(null);
    setPreviewData(null);
    if (value.trim().length >= 1) {
      const filtered = employees
        .filter(
          (emp) =>
            emp.employeeId.toLowerCase().includes(value.toLowerCase()) ||
            emp.name.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 8);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const selectEmployee = async (emp) => {
    setSuggestions([]);
    setEmployeeQuery(`${emp.name} (${emp.employeeId})`);
    setError(null);
    setLoadingEmployee(true);
    try {
      const res = await axios.get(`${API_BASE}/api/payslip/employee/${emp.employeeId}`, {
        headers: authHeaders(),
      });
      if (res.data.success) {
        setEmployee(res.data.employee);
      } else {
        setError("Could not load this employee's payroll details.");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Could not load this employee's payroll details.");
    } finally {
      setLoadingEmployee(false);
    }
  };

  const buildPayload = () => {
    const template = employee?.template;
    let basicSalary = template?.basicSalary ?? 0;
    let da = template?.da ?? 0;
    let hra = template?.hra ?? 0;
    let conveyance = template?.conveyance ?? 0;
    let medicalallowances = template?.medicalallowances ?? 0;
    let specialallowances = template?.specialallowances ?? 0;

    // No payroll template on file — fall back to the standard breakdown of
    // their full salary, same formula the main generator uses.
    if (!template && employee?.fullSalary) {
      const fullSalary = parseFloat(employee.fullSalary);
      if (!isNaN(fullSalary) && fullSalary > 2850) {
        const remaining = fullSalary - 2850;
        basicSalary = (remaining * 0.4).toFixed(2);
        da = (remaining * 0.22).toFixed(2);
        hra = (remaining * 0.2).toFixed(2);
        conveyance = "1600";
        medicalallowances = "1250";
        specialallowances = (remaining * 0.18).toFixed(2);
      }
    }

    // PF is based on the FULL (unprorated) basic salary — same rule the
    // main generator uses.
    const fullBasicSalary = Number(basicSalary || 0);
    const pfAmount = template?.autoCalculatePF !== false ? (fullBasicSalary * 0.24).toFixed(2) : template?.pf ?? "";

    // Earnings, LOP Days/Amount, and Other Deductions all display exactly
    // as they would for a full month — Basic/DA/HRA/etc. stay at their
    // full template values, LOP Days/Amount read 0, Other Deductions
    // reads 0 (Total Deductions = PF + Prof Tax only). The unworked days
    // still genuinely reduce Net Pay, via `netPayOverride` below, which is
    // computed on PRORATED gross earnings but never itself displayed as a
    // line item — only Net Pay reflects it. This matches the reference
    // payslip format exactly (Total Earnings/Deductions shown as the full
    // fixed figures; Net Pay computed from days actually worked).
    const grossEarnings =
      Number(basicSalary || 0) +
      Number(da || 0) +
      Number(hra || 0) +
      Number(conveyance || 0) +
      Number(medicalallowances || 0) +
      Number(specialallowances || 0);
    const workedRatio = totalDays > 0 ? (daysWorkedNum ?? totalDays) / totalDays : 1;
    const proratedGrossEarnings = grossEarnings * workedRatio;
    const fixedDeductions = Number(pfAmount || 0) + Number(template?.proftax ?? 0);
    const netPayOverride = Math.max(0, proratedGrossEarnings - fixedDeductions).toFixed(2);

    return {
      employeeId: employee.employeeId,
      employeeObjectId: employee._id,
      name: employee.name,
      email: employee.email,
      designation: employee.designation,
      department: employee.department,
      location: employee.location || "Hyderabad",
      joiningDate: employee.joiningDate ? toISTDateString(new Date(employee.joiningDate)) : "",
      payDate: employee.joiningDate ? toISTDateString(new Date(employee.joiningDate)) : "",
      bankname: employee.bankname || "",
      bankaccountnumber: employee.bankaccountnumber || "",
      pan: employee.pan || "",
      uan: employee.uan || "",
      month,
      monthName: MONTHS[month - 1],
      year,
      basicSalary,
      da,
      hra,
      conveyance,
      medicalallowances,
      specialallowances,
      // Other Deductions always reads 0 — see comment above.
      deductions: 0,
      pf: pfAmount,
      proftax: template?.proftax ?? "",
      // PF is precomputed above from the full (unprorated) basic; don't
      // let the backend recompute it.
      autoCalculatePF: false,
      // "Work Days" shows the days actually worked (matches the reference
      // payslip).
      workingdays: daysWorkedNum ?? totalDays,
      // LOP Days/Amount always read 0 on this payslip.
      lopDays: 0,
      lopamount: 0,
      autoCalculateLOP: false,
      // Net Pay override: computed from prorated gross earnings minus the
      // fixed deductions (PF + Prof Tax) — see comment above. Consumed by
      // the backend (generatePayslip/previewPayslip), pdfGenerator.js, and
      // PayslipPreview.jsx, all of which prefer this over recomputing
      // Total Earnings − Total Deductions when it's present.
      netPayOverride,
    };
  };

  const validate = () => {
    if (!employee) return "Please select an employee.";
    if (daysWorkedNum == null) return "Please enter the number of days worked.";
    if (daysWorkedNum > totalDays) return `Days worked can't exceed ${totalDays} days in this month.`;
    return null;
  };

  const handlePreview = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE}/api/payslip/preview`, buildPayload(), {
        headers: authHeaders(),
      });
      if (res.data.success) setPreviewData(res.data.payslip);
    } catch (err) {
      setError(err.response?.data?.error || "Error generating preview");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerate = async (payloadOverride) => {
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/payslip/generate`,
        payloadOverride || buildPayload(),
        { headers: authHeaders() }
      );
      if (res.data.success) {
        alert("Payslip generated successfully!");
        navigate("/admin-dashboard/salary/payslip-history");
      }
    } catch (err) {
      alert(err.response?.data?.error || "Error generating payslip");
    } finally {
      setSubmitting(false);
    }
  };

  // Sending the email also saves the payslip (same payload as Generate),
  // so it shows up on the employee's own dashboard/Payslip History too —
  // not just in their inbox.
  const handleSendEmail = async (payloadOverride) => {
    const payload = payloadOverride || buildPayload();
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/api/payslip/generate`, payload, { headers: authHeaders() });
      await axios.post(
        `${API_BASE}/api/payslip/send-email`,
        { payslipData: payload },
        { headers: authHeaders() }
      );
      alert("Payslip generated and emailed to the employee!");
      setPreviewData(null);
      navigate("/admin-dashboard/salary/payslip-history");
    } catch (err) {
      alert(err.response?.data?.error || "Error sending payslip email");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-surface-muted">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-ink tracking-tight">
            Generate Payslip for Custom Days
          </h1>
          <p className="text-ink-muted mt-1 text-sm md:text-base">
            For an employee who only worked part of the month — Earnings, LOP Days/Amount, and
            Other Deductions all show their standard full-month figures. Only Net Pay is
            computed from the days actually worked.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-surface-subtle shadow-card p-6 space-y-5">
          {/* Employee search */}
          <div className="relative">
            <label className="block text-sm font-medium text-ink-muted mb-1.5">Employee</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={16} />
              <input
                type="text"
                value={employeeQuery}
                onChange={handleQueryChange}
                placeholder="Search by name or employee ID"
                className="w-full pl-9 pr-3 py-2.5 border border-surface-subtle rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            {suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-surface-subtle rounded-lg shadow-panel max-h-56 overflow-y-auto">
                {suggestions.map((emp) => (
                  <li key={emp.employeeId}>
                    <button
                      type="button"
                      onClick={() => selectEmployee(emp)}
                      className="w-full text-left px-3.5 py-2 text-sm hover:bg-surface-muted"
                    >
                      <span className="font-medium text-ink">{emp.name}</span>{" "}
                      <span className="text-ink-faint">({emp.employeeId})</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {loadingEmployee && <p className="text-xs text-ink-faint mt-1.5">Loading employee details…</p>}
            {employee && !loadingEmployee && (
              <p className="text-xs text-accent-700 mt-1.5">
                {employee.designation} · {employee.department}
              </p>
            )}
          </div>

          {/* Month / Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-1.5">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-surface-subtle rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-1.5">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-surface-subtle rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          {/* Days worked */}
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1.5 flex items-center gap-2">
              <FiCalendar size={14} /> Days Worked
              <span className="text-ink-faint font-normal">(out of {totalDays} days this month)</span>
            </label>
            <input
              type="number"
              min={0}
              max={totalDays}
              value={daysWorked}
              onChange={handleDaysWorkedChange}
              placeholder={`e.g. ${Math.max(totalDays - 5, 0)}`}
              className="w-full px-3 py-2.5 border border-surface-subtle rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            {daysWorkedNum != null && shortfallDays > 0 && (
              <p className="text-xs text-ink-muted mt-1.5">
                {shortfallDays} day{shortfallDays === 1 ? "" : "s"} not worked will reduce Net Pay
                only. Earnings, LOP Days/Amount, and Other Deductions all stay at their standard
                full-month figures.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={submitting || !employee}
              className="flex-1 px-4 py-2.5 rounded-lg border border-surface-subtle text-ink font-semibold hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Working…" : "Preview Payslip"}
            </button>
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={submitting || !employee}
              className="flex-1 px-4 py-2.5 rounded-lg bg-accent-600 hover:bg-accent-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Working…" : "Generate Payslip"}
            </button>
          </div>
        </div>
      </div>

      {/* Rebuild fresh from the form rather than resending the server's
          preview response to onGenerate/onSendEmail — that response's
          "month" field is already a name string (e.g. "August"), while
          /generate expects a numeric month + separate monthName, so
          passing it straight back through was silently defaulting the
          saved record to January. */}
      {previewData && (
        <PayslipPreview
          payslip={previewData}
          loading={submitting}
          onClose={() => setPreviewData(null)}
          onGenerate={() => handleGenerate()}
          onSendEmail={() => handleSendEmail()}
        />
      )}
    </div>
  );
};

export default GeneratePayslipByDays;
