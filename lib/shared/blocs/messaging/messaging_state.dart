import 'package:equatable/equatable.dart';
import '../../models/api_response.dart';

/// Messaging states
abstract class MessagingState extends Equatable {
  const MessagingState();

  @override
  List<Object?> get props => [];
}

/// Initial state
class MessagingInitial extends MessagingState {
  const MessagingInitial();
}

/// Loading states
class MessagingLoading extends MessagingState {
  const MessagingLoading();
}

class MessagingLoadingMessages extends MessagingState {
  final String chatId;

  const MessagingLoadingMessages({
    required this.chatId,
  });

  @override
  List<Object?> get props => [chatId];
}

class MessagingSendingMessage extends MessagingState {
  final String tempMessageId;

  const MessagingSendingMessage({
    required this.tempMessageId,
  });

  @override
  List<Object?> get props => [tempMessageId];
}

/// Success states
class MessagingLoaded extends MessagingState {
  final Map<String, List<MessageModel>> conversations;
  final Map<String, bool> isLoadingMore;
  final Map<String, bool> hasMoreMessages;

  const MessagingLoaded({
    required this.conversations,
    required this.isLoadingMore,
    required this.hasMoreMessages,
  });

  @override
  List<Object?> get props => [conversations, isLoadingMore, hasMoreMessages];

  MessagingLoaded copyWith({
    Map<String, List<MessageModel>>? conversations,
    Map<String, bool>? isLoadingMore,
    Map<String, bool>? hasMoreMessages,
  }) {
    return MessagingLoaded(
      conversations: conversations ?? this.conversations,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasMoreMessages: hasMoreMessages ?? this.hasMoreMessages,
    );
  }
}

class MessagingMessageSent extends MessagingState {
  final MessageModel message;

  const MessagingMessageSent({
    required this.message,
  });

  @override
  List<Object?> get props => [message];
}

class MessagingMessageReceived extends MessagingState {
  final MessageModel message;

  const MessagingMessageReceived({
    required this.message,
  });

  @override
  List<Object?> get props => [message];
}

class MessagingMessageUpdated extends MessagingState {
  final MessageModel message;

  const MessagingMessageUpdated({
    required this.message,
  });

  @override
  List<Object?> get props => [message];
}

class MessagingMessageDeleted extends MessagingState {
  final String messageId;
  final String chatId;

  const MessagingMessageDeleted({
    required this.messageId,
    required this.chatId,
  });

  @override
  List<Object?> get props => [messageId, chatId];
}

class MessagingTypingIndicator extends MessagingState {
  final String chatId;
  final String userId;
  final bool isTyping;

  const MessagingTypingIndicator({
    required this.chatId,
    required this.userId,
    required this.isTyping,
  });

  @override
  List<Object?> get props => [chatId, userId, isTyping];
}

class MessagingConnectionStatus extends MessagingState {
  final bool isConnected;
  final DateTime? lastConnected;

  const MessagingConnectionStatus({
    required this.isConnected,
    this.lastConnected,
  });

  @override
  List<Object?> get props => [isConnected, lastConnected];
}

/// Error states
class MessagingError extends MessagingState {
  final String message;
  final String? code;
  final String? chatId;

  const MessagingError({
    required this.message,
    this.code,
    this.chatId,
  });

  @override
  List<Object?> get props => [message, code, chatId];
}

class MessagingSendError extends MessagingState {
  final String message;
  final String tempMessageId;
  final String? code;

  const MessagingSendError({
    required this.message,
    required this.tempMessageId,
    this.code,
  });

  @override
  List<Object?> get props => [message, tempMessageId, code];
}

class MessagingDecryptError extends MessagingState {
  final String message;
  final String messageId;
  final String? code;

  const MessagingDecryptError({
    required this.message,
    required this.messageId,
    this.code,
  });

  @override
  List<Object?> get props => [message, messageId, code];
}

/// Security states
class MessagingSecurityStatus extends MessagingState {
  final String chatId;
  final bool isSecure;
  final String encryptionProtocol;
  final bool isVerified;

  const MessagingSecurityStatus({
    required this.chatId,
    required this.isSecure,
    required this.encryptionProtocol,
    required this.isVerified,
  });

  @override
  List<Object?> get props => [chatId, isSecure, encryptionProtocol, isVerified];
}

/// Search states
class MessagingSearchResults extends MessagingState {
  final String query;
  final List<MessageModel> results;
  final bool isLoading;
  final bool hasMore;

  const MessagingSearchResults({
    required this.query,
    required this.results,
    required this.isLoading,
    required this.hasMore,
  });

  @override
  List<Object?> get props => [query, results, isLoading, hasMore];
}