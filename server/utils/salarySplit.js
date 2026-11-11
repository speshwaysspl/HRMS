// How a gross monthly salary is split into payslip components. Keep in sync
// with frontend/src/utils/salarySplit.js.
//   remaining = gross - (conveyance + medical)
//   basic/da/hra/special are shares of `remaining` and must add up to 1.
// 2026-11-11: Basic raised from 40% to 50%; Special Allowance cut from 18% to 8%.
export const SALARY_SPLIT = {
  basic: 0.50,
  da: 0.22,
  hra: 0.20,
  special: 0.08,
  conveyance: 1600,
  medical: 1250,
};
