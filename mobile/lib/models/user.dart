class AppUser {
  final String id;
  final String name;
  final String email;
  final List<String> roles;

  AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.roles,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    final rawRole = json['role'];
    final roles = rawRole is List
        ? rawRole.map((r) => r.toString()).toList()
        : (rawRole != null ? [rawRole.toString()] : <String>[]);
    return AppUser(
      id: json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      roles: roles,
    );
  }

  bool get isAdmin => roles.contains('admin');
  bool get isHr => roles.contains('hr');
  bool get isTeamLead => roles.contains('team_lead');
  bool get isCandidate => roles.contains('candidate');
  bool get isEmployee => roles.contains('employee');

  /// Same priority order used by the web app's roleRoutes.js:
  /// admin > hr > candidate > employee/team_lead.
  String get primaryRole {
    if (isAdmin) return 'admin';
    if (isHr) return 'hr';
    if (isCandidate) return 'candidate';
    return 'employee';
  }
}
