/// Company salary structure — same as server/utils/salarySplit.js and
/// frontend/src/utils/salarySplit.js (keep all three in sync).
///
///   Basic       50% of gross
///   DA          25% of Basic
///   HRA         40% of Basic
///   Conveyance  ₹1,600 fixed
///   Medical     ₹1,250 fixed
///   Special     whatever is left, so the total equals gross
///   PF          entered manually (never auto-calculated)
///
/// e.g. ₹30,000 → 15,000 / 3,750 / 6,000 / 1,600 / 1,250 / 2,400.
/// Below about ₹16,300 the parts exceed gross: Special becomes 0 and the
/// shortfall comes out of HRA, then DA (then medical, conveyance).
library;

const double kBasicOfGross = 0.5;
const double kDaOfBasic = 0.25;
const double kHraOfBasic = 0.4;
const double kConveyance = 1600;
const double kMedical = 1250;

double _r2(double n) => (n * 100).roundToDouble() / 100;

/// Keys match the payslip/template fields used by the API.
Map<String, double> splitGross(double grossInput) {
  final gross = grossInput < 0 ? 0.0 : grossInput;
  final basic = _r2(gross * kBasicOfGross);
  var da = _r2(basic * kDaOfBasic);
  var hra = _r2(basic * kHraOfBasic);
  var conveyance = kConveyance;
  var medical = kMedical;
  var special = _r2(gross - basic - da - hra - conveyance - medical);

  if (special < 0) {
    var short = -special;
    special = 0;
    double take(double v) {
      final t = v < short ? v : short;
      short = _r2(short - t);
      return _r2(v - t);
    }

    hra = take(hra);
    da = take(da);
    medical = take(medical);
    conveyance = take(conveyance);
  }
  return {
    'basicSalary': basic,
    'da': da,
    'hra': hra,
    'conveyance': conveyance,
    'medicalallowances': medical,
    'specialallowances': special,
  };
}
