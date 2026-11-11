// One-time: move existing payroll templates to the company salary structure
// (utils/salarySplit.js: Basic 50% of gross, DA 25% of Basic, HRA 40% of Basic,
// Conveyance 1,600, Medical 1,250, Special = rest).
//
//   node --env-file=.env scripts/recalcTemplateSplit.js            # preview only, changes nothing
//   node --env-file=.env scripts/recalcTemplateSplit.js --apply    # update (writes a backup first)
//   node --env-file=.env scripts/recalcTemplateSplit.js --restore backups/<file>.json   # undo
//
// Per active template: gross (total earnings) stays exactly the same and is
// re-split; PF, professional tax and other deductions are NOT touched (PF is
// entered manually). Templates already on the structure are skipped.
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import PayrollTemplate from "../models/PayrollTemplate.js";
import { splitGross } from "../utils/salarySplit.js";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const restoreIdx = args.indexOf("--restore");
const EARNINGS = ["basicSalary", "da", "hra", "conveyance", "medicalallowances", "specialallowances"];
const r2 = (n) => Math.round(n * 100) / 100;
const money = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const plan = (t) => {
  const gross = r2(EARNINGS.reduce((s, k) => s + (t[k] || 0), 0));
  if (gross <= 0) return { skip: "no salary" };
  const next = splitGross(gross);
  const same = EARNINGS.every((k) => Math.abs((t[k] || 0) - next[k]) < 1);
  if (same) return { skip: "already on the new structure" };
  return { gross, next };
};

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URL, { serverSelectionTimeoutMS: 10000 });

  if (restoreIdx !== -1) {
    const file = args[restoreIdx + 1];
    const backup = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const row of backup) await PayrollTemplate.updateOne({ _id: row._id }, { $set: row.before });
    console.log(`Restored ${backup.length} templates from ${file}`);
    return;
  }

  const templates = await PayrollTemplate.find({ isActive: true }).lean();
  const changes = [];
  const skipped = {};
  for (const t of templates) {
    const p = plan(t);
    if (p.skip) { skipped[p.skip] = (skipped[p.skip] || 0) + 1; continue; }
    changes.push({
      _id: String(t._id),
      name: t.name || t.templateName,
      gross: p.gross,
      before: Object.fromEntries(EARNINGS.map((k) => [k, t[k] || 0])),
      after: p.next,
    });
  }

  console.log(`Active templates: ${templates.length}   to update: ${changes.length}`);
  for (const [why, n] of Object.entries(skipped)) console.log(`  skipped ${n}: ${why}`);
  console.log("PF, professional tax and other deductions are left as they are.\n");
  console.log("Name".padEnd(28), "Gross".padStart(9), "Basic".padStart(20), "DA".padStart(18), "HRA".padStart(18), "Special".padStart(20));
  const cell = (c, k) => `${money(c.before[k])}->${money(c.after[k])}`;
  for (const c of changes.slice(0, 25)) {
    console.log(
      String(c.name).slice(0, 27).padEnd(28), money(c.gross).padStart(9),
      cell(c, "basicSalary").padStart(20), cell(c, "da").padStart(18), cell(c, "hra").padStart(18), cell(c, "specialallowances").padStart(20),
    );
  }
  if (changes.length > 25) console.log(`  … and ${changes.length - 25} more`);
  const lowPay = changes.filter((c) => c.after.specialallowances === 0).length;
  if (lowPay) console.log(`\n${lowPay} template(s) below ~₹16,300 gross: Special 0, HRA/DA reduced so the total still equals gross.`);

  if (!APPLY) {
    console.log("\nPreview only — nothing was changed. Re-run with --apply to update.");
    return;
  }

  const dir = path.resolve("backups");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `payroll-templates-before-split-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(changes.map(({ _id, before }) => ({ _id, before })), null, 2));
  console.log(`\nBackup written: ${file}`);
  const res = changes.length
    ? await PayrollTemplate.bulkWrite(changes.map((c) => ({ updateOne: { filter: { _id: c._id }, update: { $set: c.after } } })))
    : { modifiedCount: 0 };
  console.log(`Updated ${res.modifiedCount} templates. Undo with: node --env-file=.env scripts/recalcTemplateSplit.js --restore "${file}"`);
};

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
