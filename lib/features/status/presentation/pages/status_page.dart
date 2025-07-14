import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

class StatusPage extends StatelessWidget {
  const StatusPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        // My Status
        ListTile(
          leading: Stack(
            children: [
              const CircleAvatar(
                radius: 28,
                backgroundColor: AppColors.surface,
                child: Icon(Icons.person, color: AppColors.textSecondary),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  width: 20,
                  height: 20,
                  decoration: const BoxDecoration(
                    color: AppColors.accent,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.add,
                    color: Colors.white,
                    size: 16,
                  ),
                ),
              ),
            ],
          ),
          title: const Text('My status'),
          subtitle: const Text('Tap to add status update'),
          onTap: () {
            // TODO: Add status
          },
        ),
        
        const Divider(),
        
        // Recent updates header
        Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            'Recent updates',
            style: AppTextStyles.subtitle2.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ),
        
        // Status list
        ...List.generate(5, (index) {
          return ListTile(
            leading: Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.accent,
                  width: 2,
                ),
              ),
              child: const CircleAvatar(
                backgroundColor: AppColors.surface,
                child: Icon(Icons.person, color: AppColors.textSecondary),
              ),
            ),
            title: Text('Contact ${index + 1}'),
            subtitle: const Text('2 hours ago'),
            onTap: () {
              // TODO: View status
            },
          );
        }),
      ],
    );
  }
}