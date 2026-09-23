import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_client.dart';
import '../services/app_settings.dart';
import '../services/auth_provider.dart';
import '../theme/app_theme.dart';
import '../theme/responsive.dart';
import '../widgets/state_views.dart';
import 'shell/app_shell.dart';

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
  bool _networkError = false;

  @override
  void dispose() {
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

  static final Uri _termsUrl = Uri.parse(
    'https://speshwayhrms.com/terms-and-conditions',
  );
  static final Uri _privacyUrl = Uri.parse(
    'https://speshwayhrms.com/privacy-policy',
  );

  Future<void> _openUrl(Uri url) async {
    final ok = await launchUrl(url, mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Could not open ${url.host}')));
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _networkError = false;
    });
    final auth = context.read<AuthProvider>();
    final ok = await auth.login(
      _emailController.text.trim(),
      _passwordController.text,
    );
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
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    AppColors.isDark = false;
    return Theme(
      data: AppTheme.light,
      child: Scaffold(
        backgroundColor: AppColors.brand900,
        resizeToAvoidBottomInset: true,
        body: SafeArea(
          bottom: false,
          child: Column(
            children: [
              // Dark hero fills the space above the card, logo+tagline
              // centered squarely in the middle of it.
              Expanded(
                child: Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: context.w(24)),
                    // FittedBox lets the logo/title/tagline scale down instead
                    // of overflowing when the keyboard opens and shrinks this
                    // Expanded region below the header's natural height. The
                    // fixed-width SizedBox keeps the tagline wrapping at a
                    // sane width before FittedBox scales the whole block.
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: SizedBox(width: 280, child: _buildBrandHeader()),
                    ),
                  ),
                ),
              ),
              // Full-width bottom sheet, rounded top corners only.
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: context.isTablet ? 440 : double.infinity,
                ),
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(28),
                      topRight: Radius.circular(28),
                    ),
                  ),
                  child: SingleChildScrollView(
                    padding: EdgeInsets.fromLTRB(
                      context.w(24),
                      context.h(28),
                      context.w(24),
                      context.h(20) + bottomInset,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (_networkError) ...[
                          SizedBox(
                            height: context.h(240),
                            child: NetworkErrorView(onRetry: _submit),
                          ),
                          SizedBox(height: context.h(8)),
                        ],
                        Offstage(
                          offstage: _networkError,
                          child: _buildLoginCard(),
                        ),
                        SizedBox(height: context.h(16)),
                        Text.rich(
                          TextSpan(
                            text: 'By signing in you agree to our ',
                            children: [
                              TextSpan(
                                text: 'Terms of Service',
                                style: TextStyle(
                                  color: AppColors.inkMuted,
                                  decoration: TextDecoration.underline,
                                ),
                                recognizer: TapGestureRecognizer()
                                  ..onTap = () => _openUrl(_termsUrl),
                              ),
                              const TextSpan(text: ' and '),
                              TextSpan(
                                text: 'Privacy Policy',
                                style: TextStyle(
                                  color: AppColors.inkMuted,
                                  decoration: TextDecoration.underline,
                                ),
                                recognizer: TapGestureRecognizer()
                                  ..onTap = () => _openUrl(_privacyUrl),
                              ),
                              const TextSpan(text: '.'),
                            ],
                          ),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AppColors.inkMuted,
                            fontSize: context.sp(12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBrandHeader() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Image.asset('assets/logo.png', width: 56, height: 56),
        ),
        const SizedBox(height: 16),
        const Text(
          'SPESHWAY HRMS',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'The complete HR platform for growing teams',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.white70, fontSize: 14),
        ),
      ],
    );
  }

  Widget _buildLoginCard() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Welcome back',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: AppColors.ink,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Sign in to your Speshway HRMS account',
            style: TextStyle(color: AppColors.inkMuted, fontSize: 13),
          ),
          const SizedBox(height: 24),
          Text(
            'Email',
            style: TextStyle(fontSize: 13, color: AppColors.inkMuted),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            decoration: const InputDecoration(
              prefixIcon: Icon(Icons.mail_outline, size: 20),
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
          const SizedBox(height: 18),
          Text(
            'Password',
            style: TextStyle(fontSize: 13, color: AppColors.inkMuted),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.lock_outline, size: 20),
              suffixIcon: IconButton(
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
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Login'),
            ),
          ),
        ],
      ),
    );
  }
}
