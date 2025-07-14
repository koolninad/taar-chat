class ChatModel {
  final String id;
  final String name;
  final String lastMessage;
  final DateTime lastMessageTime;
  final int unreadCount;
  final String? profileImage;
  final bool isGroup;
  final bool isOnline;
  final bool isPinned;
  final bool isMuted;

  const ChatModel({
    required this.id,
    required this.name,
    required this.lastMessage,
    required this.lastMessageTime,
    this.unreadCount = 0,
    this.profileImage,
    this.isGroup = false,
    this.isOnline = false,
    this.isPinned = false,
    this.isMuted = false,
  });

  ChatModel copyWith({
    String? id,
    String? name,
    String? lastMessage,
    DateTime? lastMessageTime,
    int? unreadCount,
    String? profileImage,
    bool? isGroup,
    bool? isOnline,
    bool? isPinned,
    bool? isMuted,
  }) {
    return ChatModel(
      id: id ?? this.id,
      name: name ?? this.name,
      lastMessage: lastMessage ?? this.lastMessage,
      lastMessageTime: lastMessageTime ?? this.lastMessageTime,
      unreadCount: unreadCount ?? this.unreadCount,
      profileImage: profileImage ?? this.profileImage,
      isGroup: isGroup ?? this.isGroup,
      isOnline: isOnline ?? this.isOnline,
      isPinned: isPinned ?? this.isPinned,
      isMuted: isMuted ?? this.isMuted,
    );
  }
}