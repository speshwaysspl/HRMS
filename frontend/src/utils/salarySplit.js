// Salary structure (from the company's reference table, 2026-11-11). Keep in
// sync with server/utils/salarySplit.js.
//
//   Basic       50% of gross
//   DA          25% of Basic
//   HRA         40% of Basic
//   Conveyance  ₹1,600 fixed
//   Medical     ₹1,250 fixed
//   Special     whatever is left, so the total equals gross
//   PF          entered manually (never auto-calculated)
//
// e.g. ₹30,000 → 15,000 / 3,750 / 6,000 / 1,600 / 1,250 / 2,400.
// Below about ₹16,300 the parts exceed gross: Special becomes 0 and the
// shortfall is taken from HRA, then DA (then medical, conveyance), so the
// total always equals gross and Basic stays 50%.
export const SALARY_STRUCTURE = {
  basicOfGross: 0.5,
  daOfBasic: 0.25,
  hraOfBasic: 0.4,
  conveyance: 1600,
  medical: 1250,
};

const r2 = (n) => Math.round(n * 100) / 100;

/** Split a monthly gross into payslip components (numbers, 2 decimals). */
export const splitGross = (grossInput) => {
  const gross = Math.max(0, Number(grossInput) || 0);
  const S = SALARY_STRUCTURE;
  const basicSalary = r2(gross * S.basicOfGross);
  let da = r2(basicSalary * S.daOfBasic);
  let hra = r2(basicSalary * S.hraOfBasic);
  let conveyance = S.conveyance;
  let medicalallowances = S.medical;
  let specialallowances = r2(gross - basicSalary - da - hra - conveyance - medicalallowances);

  if (specialallowances < 0) {
    let short = -specialallowances;
    specialallowances = 0;
    const take = (v) => { const t = Math.min(v, short); short = r2(short - t); return r2(v - t); };
    hra = take(hra);
    da = take(da);
    medicalallowances = take(medicalallowances);
    conveyance = take(conveyance);
  }
  return { basicSalary, da, hra, conveyance, medicalallowances, specialallowances };
};

// Back-compat for code that still imports SALARY_SPLIT (conveyance/medical only).
export const SALARY_SPLIT = { conveyance: SALARY_STRUCTURE.conveyance, medical: SALARY_STRUCTURE.medical };
