import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/models/message_model.dart';

class MessageBubble extends StatelessWidget {
  final MessageModel message;
  final bool showSenderName;

  const MessageBubble({
    super.key,
    required this.message,
    this.showSenderName = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(
        left: message.isFromMe ? 60 : 16,
        right: message.isFromMe ? 16 : 60,
        top: 2,
        bottom: 2,
      ),
      child: Row(
        mainAxisAlignment: message.isFromMe 
          ? MainAxisAlignment.end 
          : MainAxisAlignment.start,
        children: [
          if (!message.isFromMe && showSenderName) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: AppColors.primary.withOpacity(0.1),
              child: Text(
                message.senderName[0].toUpperCase(),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
          
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 10,
              ),
              decoration: BoxDecoration(
                color: message.isFromMe 
                  ? AppColors.outgoingBubble 
                  : AppColors.incomingBubble,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(message.isFromMe ? 16 : 4),
                  bottomRight: Radius.circular(message.isFromMe ? 4 : 16),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    offset: const Offset(0, 1),
                    blurRadius: 2,
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Sender name (for group chats)
                  if (showSenderName) ...[
                    Text(
                      message.senderName,
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                  ],
                  
                  // Reply to message (if any)
                  if (message.replyToMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.all(8),
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(8),
                        border: Border(
                          left: BorderSide(
                            color: AppColors.primary,
                            width: 3,
                          ),
                        ),
                      ),
                      child: Text(
                        message.replyToMessage!,
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                  
                  // Message content
                  _buildMessageContent(),
                  
                  const SizedBox(height: 4),
                  
                  // Time and status
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Forwarded indicator
                      if (message.isForwarded) ...[
                        Icon(
                          Icons.forward,
                          size: 12,
                          color: AppColors.textSecondary,
                        ),
                        const SizedBox(width: 4),
                      ],
                      
                      // Time
                      Text(
                        _formatTime(message.timestamp),
                        style: AppTextStyles.chatTime.copyWith(
                          color: message.isFromMe 
                            ? Colors.black54 
                            : AppColors.textSecondary,
                        ),
                      ),
                      
                      // Message status (for sent messages)
                      if (message.isFromMe) ...[
                        const SizedBox(width: 4),
                        _buildStatusIcon(),
                      ],
                      
                      // Star indicator
                      if (message.isStarred) ...[
                        const SizedBox(width: 4),
                        Icon(
                          Icons.star,
                          size: 12,
                          color: Colors.amber,
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageContent() {
    switch (message.type) {
      case MessageType.text:
        return Text(
          message.content,
          style: AppTextStyles.chatMessage.copyWith(
            color: message.isFromMe ? Colors.black87 : AppColors.textPrimary,
          ),
        );
      
      case MessageType.image:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 200,
              height: 150,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Center(
                child: Icon(Icons.image, size: 40),
              ),
            ),
            if (message.content.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                message.content,
                style: AppTextStyles.chatMessage.copyWith(
                  color: message.isFromMe ? Colors.black87 : AppColors.textPrimary,
                ),
              ),
            ],
          ],
        );
      
      case MessageType.audio:
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.play_arrow,
              color: AppColors.primary,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Container(
                height: 20,
                child: LinearProgressIndicator(
                  value: 0.3,
                  backgroundColor: Colors.grey[300],
                  valueColor: AlwaysStoppedAnimation(AppColors.primary),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '0:45',
              style: AppTextStyles.caption,
            ),
          ],
        );
      
      default:
        return Row(
          children: [
            Icon(
              Icons.insert_drive_file,
              color: AppColors.primary,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message.content,
                style: AppTextStyles.chatMessage.copyWith(
                  color: message.isFromMe ? Colors.black87 : AppColors.textPrimary,
                ),
              ),
            ),
          ],
        );
    }
  }

  Widget _buildStatusIcon() {
    switch (message.status) {
      case MessageStatus.sending:
        return SizedBox(
          width: 12,
          height: 12,
          child: CircularProgressIndicator(
            strokeWidth: 1.5,
            valueColor: AlwaysStoppedAnimation(Colors.black54),
          ),
        );
      
      case MessageStatus.sent:
        return Icon(
          Icons.check,
          size: 16,
          color: Colors.black54,
        );
      
      case MessageStatus.delivered:
        return Icon(
          Icons.done_all,
          size: 16,
          color: Colors.black54,
        );
      
      case MessageStatus.read:
        return Icon(
          Icons.done_all,
          size: 16,
          color: AppColors.primary,
        );
      
      case MessageStatus.failed:
        return Icon(
          Icons.error_outline,
          size: 16,
          color: AppColors.error,
        );
    }
  }

  String _formatTime(DateTime dateTime) {
    final hour = dateTime.hour;
    final minute = dateTime.minute.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '$displayHour:$minute $period';
  }
}