import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../shared/models/chat_model.dart';
import '../../../../shared/services/message_service.dart';
import '../../../../shared/services/api_client.dart';
import '../widgets/chat_tile.dart';

class ChatListPage extends StatefulWidget {
  const ChatListPage({super.key});

  @override
  State<ChatListPage> createState() => _ChatListPageState();
}

class _ChatListPageState extends State<ChatListPage> {
  final TextEditingController _searchController = TextEditingController();
  final MessageService _messageService = MessageService();
  List<ChatModel> _chats = [];
  List<ChatModel> _filteredChats = [];
  bool _isSearching = false;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadChats();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadChats() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await _messageService.getChats();
      
      if (response.success && response.data != null) {
        // Transform API response to ChatModel objects
        final List<ChatModel> chats = response.data!.map((chatData) {
          return ChatModel(
            id: chatData['id'] ?? '',
            name: chatData['name'] ?? 'Unknown',
            lastMessage: chatData['lastMessage'] ?? '',
            lastMessageTime: chatData['lastMessageTime'] != null
                ? DateTime.parse(chatData['lastMessageTime'])
                : DateTime.now(),
            unreadCount: chatData['unreadCount'] ?? 0,
            profileImage: chatData['profileImage'],
            isGroup: chatData['isGroup'] ?? false,
            isOnline: chatData['isOnline'] ?? false,
            isPinned: chatData['isPinned'] ?? false,
            isMuted: chatData['isMuted'] ?? false,
          );
        }).toList();

        setState(() {
          _chats = chats;
          _filteredChats = List.from(_chats);
          _isLoading = false;
        });
      } else {
        setState(() {
          _isLoading = false;
          _errorMessage = response.error ?? 'Failed to load chats';
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e is ApiError ? e.message : 'Network error occurred';
      });
    }
  }

  void _onSearchChanged() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      _isSearching = query.isNotEmpty;
      _filteredChats = _chats.where((chat) {
        return chat.name.toLowerCase().contains(query) ||
               chat.lastMessage.toLowerCase().contains(query);
      }).toList();
    });
  }

  void _openChat(ChatModel chat) {
    context.push(
      '/chat/${chat.id}?name=${Uri.encodeComponent(chat.name)}&isGroup=${chat.isGroup}',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Search Bar
        Container(
          padding: AppConstants.defaultPadding,
          color: AppColors.background,
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search chats...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _isSearching
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                      },
                    )
                  : null,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(25),
                borderSide: BorderSide.none,
              ),
              filled: true,
              fillColor: AppColors.surface,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 12,
              ),
            ),
          ),
        ),
        
        // Chat List
        Expanded(
          child: _isLoading
              ? _buildLoadingState()
              : _errorMessage != null
                  ? _buildErrorState()
                  : _filteredChats.isEmpty
                      ? _buildEmptyState()
                      : ListView.builder(
                          itemCount: _filteredChats.length,
                          itemBuilder: (context, index) {
                            final chat = _filteredChats[index];
                            return ChatTile(
                              chat: chat,
                      onTap: () => _openChat(chat),
                      onLongPress: () => _showChatOptions(chat),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildLoadingState() {
    return const Center(
      child: CircularProgressIndicator(),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: AppColors.error,
          ),
          const SizedBox(height: 16),
          Text(
            'Error loading chats',
            style: AppTextStyles.subtitle1.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _errorMessage ?? 'Something went wrong',
            style: AppTextStyles.body2.copyWith(
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadChats,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            _isSearching ? Icons.search_off : Icons.chat_bubble_outline,
            size: 64,
            color: AppColors.textSecondary,
          ),
          const SizedBox(height: 16),
          Text(
            _isSearching ? 'No chats found' : 'No chats yet',
            style: AppTextStyles.subtitle1.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _isSearching 
              ? 'Try a different search term'
              : 'Start a conversation by tapping the chat button',
            style: AppTextStyles.body2.copyWith(
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  void _showChatOptions(ChatModel chat) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: Icon(chat.isPinned ? Icons.push_pin_outlined : Icons.push_pin),
              title: Text(chat.isPinned ? 'Unpin chat' : 'Pin chat'),
              onTap: () {
                Navigator.pop(context);
                // TODO: Implement pin/unpin
              },
            ),
            ListTile(
              leading: Icon(chat.isMuted ? Icons.volume_up : Icons.volume_off),
              title: Text(chat.isMuted ? 'Unmute' : 'Mute notifications'),
              onTap: () {
                Navigator.pop(context);
                // TODO: Implement mute/unmute
              },
            ),
            ListTile(
              leading: const Icon(Icons.archive),
              title: const Text('Archive chat'),
              onTap: () {
                Navigator.pop(context);
                // TODO: Implement archive
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete, color: AppColors.error),
              title: const Text('Delete chat', style: TextStyle(color: AppColors.error)),
              onTap: () {
                Navigator.pop(context);
                // TODO: Implement delete
              },
            ),
          ],
        ),
      ),
    );
  }
}