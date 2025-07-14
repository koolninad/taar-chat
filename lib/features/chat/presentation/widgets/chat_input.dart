import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

class ChatInput extends StatefulWidget {
  final TextEditingController controller;
  final Function(String) onSendMessage;
  final VoidCallback onAttachmentPressed;

  const ChatInput({
    super.key,
    required this.controller,
    required this.onSendMessage,
    required this.onAttachmentPressed,
  });

  @override
  State<ChatInput> createState() => _ChatInputState();
}

class _ChatInputState extends State<ChatInput> {
  bool _isTyping = false;
  bool _showSendButton = false;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    super.dispose();
  }

  void _onTextChanged() {
    final hasText = widget.controller.text.trim().isNotEmpty;
    if (hasText != _showSendButton) {
      setState(() {
        _showSendButton = hasText;
      });
    }
  }

  void _sendMessage() {
    final text = widget.controller.text.trim();
    if (text.isNotEmpty) {
      widget.onSendMessage(text);
    }
  }

  void _startRecording() {
    // TODO: Implement voice recording
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Voice recording will be implemented'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: const BoxDecoration(
        color: AppColors.background,
        border: Border(
          top: BorderSide(color: AppColors.divider, width: 0.5),
        ),
      ),
      child: SafeArea(
        child: Row(
          children: [
            // Attachment button
            IconButton(
              icon: const Icon(Icons.attach_file),
              color: AppColors.textSecondary,
              onPressed: widget.onAttachmentPressed,
            ),
            
            // Text input
            Expanded(
              child: Container(
                constraints: const BoxConstraints(
                  minHeight: 40,
                  maxHeight: 120,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppColors.divider,
                    width: 0.5,
                  ),
                ),
                child: Row(
                  children: [
                    const SizedBox(width: 16),
                    
                    Expanded(
                      child: TextField(
                        controller: widget.controller,
                        maxLines: null,
                        textCapitalization: TextCapitalization.sentences,
                        decoration: InputDecoration(
                          hintText: 'Type a message',
                          hintStyle: AppTextStyles.body1.copyWith(
                            color: AppColors.textSecondary,
                          ),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            vertical: 10,
                          ),
                        ),
                        style: AppTextStyles.body1,
                        onSubmitted: (_) => _sendMessage(),
                      ),
                    ),
                    
                    // Emoji button
                    IconButton(
                      icon: const Icon(Icons.emoji_emotions_outlined),
                      color: AppColors.textSecondary,
                      onPressed: () {
                        // TODO: Show emoji picker
                      },
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(width: 8),
            
            // Send/Voice button
            GestureDetector(
              onTap: _showSendButton ? _sendMessage : _startRecording,
              onLongPress: !_showSendButton ? _startRecording : null,
              child: Container(
                width: 48,
                height: 48,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _showSendButton ? Icons.send : Icons.mic,
                  color: Colors.white,
                  size: 20,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}