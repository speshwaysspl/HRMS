import 'dart:io';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'api_client.dart';

class TeamService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> getTeams() async {
    final res = await _dio.get('/api/team/');
    final list = (res.data as Map)['teams'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<Map<String, dynamic>> getTeamDetail(String id) async {
    final res = await _dio.get('/api/team/$id');
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// Admin: users with the team_lead role, for the "assign lead" picker.
  Future<List<Map<String, dynamic>>> getLeads() async {
    final res = await _dio.get('/api/team/leads');
    final list = (res.data as Map)['leads'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<void> createTeam({
    required String name,
    required String leadId,
    String description = '',
    String? startDate,
  }) async {
    await _dio.post('/api/team/add', data: {
      'name': name,
      'leadId': leadId,
      'description': description,
      'startDate': ?startDate,
    });
  }

  /// [employeeIds] are Employee document ids.
  Future<void> addMembers(String teamId, List<String> employeeIds) async {
    await _dio.post('/api/team/members', data: {
      'teamId': teamId,
      'employeeIds': employeeIds,
    });
  }

  Future<void> deleteTeam(String id) async {
    await _dio.delete('/api/team/$id');
  }

  /// Team lead's manual roll-call for [date] (YYYY-MM-DD). Separate from punch-in attendance.
  Future<({bool marked, Set<String> present})> getTeamAttendance(String teamId, String date) async {
    final res = await _dio.get('/api/team/$teamId/attendance', queryParameters: {'date': date});
    final data = res.data as Map;
    return (
      marked: data['marked'] == true,
      present: ((data['present'] as List?) ?? []).map((e) => e.toString()).toSet(),
    );
  }

  /// [present] are Employee document ids; every other member is saved as absent.
  Future<void> saveTeamAttendance(String teamId, String date, Iterable<String> present) async {
    await _dio.put('/api/team/$teamId/attendance', data: {'date': date, 'present': present.toList()});
  }

  /// Monthly register for every team the caller can see (admin: all, lead: own).
  Future<File> exportAllTeamsAttendance(String month) async {
    final res = await _dio.get<List<int>>(
      '/api/team/attendance/export',
      queryParameters: {'month': month},
      options: Options(responseType: ResponseType.bytes),
    );
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/all_teams_attendance_$month.xlsx');
    await file.writeAsBytes(res.data!);
    return file;
  }

  /// Monthly register for [month] (YYYY-MM) as an .xlsx file.
  Future<File> exportTeamAttendance(String teamId, String teamName, String month) async {
    final res = await _dio.get<List<int>>(
      '/api/team/$teamId/attendance/export',
      queryParameters: {'month': month},
      options: Options(responseType: ResponseType.bytes),
    );
    final dir = await getTemporaryDirectory();
    final safe = teamName.replaceAll(RegExp(r'[^\w-]+'), '_');
    final file = File('${dir.path}/${safe}_attendance_$month.xlsx');
    await file.writeAsBytes(res.data!);
    return file;
  }
}

class RegularizationService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> getPending() async {
    final res = await _dio.get('/api/attendance-regularization/pending');
    final list = (res.data as Map)['regularizations'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<List<Map<String, dynamic>>> getMine() async {
    final res = await _dio.get('/api/attendance-regularization/mine');
    final list = (res.data as Map)['regularizations'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<void> apply({
    required String date,
    required String requestedInTime,
    required String requestedOutTime,
    required String reason,
  }) async {
    await _dio.post('/api/attendance-regularization/', data: {
      'date': date,
      'requestedInTime': requestedInTime,
      'requestedOutTime': requestedOutTime,
      'reason': reason,
    });
  }

  Future<void> decide(String id, String status) async {
    await _dio.put('/api/attendance-regularization/$id', data: {'status': status});
  }
}

class ReviewService {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Map<String, dynamic>>> getTeamReviews() async {
    final res = await _dio.get('/api/reviews/team');
    final list = (res.data as Map)['reviews'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<List<Map<String, dynamic>>> getMyReviews() async {
    final res = await _dio.get('/api/reviews/mine');
    final list = (res.data as Map)['reviews'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Admin/HR: every performance review across the org.
  Future<List<Map<String, dynamic>>> getAllReviews() async {
    final res = await _dio.get('/api/reviews/all');
    final list = (res.data as Map)['reviews'] as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
}
