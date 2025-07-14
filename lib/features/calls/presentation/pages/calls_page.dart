import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

class CallsPage extends StatelessWidget {
  const CallsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final calls = [
      {
        'name': 'Priya Sharma',
        'time': '2 hours ago',
        'type': 'video',
        'incoming': true,
        'missed': false,
      },
      {
        'name': 'Rahul Kumar',
        'time': 'Yesterday',
        'type': 'voice',
        'incoming': false,
        'missed': false,
      },
      {
        'name': 'Mom',
        'time': 'Yesterday',
        'type': 'video',
        'incoming': true,
        'missed': true,
      },
      {
        'name': 'Office Team',
        'time': '2 days ago',
        'type': 'voice',
        'incoming': false,
        'missed': false,
      },
    ];

    return ListView.builder(
      itemCount: calls.length,
      itemBuilder: (context, index) {
        final call = calls[index];
        final isVideo = call['type'] == 'video';
        final isIncoming = call['incoming'] as bool;
        final isMissed = call['missed'] as bool;
        
        return ListTile(
          leading: const CircleAvatar(
            backgroundColor: AppColors.surface,
            child: Icon(Icons.person, color: AppColors.textSecondary),
          ),
          title: Text(
            call['name'] as String,
            style: TextStyle(
              color: isMissed ? AppColors.error : null,
            ),
          ),
          subtitle: Row(
            children: [
              Icon(
                isIncoming
                    ? (isMissed ? Icons.call_received : Icons.call_received)
                    : Icons.call_made,
                size: 16,
                color: isMissed
                    ? AppColors.error
                    : isIncoming
                        ? AppColors.accent
                        : AppColors.textSecondary,
              ),
              const SizedBox(width: 4),
              Text(call['time'] as String),
            ],
          ),
          trailing: IconButton(
            icon: Icon(
              isVideo ? Icons.videocam : Icons.call,
              color: AppColors.accent,
            ),
            onPressed: () {
              context.push(
                '/call/${isVideo ? 'video' : 'voice'}?contact=${Uri.encodeComponent(call['name'] as String)}',
              );
            },
          ),
          onTap: () {
            context.push(
              '/call/${isVideo ? 'video' : 'voice'}?contact=${Uri.encodeComponent(call['name'] as String)}',
            );
          },
        );
      },
    );
  }
}