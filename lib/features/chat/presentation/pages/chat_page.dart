import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../shared/models/message_model.dart';
import '../widgets/message_bubble.dart';
import '../widgets/chat_input.dart';

class ChatPage extends StatefulWidget {
  final String chatId;
  final String chatName;
  final bool isGroup;

  const ChatPage({
    super.key,
    required this.chatId,
    required this.chatName,
    required this.isGroup,
  });

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _messageController = TextEditingController();
  List<MessageModel> _messages = [];
  bool _isOnline = true;
  String _lastSeen = '2 minutes ago';

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  void _loadMessages() {
    // Mock data - in real app this would come from API/database
    _messages = [
      MessageModel(
        id: '1',
        chatId: widget.chatId,
        senderId: '123',
        senderName: widget.chatName,
        content: 'Hey! How are you doing?',
        type: MessageType.text,
        status: MessageStatus.read,
        timestamp: DateTime.now().subtract(const Duration(hours: 2)),
        isFromMe: false,
      ),
      MessageModel(
        id: '2',
        chatId: widget.chatId,
        senderId: 'me',
        senderName: 'You',
        content: 'I\'m doing great! Thanks for asking. How about you?',
        type: MessageType.text,
        status: MessageStatus.read,
        timestamp: DateTime.now().subtract(const Duration(hours: 1, minutes: 58)),
        isFromMe: true,
      ),
      MessageModel(
        id: '3',
        chatId: widget.chatId,
        senderId: '123',
        senderName: widget.chatName,
        content: 'All good here! Are we still on for the meeting tomorrow?',
        type: MessageType.text,
        status: MessageStatus.read,
        timestamp: DateTime.now().subtract(const Duration(hours: 1, minutes: 55)),
        isFromMe: false,
      ),
      MessageModel(
        id: '4',
        chatId: widget.chatId,
        senderId: 'me',
        senderName: 'You',
        content: 'Yes, absolutely! Looking forward to it.',
        type: MessageType.text,
        status: MessageStatus.read,
        timestamp: DateTime.now().subtract(const Duration(minutes: 30)),
        isFromMe: true,
      ),
      MessageModel(
        id: '5',
        chatId: widget.chatId,
        senderId: '123',
        senderName: widget.chatName,
        content: 'Perfect! See you then 👍',
        type: MessageType.text,
        status: MessageStatus.delivered,
        timestamp: DateTime.now().subtract(const Duration(minutes: 5)),
        isFromMe: false,
      ),
    ];
    setState(() {});
    
    // Scroll to bottom
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage(String text) {
    if (text.trim().isEmpty) return;

    final message = MessageModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      chatId: widget.chatId,
      senderId: 'me',
      senderName: 'You',
      content: text.trim(),
      type: MessageType.text,
      status: MessageStatus.sending,
      timestamp: DateTime.now(),
      isFromMe: true,
    );

    setState(() {
      _messages.add(message);
    });

    _messageController.clear();

    // Scroll to bottom
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });

    // Simulate message status updates
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() {
          final index = _messages.indexWhere((m) => m.id == message.id);
          if (index != -1) {
            _messages[index] = _messages[index].copyWith(status: MessageStatus.sent);
          }
        });
      }
    });

    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          final index = _messages.indexWhere((m) => m.id == message.id);
          if (index != -1) {
            _messages[index] = _messages[index].copyWith(status: MessageStatus.delivered);
          }
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.chatBackground,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: Colors.white24,
              child: Icon(
                widget.isGroup ? Icons.group : Icons.person,
                color: Colors.white,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.chatName,
                    style: AppTextStyles.subtitle1.copyWith(
                      color: Colors.white,
                    ),
                  ),
                  if (!widget.isGroup)
                    Text(
                      _isOnline ? 'online' : 'last seen $_lastSeen',
                      style: AppTextStyles.caption.copyWith(
                        color: Colors.white70,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.videocam),
            onPressed: () {
              context.push('/call/video?contact=${Uri.encodeComponent(widget.chatName)}');
            },
          ),
          IconButton(
            icon: const Icon(Icons.call),
            onPressed: () {
              context.push('/call/voice?contact=${Uri.encodeComponent(widget.chatName)}');
            },
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: (value) {
              switch (value) {
                case 'view_contact':
                  // TODO: View contact
                  break;
                case 'media':
                  // TODO: View media
                  break;
                case 'search':
                  // TODO: Search in chat
                  break;
                case 'mute':
                  // TODO: Mute notifications
                  break;
                case 'wallpaper':
                  // TODO: Change wallpaper
                  break;
                case 'clear_chat':
                  // TODO: Clear chat
                  break;
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'view_contact',
                child: Text(widget.isGroup ? 'Group info' : 'View contact'),
              ),
              const PopupMenuItem(
                value: 'media',
                child: Text('Media, links, and docs'),
              ),
              const PopupMenuItem(
                value: 'search',
                child: Text('Search'),
              ),
              const PopupMenuItem(
                value: 'mute',
                child: Text('Mute notifications'),
              ),
              const PopupMenuItem(
                value: 'wallpaper',
                child: Text('Wallpaper'),
              ),
              const PopupMenuItem(
                value: 'clear_chat',
                child: Text('Clear chat'),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Messages
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                final previousMessage = index > 0 ? _messages[index - 1] : null;
                final showSenderName = widget.isGroup && 
                    !message.isFromMe && 
                    (previousMessage == null || 
                     previousMessage.senderId != message.senderId);

                return MessageBubble(
                  message: message,
                  showSenderName: showSenderName,
                );
              },
            ),
          ),
          
          // Input area
          ChatInput(
            controller: _messageController,
            onSendMessage: _sendMessage,
            onAttachmentPressed: () {
              // TODO: Show attachment options
              _showAttachmentOptions();
            },
          ),
        ],
      ),
    );
  }

  void _showAttachmentOptions() {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Share',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            GridView.count(
              shrinkWrap: true,
              crossAxisCount: 3,
              padding: const EdgeInsets.all(16),
              children: [
                _AttachmentOption(
                  icon: Icons.photo_library,
                  label: 'Gallery',
                  color: Colors.purple,
                  onTap: () {
                    Navigator.pop(context);
                    // TODO: Pick image from gallery
                  },
                ),
                _AttachmentOption(
                  icon: Icons.camera_alt,
                  label: 'Camera',
                  color: Colors.red,
                  onTap: () {
                    Navigator.pop(context);
                    // TODO: Take photo
                  },
                ),
                _AttachmentOption(
                  icon: Icons.insert_drive_file,
                  label: 'Document',
                  color: Colors.blue,
                  onTap: () {
                    Navigator.pop(context);
                    // TODO: Pick document
                  },
                ),
                _AttachmentOption(
                  icon: Icons.location_on,
                  label: 'Location',
                  color: Colors.green,
                  onTap: () {
                    Navigator.pop(context);
                    // TODO: Share location
                  },
                ),
                _AttachmentOption(
                  icon: Icons.person,
                  label: 'Contact',
                  color: Colors.orange,
                  onTap: () {
                    Navigator.pop(context);
                    // TODO: Share contact
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _AttachmentOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _AttachmentOption({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: Colors.white,
              size: 30,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: AppTextStyles.caption,
          ),
        ],
      ),
    );
  }
}