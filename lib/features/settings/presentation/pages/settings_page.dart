import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: ListView(
        children: [
          // Profile section
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const CircleAvatar(
                  radius: 32,
                  backgroundColor: AppColors.surface,
                  child: Icon(Icons.person, size: 40, color: AppColors.textSecondary),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Your Name',
                        style: AppTextStyles.subtitle1,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Hey there! I am using Taar.',
                        style: AppTextStyles.body2.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.qr_code, color: AppColors.accent),
              ],
            ),
          ),
          
          const Divider(),
          
          // Settings sections
          _SettingsSection(
            title: 'Account',
            items: [
              _SettingsItem(
                icon: Icons.key,
                title: 'Privacy',
                subtitle: 'Block contacts, disappearing messages',
                onTap: () {},
              ),
              _SettingsItem(
                icon: Icons.security,
                title: 'Security',
                subtitle: 'Change number, delete account',
                onTap: () {},
              ),
              _SettingsItem(
                icon: Icons.chat,
                title: 'Chats',
                subtitle: 'Theme, wallpapers, chat history',
                onTap: () {},
              ),
            ],
          ),
          
          _SettingsSection(
            title: 'Support',
            items: [
              _SettingsItem(
                icon: Icons.help,
                title: 'Help',
                subtitle: 'Help center, contact us, privacy policy',
                onTap: () {},
              ),
              _SettingsItem(
                icon: Icons.group,
                title: 'Invite a friend',
                subtitle: 'Share Taar with your friends',
                onTap: () {},
              ),
            ],
          ),
          
          _SettingsSection(
            title: 'General',
            items: [
              _SettingsItem(
                icon: Icons.notifications,
                title: 'Notifications',
                subtitle: 'Message, group & call tones',
                onTap: () {},
              ),
              _SettingsItem(
                icon: Icons.data_usage,
                title: 'Storage and data',
                subtitle: 'Network usage, auto-download',
                onTap: () {},
              ),
              _SettingsItem(
                icon: Icons.language,
                title: 'App language',
                subtitle: 'English (device\'s language)',
                onTap: () {},
              ),
            ],
          ),
          
          const SizedBox(height: 32),
          
          // About section
          Center(
            child: Column(
              children: [
                Text(
                  'Taar v1.0.0',
                  style: AppTextStyles.body2.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Made with ❤️ in India',
                  style: AppTextStyles.body2.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _SettingsSection extends StatelessWidget {
  final String title;
  final List<_SettingsItem> items;

  const _SettingsSection({
    required this.title,
    required this.items,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            title,
            style: AppTextStyles.subtitle2.copyWith(
              color: AppColors.primary,
            ),
          ),
        ),
        ...items,
        const SizedBox(height: 16),
      ],
    );
  }
}

class _SettingsItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _SettingsItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: AppColors.textSecondary),
      title: Text(title),
      subtitle: Text(
        subtitle,
        style: AppTextStyles.body2.copyWith(
          color: AppColors.textSecondary,
        ),
      ),
      onTap: onTap,
    );
  }
}