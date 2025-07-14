enum MessageType {
  text,
  image,
  video,
  audio,
  document,
  location,
  contact,
}

enum MessageStatus {
  sending,
  sent,
  delivered,
  read,
  failed,
}

class MessageModel {
  final String id;
  final String chatId;
  final String senderId;
  final String senderName;
  final String content;
  final MessageType type;
  final MessageStatus status;
  final DateTime timestamp;
  final bool isFromMe;
  final String? replyToId;
  final String? replyToMessage;
  final String? mediaUrl;
  final String? thumbnailUrl;
  final bool isForwarded;
  final bool isStarred;

  const MessageModel({
    required this.id,
    required this.chatId,
    required this.senderId,
    required this.senderName,
    required this.content,
    required this.type,
    required this.status,
    required this.timestamp,
    required this.isFromMe,
    this.replyToId,
    this.replyToMessage,
    this.mediaUrl,
    this.thumbnailUrl,
    this.isForwarded = false,
    this.isStarred = false,
  });

  MessageModel copyWith({
    String? id,
    String? chatId,
    String? senderId,
    String? senderName,
    String? content,
    MessageType? type,
    MessageStatus? status,
    DateTime? timestamp,
    bool? isFromMe,
    String? replyToId,
    String? replyToMessage,
    String? mediaUrl,
    String? thumbnailUrl,
    bool? isForwarded,
    bool? isStarred,
  }) {
    return MessageModel(
      id: id ?? this.id,
      chatId: chatId ?? this.chatId,
      senderId: senderId ?? this.senderId,
      senderName: senderName ?? this.senderName,
      content: content ?? this.content,
      type: type ?? this.type,
      status: status ?? this.status,
      timestamp: timestamp ?? this.timestamp,
      isFromMe: isFromMe ?? this.isFromMe,
      replyToId: replyToId ?? this.replyToId,
      replyToMessage: replyToMessage ?? this.replyToMessage,
      mediaUrl: mediaUrl ?? this.mediaUrl,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      isForwarded: isForwarded ?? this.isForwarded,
      isStarred: isStarred ?? this.isStarred,
    );
  }
}