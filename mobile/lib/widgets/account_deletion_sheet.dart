import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';
import 'state_views.dart';

/// Bottom sheet where an employee asks HR/Admin to delete their account.
/// Opened from Settings.
void showAccountDeletionSheet(BuildContext context) {
  final reasonCtrl = TextEditingController();
  bool busy = false;
  bool submitted = false;
  String successMessage = 'Account deletion request submitted to HR/Admin.';

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetCtx) => StatefulBuilder(
      builder: (ctx, setSheetState) {
        if (submitted) {
          return Container(
            padding: EdgeInsets.fromLTRB(
              context.w(20),
              context.h(24),
              context.w(20),
              context.h(24),
            ),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.vertical(
                top: Radius.circular(AppRadius.panel),
              ),
            ),
            child: SizedBox(
              height: context.h(360),
              child: SuccessView(
                title: 'Request submitted',
                subtitle: successMessage,
                action: ElevatedButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Done'),
                ),
              ),
            ),
          );
        }
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
          ),
          child: Container(
            padding: EdgeInsets.all(context.w(20)),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.vertical(
                top: Radius.circular(AppRadius.panel),
              ),
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.tint(const Color(0xFFFEE2E2)),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.delete_outline,
                          color: AppColors.danger,
                          size: 20,
                        ),
                      ),
                      SizedBox(width: context.w(10)),
                      Expanded(
                        child: Text(
                          'Request Account Deletion',
                          style: TextStyle(
                            fontSize: context.sp(16),
                            fontWeight: FontWeight.w700,
                            color: AppColors.ink,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, size: 20),
                        onPressed: () => Navigator.of(ctx).pop(),
                      ),
                    ],
                  ),
                  SizedBox(height: context.h(14)),
                  Container(
                    padding: EdgeInsets.all(context.w(12)),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceMuted,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Deletion Workflow:',
                          style: TextStyle(
                            fontSize: context.sp(12),
                            fontWeight: FontWeight.w700,
                            color: AppColors.ink,
                          ),
                        ),
                        SizedBox(height: context.h(6)),
                        _deletionStepRow(
                          context,
                          '1',
                          'Employee submits deletion request',
                        ),
                        _deletionStepRow(
                          context,
                          '2',
                          'HR/Admin receives the request notification',
                        ),
                        _deletionStepRow(
                          context,
                          '3',
                          'HR/Admin verifies identity & eligibility',
                        ),
                        _deletionStepRow(
                          context,
                          '4',
                          'Account + eligible personal data deleted',
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: context.h(14)),
                  Text(
                    'Reason for Deletion (Optional)',
                    style: TextStyle(
                      fontSize: context.sp(12),
                      fontWeight: FontWeight.w600,
                      color: AppColors.ink,
                    ),
                  ),
                  SizedBox(height: context.h(6)),
                  TextField(
                    controller: reasonCtrl,
                    maxLines: 2,
                    decoration: InputDecoration(
                      hintText:
                          'e.g. Resigned from company, requesting data removal...',
                      hintStyle: TextStyle(
                        fontSize: context.sp(12),
                        color: AppColors.inkFaint,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      contentPadding: EdgeInsets.all(context.w(10)),
                    ),
                  ),
                  SizedBox(height: context.h(18)),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.danger,
                      foregroundColor: Colors.white,
                      padding: EdgeInsets.symmetric(vertical: context.h(12)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    onPressed: busy
                        ? null
                        : () async {
                            setSheetState(() => busy = true);
                            try {
                              final res = await ApiClient.instance.dio.post(
                                '/api/account/deletion-request',
                                data: {'reason': reasonCtrl.text.trim()},
                                options: Options(
                                  headers: {'x-client': 'mobile'},
                                ),
                              );
                              if (!ctx.mounted) return;
                              final msg =
                                  res.data?['message']?.toString() ??
                                  'Account deletion request submitted to HR/Admin.';
                              setSheetState(() {
                                busy = false;
                                submitted = true;
                                successMessage = msg;
                              });
                            } catch (e) {
                              setSheetState(() => busy = false);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(extractErrorMessage(e)),
                                  backgroundColor: AppColors.danger,
                                ),
                              );
                            }
                          },
                    child: busy
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Submit Deletion Request',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    ),
  );
}

Widget _deletionStepRow(BuildContext context, String num, String text) {
  return Padding(
    padding: EdgeInsets.only(bottom: context.h(4)),
    child: Row(
      children: [
        CircleAvatar(
          radius: 8,
          backgroundColor: AppColors.brand500,
          child: Text(
            num,
            style: const TextStyle(
              fontSize: 10,
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        SizedBox(width: context.w(8)),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: context.sp(11),
              color: AppColors.inkMuted,
            ),
          ),
        ),
      ],
    ),
  );
}
