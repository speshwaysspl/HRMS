import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../services/api_client.dart';
import '../services/app_settings.dart';
import '../services/auth_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/state_views.dart';
import 'forgot_password_screen.dart';
import 'shell/app_shell.dart';

/// Login + splash palette (nutri_hrms auth layout in Speshway colours).
/// Web mirror: frontend/src/pages/Login.jsx.
class AuthPalette {
  static const ink = Color(0xFF0E1122); // brand950
  static const storyMuted = Color(0xFFB0BBDF); // brand200
  static const accentLight = Color(0xFF84C088); // accent300
  static const glow = Color(0x735C6FAB); // brand400 @ 45%

  static const headerGlow = BoxDecoration(
    gradient: RadialGradient(
      center: Alignment(0.9, -0.9),
      radius: 1.2,
      colors: [glow, Color(0x000E1122)],
    ),
  );
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _loading = false;
  bool _slow = false;
  Timer? _slowTimer;
  bool _networkError = false;

  @override
  void dispose() {
    _slowTimer?.cancel();
    _emailController.dispose();
    _passwordController.dispose();
    // Login is always light; restore the user's chosen mode for the app.
    final mode = AppSettings.themeMode.value;
    AppColors.isDark =
        mode == ThemeMode.dark ||
        (mode == ThemeMode.system &&
            WidgetsBinding.instance.platformDispatcher.platformBrightness ==
                Brightness.dark);
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _slow = false;
      _networkError = false;
    });
    // After 3 s, say it is still working (slow networks) — same as web.
    _slowTimer?.cancel();
    _slowTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) setState(() => _slow = true);
    });
    final auth = context.read<AuthProvider>();
    final ok = await auth.login(
      _emailController.text.trim(),
      _passwordController.text,
    );
    _slowTimer?.cancel();
    if (!mounted) return;
    if (ok) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const AppShell()),
        (route) => false,
      );
      return;
    }
    final rawError = auth.lastErrorRaw;
    final isNetwork = rawError != null && isNetworkError(rawError);
    setState(() {
      _loading = false;
      _slow = false;
      _networkError = isNetwork;
    });
    if (!isNetwork) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(auth.lastError ?? 'Login failed')));
    }
  }

  @override
  Widget build(BuildContext context) {
    AppColors.isDark = false;
    return Theme(
      data: AppTheme.light,
      child: Scaffold(
        backgroundColor: AuthPalette.ink,
        // Dark header grows to fill; the form sheet is pinned to the bottom
        // (thumb reach). The whole page scrolls when the keyboard opens, so
        // nothing overflows on short screens.
        body: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: IntrinsicHeight(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Expanded(child: _AuthHeader()),
                    // Equal halves: the sheet takes at least half the screen,
                    // the header fills the rest (grows only if the form is taller).
                    ConstrainedBox(
                      constraints: BoxConstraints(minHeight: constraints.maxHeight / 2),
                      child: _buildSheet(context),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSheet(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.fromLTRB(
        16,
        28,
        16,
        20 + MediaQuery.paddingOf(context).bottom,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 440),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_networkError) ...[
                SizedBox(height: 240, child: NetworkErrorView(onRetry: _submit)),
                const SizedBox(height: 8),
              ],
              // Kept mounted (Offstage, not removed) so _formKey stays valid
              // for the Retry resubmit above.
              Offstage(offstage: _networkError, child: _buildForm()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Sign in to your workspace',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.5,
              color: AppColors.ink,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Use your Speshway Solutions work email — one login for employees and HR.',
            style: TextStyle(color: AppColors.inkMuted, fontSize: 14, height: 1.45),
          ),
          const SizedBox(height: 22),
          _label('Email address'),
          TextFormField(
            controller: _emailController,
            enabled: !_loading,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            autocorrect: false,
            autofillHints: const [AutofillHints.username, AutofillHints.email],
            decoration: _fieldDecoration(
              hint: 'you@speshway.com',
              icon: Icons.mail_outline_rounded,
            ),
            validator: (v) {
              if (v == null || v.trim().isEmpty) {
                return 'Please enter your email';
              }
              if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v.trim())) {
                return 'Please enter a valid email address';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          _label('Password'),
          TextFormField(
            controller: _passwordController,
            enabled: !_loading,
            obscureText: _obscurePassword,
            textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.password],
            decoration: _fieldDecoration(
              hint: 'Enter your password',
              icon: Icons.lock_outline_rounded,
              suffix: IconButton(
                tooltip: _obscurePassword ? 'Show password' : 'Hide password',
                icon: Icon(
                  _obscurePassword
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                  size: 20,
                ),
                onPressed: () =>
                    setState(() => _obscurePassword = !_obscurePassword),
              ),
            ),
            validator: (v) =>
                (v == null || v.isEmpty) ? 'Please enter your password' : null,
            onFieldSubmitted: (_) => _submit(),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => ForgotPasswordScreen(
                    initialEmail: _emailController.text.trim(),
                  ),
                ),
              ),
              child: const Text(
                'Forgot password?',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ),
          const SizedBox(height: 4),
          SizedBox(
            height: 54,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.accent600,
                disabledBackgroundColor: AppColors.accent600.withValues(alpha: 0.7),
                foregroundColor: Colors.white,
                disabledForegroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              onPressed: _loading ? null : _submit,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: _loading
                    ? const [
                        SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        ),
                        SizedBox(width: 10),
                        Text('Signing you in…'),
                      ]
                    : const [
                        Text('Continue'),
                        SizedBox(width: 8),
                        Icon(Icons.arrow_forward_rounded, size: 18),
                      ],
              ),
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 200),
            child: _loading && _slow
                ? Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: Text(
                      'Still working — this can take a few seconds on a slow connection.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.inkMuted, fontSize: 12.5),
                    ),
                  )
                : const SizedBox(width: double.infinity),
          ),
        ],
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          text,
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.ink),
        ),
      );

  InputDecoration _fieldDecoration({required String hint, required IconData icon, Widget? suffix}) {
    OutlineInputBorder border(Color c, [double w = 1]) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: c, width: w),
        );
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: AppColors.surfaceMuted,
      prefixIcon: Icon(icon, size: 20),
      suffixIcon: suffix,
      contentPadding: const EdgeInsets.symmetric(vertical: 16),
      border: border(AppColors.surfaceSubtle),
      enabledBorder: border(AppColors.surfaceSubtle),
      focusedBorder: border(AppColors.accent500, 1.5),
      errorBorder: border(AppColors.danger),
      focusedErrorBorder: border(AppColors.danger, 1.5),
    );
  }
}

