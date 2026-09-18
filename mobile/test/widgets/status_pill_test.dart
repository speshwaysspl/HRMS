import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:speshway/theme/app_theme.dart';
import 'package:speshway/widgets/status_pill.dart';

void main() {
  Widget wrap(Widget child) => MaterialApp(theme: AppTheme.light, home: Scaffold(body: Center(child: child)));

  testWidgets('renders the given label', (tester) async {
    await tester.pumpWidget(wrap(const StatusPill(label: 'Approved')));
    expect(find.text('Approved'), findsOneWidget);
  });

  testWidgets('uses the accent (green) palette for a positive status', (tester) async {
    await tester.pumpWidget(wrap(const StatusPill(label: 'Approved')));
    final container = tester.widget<Container>(find.byType(Container));
    final decoration = container.decoration as BoxDecoration;
    expect(decoration.color, AppColors.accent100);
  });

  testWidgets('uses the danger (red) palette for a rejected status', (tester) async {
    await tester.pumpWidget(wrap(const StatusPill(label: 'Rejected')));
    final container = tester.widget<Container>(find.byType(Container));
    final decoration = container.decoration as BoxDecoration;
    expect(decoration.color, const Color(0xFFFEE2E2));
  });

  testWidgets('status text is matched case-insensitively', (tester) async {
    await tester.pumpWidget(wrap(const StatusPill(label: 'PENDING')));
    final container = tester.widget<Container>(find.byType(Container));
    final decoration = container.decoration as BoxDecoration;
    expect(decoration.color, const Color(0xFFFEF3C7));
  });
}
