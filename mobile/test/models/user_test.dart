import 'package:flutter_test/flutter_test.dart';
import 'package:speshway/models/user.dart';

void main() {
  group('AppUser.fromJson', () {
    test('parses a single-role user', () {
      final user = AppUser.fromJson({
        '_id': 'u1',
        'name': 'Charan',
        'email': 'charan@speshway.com',
        'role': 'employee',
      });

      expect(user.id, 'u1');
      expect(user.name, 'Charan');
      expect(user.email, 'charan@speshway.com');
      expect(user.roles, ['employee']);
      expect(user.isEmployee, isTrue);
      expect(user.isAdmin, isFalse);
      expect(user.primaryRole, 'employee');
    });

    test('parses a multi-role user (employee + team_lead)', () {
      final user = AppUser.fromJson({
        '_id': 'u2',
        'name': 'Lead',
        'email': 'lead@speshway.com',
        'role': ['employee', 'team_lead'],
      });

      expect(user.isTeamLead, isTrue);
      expect(user.isEmployee, isTrue);
      // admin > hr > candidate > employee/team_lead priority order.
      expect(user.primaryRole, 'employee');
    });

    test('admin role takes priority over other roles', () {
      final user = AppUser.fromJson({
        '_id': 'u3',
        'name': 'Admin',
        'email': 'admin@speshway.com',
        'role': ['employee', 'admin'],
      });

      expect(user.primaryRole, 'admin');
    });

    test('missing fields fall back to safe defaults', () {
      final user = AppUser.fromJson(const {});

      expect(user.id, '');
      expect(user.name, '');
      expect(user.email, '');
      expect(user.roles, isEmpty);
      expect(user.primaryRole, 'employee');
    });
  });
}
