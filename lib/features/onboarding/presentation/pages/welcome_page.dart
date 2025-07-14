import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/constants/app_constants.dart';

class WelcomePage extends StatelessWidget {
  const WelcomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: AppConstants.defaultPadding,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              
              // App Logo
              Container(
                width: 120,
                height: 120,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Text(
                    'तार',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
              
              const SizedBox(height: 32),
              
              // App Name
              Text(
                'Welcome to Taar',
                style: AppTextStyles.heading1.copyWith(
                  color: AppColors.primary,
                ),
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: 16),
              
              // Tagline
              Text(
                'India\'s own secure messaging app',
                style: AppTextStyles.subtitle1.copyWith(
                  color: AppColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: 48),
              
              // Features
              _FeatureItem(
                icon: Icons.security,
                title: 'End-to-End Encrypted',
                subtitle: 'Your messages are secured with Signal Protocol',
              ),
              
              const SizedBox(height: 24),
              
              _FeatureItem(
                icon: Icons.language,
                title: 'Indian Languages',
                subtitle: 'Chat in Hindi, Tamil, Telugu and more',
              ),
              
              const SizedBox(height: 24),
              
              _FeatureItem(
                icon: Icons.code,
                title: 'Open Source',
                subtitle: 'Transparent and community-driven',
              ),
              
              const Spacer(),
              
              // Continue Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.go('/phone-verification'),
                  child: const Text('Get Started'),
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Terms and Privacy
              Text(
                'By continuing, you agree to our Terms of Service and Privacy Policy',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FeatureItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _FeatureItem({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            color: AppColors.primary,
            size: 24,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppTextStyles.subtitle2,
              ),
              Text(
                subtitle,
                style: AppTextStyles.body2.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}