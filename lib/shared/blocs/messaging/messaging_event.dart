import 'package:equatable/equatable.dart';

/// Messaging events
abstract class MessagingEvent extends Equatable {
  const MessagingEvent();

  @override
  List<Object?> get props => [];
}

/// Initialize messaging system
class MessagingInitialize extends MessagingEvent {
  const MessagingInitialize();
}

/// Load messages for a chat
class MessagingLoadMessages extends MessagingEvent {
  final String chatId;
  final int page;
  final int limit;

  const MessagingLoadMessages({
    required this.chatId,
    this.page = 1,
    this.limit = 20,
  });

  @override
  List<Object?> get props => [chatId, page, limit];
}

/// Load more messages (pagination)
class MessagingLoadMoreMessages extends MessagingEvent {
  final String chatId;

  const MessagingLoadMoreMessages({
    required this.chatId,
  });

  @override
  List<Object?> get props => [chatId];
}

/// Send a message
class MessagingSendMessage extends MessagingEvent {
  final String? recipientId;
  final String? groupId;
  final String message;
  final String messageType;
  final String? mediaFileId;
  final String tempMessageId;

  const MessagingSendMessage({
    this.recipientId,
    this.groupId,
    required this.message,
    this.messageType = 'TEXT',
    this.mediaFileId,
    required this.tempMessageId,
  });

  @override
  List<Object?> get props => [
        recipientId,
        groupId,
        message,
        messageType,
        mediaFileId,
        tempMessageId,
      ];
}

/// Message received via WebSocket
class MessagingMessageReceived extends MessagingEvent {
  final Map<String, dynamic> messageData;

  const MessagingMessageReceived({
    required this.messageData,
  });

  @override
  List<Object?> get props => [messageData];
}

/// Edit a message
class MessagingEditMessage extends MessagingEvent {
  final String messageId;
  final String newContent;

  const MessagingEditMessage({
    required this.messageId,
    required this.newContent,
  });

  @override
  List<Object?> get props => [messageId, newContent];
}

/// Delete a message
class MessagingDeleteMessage extends MessagingEvent {
  final String messageId;
  final bool deleteForEveryone;

  const MessagingDeleteMessage({
    required this.messageId,
    this.deleteForEveryone = false,
  });

  @override
  List<Object?> get props => [messageId, deleteForEveryone];
}

/// React to a message
class MessagingReactToMessage extends MessagingEvent {
  final String messageId;
  final String reaction;

  const MessagingReactToMessage({
    required this.messageId,
    required this.reaction,
  });

  @override
  List<Object?> get props => [messageId, reaction];
}

/// Remove reaction from message
class MessagingRemoveReaction extends MessagingEvent {
  final String messageId;

  const MessagingRemoveReaction({
    required this.messageId,
  });

  @override
  List<Object?> get props => [messageId];
}

/// Forward a message
class MessagingForwardMessage extends MessagingEvent {
  final String messageId;
  final String? recipientId;
  final String? groupId;

  const MessagingForwardMessage({
    required this.messageId,
    this.recipientId,
    this.groupId,
  });

  @override
  List<Object?> get props => [messageId, recipientId, groupId];
}

/// Star/unstar a message
class MessagingToggleStarMessage extends MessagingEvent {
  final String messageId;
  final bool isStarred;

  const MessagingToggleStarMessage({
    required this.messageId,
    required this.isStarred,
  });

  @override
  List<Object?> get props => [messageId, isStarred];
}

/// Search messages
class MessagingSearchMessages extends MessagingEvent {
  final String query;
  final String? chatId;
  final int page;
  final int limit;

  const MessagingSearchMessages({
    required this.query,
    this.chatId,
    this.page = 1,
    this.limit = 20,
  });

  @override
  List<Object?> get props => [query, chatId, page, limit];
}

/// Decrypt a message
class MessagingDecryptMessage extends MessagingEvent {
  final String messageId;

  const MessagingDecryptMessage({
    required this.messageId,
  });

  @override
  List<Object?> get props => [messageId];
}

/// Batch decrypt messages
class MessagingBatchDecryptMessages extends MessagingEvent {
  final List<String> messageIds;

  const MessagingBatchDecryptMessages({
    required this.messageIds,
  });

  @override
  List<Object?> get props => [messageIds];
}

/// Get conversation security status
class MessagingGetSecurityStatus extends MessagingEvent {
  final String chatId;

  const MessagingGetSecurityStatus({
    required this.chatId,
  });

  @override
  List<Object?> get props => [chatId];
}

/// Typing indicator events
class MessagingStartTyping extends MessagingEvent {
  final String chatId;

  const MessagingStartTyping({
    required this.chatId,
  });

  @override
  List<Object?> get props => [chatId];
}

class MessagingStopTyping extends MessagingEvent {
  final String chatId;

  const MessagingStopTyping({
    required this.chatId,
  });

  @override
  List<Object?> get props => [chatId];
}

class MessagingTypingReceived extends MessagingEvent {
  final String chatId;
  final String userId;
  final bool isTyping;

  const MessagingTypingReceived({
    required this.chatId,
    required this.userId,
    required this.isTyping,
  });

  @override
  List<Object?> get props => [chatId, userId, isTyping];
}

/// Connection events
class MessagingConnected extends MessagingEvent {
  const MessagingConnected();
}

class MessagingDisconnected extends MessagingEvent {
  const MessagingDisconnected();
}

class MessagingReconnect extends MessagingEvent {
  const MessagingReconnect();
}

/// Clear messages for a chat
class MessagingClearChat extends MessagingEvent {
  final String chatId;

  const MessagingClearChat({
    required this.chatId,
  });

  @override
  List<Object?> get props => [chatId];
}

/// Clear all messages
class MessagingClearAll extends MessagingEvent {
  const MessagingClearAll();
}

/// Refresh messages for a chat
class MessagingRefreshChat extends MessagingEvent {
  final String chatId;

  const MessagingRefreshChat({
    required this.chatId,
  });

  @override
  List<Object?> get props => [chatId];
}

/// Clear error state
class MessagingClearError extends MessagingEvent {
  const MessagingClearError();
}