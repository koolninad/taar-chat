import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/models/chat_model.dart';

class ChatTile extends StatelessWidget {
  final ChatModel chat;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  const ChatTile({
    super.key,
    required this.chat,
    required this.onTap,
    required this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      onLongPress: onLongPress,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            // Profile Picture
            Stack(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.primary.withOpacity(0.1),
                  backgroundImage: chat.profileImage != null
                      ? NetworkImage(chat.profileImage!)
                      : null,
                  child: chat.profileImage == null
                      ? Icon(
                          chat.isGroup ? Icons.group : Icons.person,
                          color: AppColors.primary,
                          size: 32,
                        )
                      : null,
                ),
                
                // Online indicator
                if (!chat.isGroup && chat.isOnline)
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 16,
                      height: 16,
                      decoration: BoxDecoration(
                        color: AppColors.online,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppColors.background,
                          width: 2,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            
            const SizedBox(width: 16),
            
            // Chat Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      // Pin indicator
                      if (chat.isPinned)
                        const Padding(
                          padding: EdgeInsets.only(right: 4),
                          child: Icon(
                            Icons.push_pin,
                            size: 16,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      
                      // Chat name
                      Expanded(
                        child: Text(
                          chat.name,
                          style: AppTextStyles.chatName.copyWith(
                            fontWeight: chat.unreadCount > 0 
                                ? FontWeight.w600 
                                : FontWeight.w500,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 4),
                  
                  // Last message
                  Row(
                    children: [
                      // Muted indicator
                      if (chat.isMuted)
                        const Padding(
                          padding: EdgeInsets.only(right: 4),
                          child: Icon(
                            Icons.volume_off,
                            size: 16,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      
                      Expanded(
                        child: Text(
                          chat.lastMessage,
                          style: AppTextStyles.body2.copyWith(
                            color: chat.unreadCount > 0
                                ? AppColors.textPrimary
                                : AppColors.textSecondary,
                            fontWeight: chat.unreadCount > 0
                                ? FontWeight.w500
                                : FontWeight.w400,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            const SizedBox(width: 8),
            
            // Time and unread count
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  _formatTime(chat.lastMessageTime),
                  style: AppTextStyles.chatTime.copyWith(
                    color: chat.unreadCount > 0
                        ? AppColors.primary
                        : AppColors.textSecondary,
                    fontWeight: chat.unreadCount > 0
                        ? FontWeight.w600
                        : FontWeight.w400,
                  ),
                ),
                
                if (chat.unreadCount > 0) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: chat.isMuted ? AppColors.textSecondary : AppColors.primary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 20,
                      minHeight: 20,
                    ),
                    child: Text(
                      chat.unreadCount > 99 ? '99+' : chat.unreadCount.toString(),
                      style: AppTextStyles.caption.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);
    
    if (difference.inDays == 0) {
      // Today - show time
      final hour = dateTime.hour;
      final minute = dateTime.minute.toString().padLeft(2, '0');
      final period = hour >= 12 ? 'PM' : 'AM';
      final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
      return '$displayHour:$minute $period';
    } else if (difference.inDays == 1) {
      // Yesterday
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      // This week - show day name
      final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days[dateTime.weekday - 1];
    } else {
      // Older - show date
      return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
    }
  }
}