import 'package:flutter_test/flutter_test.dart';
import 'package:speshway/utils/salary_split.dart';

void main() {
  test('₹30,000 matches the company reference table', () {
    final s = splitGross(30000);
    expect(s['basicSalary'], 15000);
    expect(s['da'], 3750);
    expect(s['hra'], 6000);
    expect(s['conveyance'], 1600);
    expect(s['medicalallowances'], 1250);
    expect(s['specialallowances'], 2400);
  });

  test('low salaries still add up to gross (Special 0, HRA reduced)', () {
    final s = splitGross(15000);
    expect(s['basicSalary'], 7500);
    expect(s['specialallowances'], 0);
    expect(s['hra'], 2775);
    expect(s.values.reduce((a, b) => a + b), 15000);
  });

  test('totals always equal gross', () {
    for (final g in [18000.0, 25000.0, 66667.0, 100000.0]) {
      final total = splitGross(g).values.reduce((a, b) => a + b);
      expect((total - g).abs() < 0.01, isTrue, reason: 'gross $g');
    }
  });
}
