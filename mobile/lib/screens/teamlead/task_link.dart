import 'package:flutter/material.dart';

import '../../services/api_client.dart';
import '../../services/task_service.dart';
import '../admin/admin_team_detail_screen.dart';
import '../employee/tasks_screen.dart';
import 'team_detail_screen.dart';

/// Opens the task an employee submitted (task_submitted notification, list or
/// push): the lead lands on that team with the task's review sheet open, an
/// admin on the team view, and the assignee on My Tasks.
Future<void> openSubmittedTask(
  NavigatorState nav,
  String taskId, {
  ScaffoldMessengerState? messenger,
}) async {
  try {
    final loc = await TaskService().locate(taskId);
    final teamId = loc['teamId'].toString();
    final teamName = (loc['teamName'] ?? 'Team').toString();
    final Widget target = loc['isLead'] == true
        ? TeamDetailScreen(id: teamId, name: teamName, openTaskId: taskId)
        : loc['isAdmin'] == true
        ? AdminTeamDetailScreen(id: teamId, name: teamName)
        : const TasksScreen();
    nav.push(MaterialPageRoute(builder: (_) => target));
  } catch (e) {
    messenger?.showSnackBar(SnackBar(content: Text(extractErrorMessage(e))));
  }
}