/// Dark header: brand, live clock, greeting and the Leave / Payslips chips.
class _AuthHeader extends StatelessWidget {
  const _AuthHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: AuthPalette.headerGlow,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(children: [
                Container(
                  width: 44,
                  height: 44,
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Image.asset('assets/logo.png', fit: BoxFit.contain),
                ),
                const SizedBox(width: 10),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Speshway Solutions',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                    Text(
                      'HRMS Application',
                      style: TextStyle(color: AuthPalette.storyMuted, fontSize: 13, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ]),
              const Spacer(),
              const SizedBox(height: 24),
              const _LiveGreeting(),
              const SizedBox(height: 24),
              const ExcludeSemantics(
                child: Row(children: [
                  Expanded(child: _Chip(icon: Icons.calendar_month_outlined, title: 'Leave', subtitle: 'Apply in seconds')),
                  SizedBox(width: 10),
                  Expanded(child: _Chip(icon: Icons.description_outlined, title: 'Payslips', subtitle: 'Every month')),
                ]),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LiveGreeting extends StatefulWidget {
  const _LiveGreeting();

  @override
  State<_LiveGreeting> createState() => _LiveGreetingState();
}

class _LiveGreetingState extends State<_LiveGreeting> {
  DateTime _now = DateTime.now();
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => setState(() => _now = DateTime.now()));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String get _greeting {
    final h = _now.hour;
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final clock = DateFormat('h:mm').format(_now);
    final meridiem = DateFormat('a').format(_now).toUpperCase();
    final date = DateFormat('EEEE, d MMMM').format(_now);
    return Semantics(
      label: '$_greeting. It is $clock $meridiem, $date.',
      excludeSemantics: true,
      child: Column(children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              clock,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 64,
                height: 1,
                fontWeight: FontWeight.w700,
                letterSpacing: -3,
                fontFeatures: [FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(width: 6),
            Text(
              meridiem,
              style: const TextStyle(color: AuthPalette.accentLight, fontSize: 16, fontWeight: FontWeight.w700),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Text(date, style: const TextStyle(color: AuthPalette.storyMuted, fontSize: 14, fontWeight: FontWeight.w500)),
        const SizedBox(height: 4),
        Text.rich(
          const TextSpan(text: 'Welcome back to ', children: [
            TextSpan(text: 'Speshway.', style: TextStyle(color: AuthPalette.accentLight)),
          ]),
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 20,
            height: 1.2,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.4,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          '$_greeting — sign in to check in, track leave and get your payslips.',
          textAlign: TextAlign.center,
          style: const TextStyle(color: AuthPalette.storyMuted, fontSize: 13.5, height: 1.4),
        ),
      ]),
    );
  }
}

class _Chip extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  const _Chip({required this.icon, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
      child: Row(children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(color: AppColors.accent50, borderRadius: BorderRadius.circular(9)),
          child: Icon(icon, size: 17, color: AppColors.accent600),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AuthPalette.ink, fontSize: 14, fontWeight: FontWeight.w700)),
            Text(subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Color(0xFF5B6376), fontSize: 12)),
          ]),
        ),
      ]),
    );
  }
}
