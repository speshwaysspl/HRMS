import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_client.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';

/// Forgot password with an emailed 6-digit OTP:
/// 1) email → 2) code → 3) new password → done.
/// Mirrors frontend/src/pages/ForgotPassword.jsx.
/// Backend: POST /api/auth/forgot-password/otp, /forgot-password/verify-otp,
/// then the existing /reset-password/:token.
class ForgotPasswordScreen extends StatefulWidget {
  final String initialEmail;
  const ForgotPasswordScreen({super.key, this.initialEmail = ''});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

enum _Step { email, otp, password, done }

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final Dio _dio = ApiClient.instance.dio;
  late final TextEditingController _email = TextEditingController(text: widget.initialEmail);
  final _otp = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _otpFocus = FocusNode();

  _Step _step = _Step.email;
  bool _loading = false;
  bool _show = false;
  String? _error;
  String _resetToken = '';
  int _resendIn = 0;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    _email.dispose();
    _otp.dispose();
    _password.dispose();
    _confirm.dispose();
    _otpFocus.dispose();
    super.dispose();
  }

  String _msg(Object e, String fallback) {
    if (e is DioException) {
      final d = e.response?.data;
      if (d is Map && d['message'] != null) return d['message'].toString();
    }
    return extractErrorMessage(e).isNotEmpty ? extractErrorMessage(e) : fallback;
  }

  void _startTimer(int seconds) {
    _timer?.cancel();
    setState(() => _resendIn = seconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted || _resendIn <= 1) {
        t.cancel();
        if (mounted) setState(() => _resendIn = 0);
        return;
      }
      setState(() => _resendIn--);
    });
  }

  Future<void> _sendCode() async {
    final email = _email.text.trim();
    if (!RegExp(r'^\S+@\S+\.\S+$').hasMatch(email)) {
      setState(() => _error = 'Enter a valid email address.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _dio.post('/api/auth/forgot-password/otp', data: {'email': email});
      final wait = (res.data is Map ? res.data['resendIn'] : null) as num? ?? 60;
      _otp.clear();
      setState(() => _step = _Step.otp);
      _startTimer(wait.toInt());
      WidgetsBinding.instance.addPostFrameCallback((_) => _otpFocus.requestFocus());
    } catch (e) {
      setState(() => _error = _msg(e, "Couldn't send the code. Please try again."));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verify() async {
    if (_otp.text.length != 6) {
      setState(() => _error = 'Enter the 6-digit code.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _dio.post('/api/auth/forgot-password/verify-otp',
          data: {'email': _email.text.trim(), 'otp': _otp.text});
      _resetToken = (res.data as Map)['resetToken'].toString();
      setState(() => _step = _Step.password);
    } catch (e) {
      setState(() => _error = _msg(e, 'Invalid code.'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (_password.text.length < 6) {
      setState(() => _error = 'Password must be at least 6 characters.');
      return;
    }
    if (_password.text != _confirm.text) {
      setState(() => _error = "Passwords don't match.");
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await _dio.post('/api/auth/reset-password/$_resetToken', data: {'password': _password.text});
      setState(() => _step = _Step.done);
    } catch (e) {
      setState(() => _error = _msg(e, "Couldn't reset the password. Start again."));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _back() {
    setState(() => _error = null);
    switch (_step) {
      case _Step.otp:
        setState(() => _step = _Step.email);
      case _Step.password:
        setState(() => _step = _Step.otp);
      default:
        Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final (title, subtitle) = switch (_step) {
      _Step.email => ('Forgot password?', "Enter your registered email and we'll send you a 6-digit code."),
      _Step.otp => ('Check your email', 'Enter the 6-digit code sent to ${_email.text.trim()}.'),
      _Step.password => ('Create a new password', 'Choose a password with at least 6 characters.'),
      _Step.done => ('Password updated', 'You can now sign in with your new password.'),
    };
    final stepIndex = _step.index;

    return PopScope(
      canPop: _step == _Step.email || _step == _Step.done,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _back();
      },
      child: Scaffold(
        backgroundColor: AppColors.surface,
        appBar: AppBar(
          backgroundColor: AppColors.surface,
          foregroundColor: AppColors.ink,
          elevation: 0,
          leading: _step == _Step.done ? const SizedBox.shrink() : BackButton(onPressed: _back),
        ),
        body: SafeArea(
          child: ListView(
            padding: EdgeInsets.fromLTRB(context.w(24), context.h(8), context.w(24), context.h(24)),
            children: [
              if (_step != _Step.done)
                Row(
                  children: [
                    for (var i = 0; i < 3; i++) ...[
                      Expanded(
                        child: Container(
                          height: 5,
                          decoration: BoxDecoration(
                            color: i <= stepIndex ? AppColors.accent600 : AppColors.surfaceSubtle,
                            borderRadius: BorderRadius.circular(99),
                          ),
                        ),
                      ),
                      if (i < 2) const SizedBox(width: 6),
                    ],
                  ],
                )
              else
                Icon(Icons.check_circle_rounded, color: AppColors.accent600, size: context.r(64)),
              SizedBox(height: context.h(24)),
              Text(title,
                  textAlign: _step == _Step.done ? TextAlign.center : TextAlign.start,
                  style: TextStyle(fontSize: context.sp(24), fontWeight: FontWeight.w700, color: AppColors.ink)),
              SizedBox(height: context.h(6)),
              Text(subtitle,
                  textAlign: _step == _Step.done ? TextAlign.center : TextAlign.start,
                  style: TextStyle(fontSize: context.sp(14), color: AppColors.inkMuted, height: 1.4)),
              if (_error != null) ...[
                SizedBox(height: context.h(16)),
                Container(
                  padding: EdgeInsets.all(context.w(12)),
                  decoration: BoxDecoration(color: AppColors.dangerBg, borderRadius: BorderRadius.circular(10)),
                  child: Text(_error!, style: TextStyle(color: AppColors.danger, fontSize: context.sp(13.5))),
                ),
              ],
              SizedBox(height: context.h(24)),
              ..._body(context),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _body(BuildContext context) {
    Widget primary(String label, String busy, VoidCallback onTap) => SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: _loading ? null : onTap,
            child: _loading
                ? Row(mainAxisSize: MainAxisSize.min, children: [
                    const SizedBox(
                        width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                    const SizedBox(width: 10),
                    Text(busy),
                  ])
                : Text(label),
          ),
        );

    switch (_step) {
      case _Step.email:
        return [
          TextField(
            controller: _email,
            autofocus: _email.text.isEmpty,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            textInputAction: TextInputAction.send,
            onSubmitted: (_) => _sendCode(),
            decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline, size: 20)),
          ),
          SizedBox(height: context.h(20)),
          primary('Send code', 'Sending…', _sendCode),
        ];
      case _Step.otp:
        return [
          _OtpBoxes(controller: _otp, focusNode: _otpFocus, onCompleted: _verify),
          SizedBox(height: context.h(24)),
          primary('Verify code', 'Verifying…', _verify),
          SizedBox(height: context.h(12)),
          Center(
            child: _resendIn > 0
                ? Text('Resend code in ${_resendIn}s',
                    style: TextStyle(color: AppColors.inkMuted, fontSize: context.sp(13.5)))
                : TextButton(onPressed: _loading ? null : _sendCode, child: const Text('Resend code')),
          ),
        ];
      case _Step.password:
        return [
          TextField(
            controller: _password,
            obscureText: !_show,
            autofocus: true,
            autofillHints: const [AutofillHints.newPassword],
            decoration: InputDecoration(
              labelText: 'New password',
              prefixIcon: const Icon(Icons.lock_outline, size: 20),
              suffixIcon: IconButton(
                tooltip: _show ? 'Hide password' : 'Show password',
                icon: Icon(_show ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20),
                onPressed: () => setState(() => _show = !_show),
              ),
            ),
          ),
          SizedBox(height: context.h(14)),
          TextField(
            controller: _confirm,
            obscureText: !_show,
            onSubmitted: (_) => _save(),
            decoration: const InputDecoration(labelText: 'Confirm password', prefixIcon: Icon(Icons.lock_outline, size: 20)),
          ),
          SizedBox(height: context.h(20)),
          primary('Update password', 'Saving…', _save),
        ];
      case _Step.done:
        return [
          primary('Back to sign in', '', () => Navigator.of(context).pop()),
        ];
    }
  }
}

/// Six digit boxes over one hidden field (so paste and SMS/email autofill
/// work). Calls [onCompleted] once all 6 digits are entered.
class _OtpBoxes extends StatefulWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final VoidCallback onCompleted;
  const _OtpBoxes({required this.controller, required this.focusNode, required this.onCompleted});

  @override
  State<_OtpBoxes> createState() => _OtpBoxesState();
}

class _OtpBoxesState extends State<_OtpBoxes> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_changed);
    widget.focusNode.addListener(_changed);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_changed);
    widget.focusNode.removeListener(_changed);
    super.dispose();
  }

  void _changed() => setState(() {});

  @override
  Widget build(BuildContext context) {
    final text = widget.controller.text;
    return Semantics(
      label: '6-digit code',
      textField: true,
      child: GestureDetector(
        onTap: () => widget.focusNode.requestFocus(),
        child: Stack(
          children: [
            // Invisible real input
            Opacity(
              opacity: 0,
              child: TextField(
                controller: widget.controller,
                focusNode: widget.focusNode,
                keyboardType: TextInputType.number,
                autofillHints: const [AutofillHints.oneTimeCode],
                maxLength: 6,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                onChanged: (v) {
                  if (v.length == 6) widget.onCompleted();
                },
                decoration: const InputDecoration(counterText: ''),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                for (var i = 0; i < 6; i++)
                  Container(
                    width: context.w(46),
                    height: context.h(56),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceMuted,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: widget.focusNode.hasFocus && i == text.length.clamp(0, 5)
                            ? AppColors.accent600
                            : AppColors.surfaceSubtle,
                        width: 1.6,
                      ),
                    ),
                    child: Text(
                      i < text.length ? text[i] : '',
                      style: TextStyle(fontSize: context.sp(22), fontWeight: FontWeight.w700, color: AppColors.ink),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
