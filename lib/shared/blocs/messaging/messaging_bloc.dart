import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../services/message_service.dart';
import '../../services/websocket_service.dart';
import '../../services/signal_service.dart';
import '../../models/api_response.dart';
import 'messaging_event.dart';
import 'messaging_state.dart';

class MessagingBloc extends Bloc<MessagingEvent, MessagingState> {
  final MessageService _messageService;
  final WebSocketService _webSocketService;
  final SignalService _signalService;
  
  StreamSubscription? _messageSubscription;
  StreamSubscription? _typingSubscription;
  StreamSubscription? _connectionSubscription;

  // State management
  Map<String, List<MessageModel>> _conversations = {};
  Map<String, bool> _isLoadingMore = {};
  Map<String, bool> _hasMoreMessages = {};
  Map<String, int> _currentPages = {};

  MessagingBloc({
    MessageService? messageService,
    WebSocketService? webSocketService,
    SignalService? signalService,
  })  : _messageService = messageService ?? MessageService(),
        _webSocketService = webSocketService ?? WebSocketService(),
        _signalService = signalService ?? SignalService(),
        super(const MessagingInitial()) {
    
    on<MessagingInitialize>(_onInitialize);
    on<MessagingLoadMessages>(_onLoadMessages);
    on<MessagingLoadMoreMessages>(_onLoadMoreMessages);
    on<MessagingSendMessage>(_onSendMessage);
    on<MessagingMessageReceived>(_onMessageReceived);
    on<MessagingEditMessage>(_onEditMessage);
    on<MessagingDeleteMessage>(_onDeleteMessage);
    on<MessagingReactToMessage>(_onReactToMessage);
    on<MessagingRemoveReaction>(_onRemoveReaction);
    on<MessagingForwardMessage>(_onForwardMessage);
    on<MessagingToggleStarMessage>(_onToggleStarMessage);
    on<MessagingSearchMessages>(_onSearchMessages);
    on<MessagingDecryptMessage>(_onDecryptMessage);
    on<MessagingBatchDecryptMessages>(_onBatchDecryptMessages);
    on<MessagingGetSecurityStatus>(_onGetSecurityStatus);
    on<MessagingStartTyping>(_onStartTyping);
    on<MessagingStopTyping>(_onStopTyping);
    on<MessagingTypingReceived>(_onTypingReceived);
    on<MessagingConnected>(_onConnected);
    on<MessagingDisconnected>(_onDisconnected);
    on<MessagingReconnect>(_onReconnect);
    on<MessagingClearChat>(_onClearChat);
    on<MessagingClearAll>(_onClearAll);
    on<MessagingRefreshChat>(_onRefreshChat);
    on<MessagingClearError>(_onClearError);
  }

  Future<void> _onInitialize(
    MessagingInitialize event,
    Emitter<MessagingState> emit,
  ) async {
    try {
      // Initialize WebSocket connection
      await _webSocketService.connect();

      // Set up message stream listener
      _messageSubscription = _webSocketService.messageStream.listen((message) {
        if (message.type == WebSocketMessageType.message) {
          add(MessagingMessageReceived(messageData: message.data));
        } else if (message.type == WebSocketMessageType.typing) {
          add(MessagingTypingReceived(
            chatId: message.chatId ?? '',
            userId: message.data['userId'] ?? '',
            isTyping: message.data['isTyping'] ?? false,
          ));
        }
      });

      // Set up connection status listener
      _connectionSubscription = _webSocketService.connectionStream.listen((isConnected) {
        if (isConnected) {
          add(const MessagingConnected());
        } else {
          add(const MessagingDisconnected());
        }
      });

      emit(MessagingLoaded(
        conversations: _conversations,
        isLoadingMore: _isLoadingMore,
        hasMoreMessages: _hasMoreMessages,
      ));
    } catch (e) {
      emit(MessagingError(
        message: 'Failed to initialize messaging: ${e.toString()}',
      ));
    }
  }

  Future<void> _onLoadMessages(
    MessagingLoadMessages event,
    Emitter<MessagingState> emit,
  ) async {
    emit(MessagingLoadingMessages(chatId: event.chatId));

    try {
      final response = await _messageService.getChatMessages(
        chatId: event.chatId,
        page: event.page,
        limit: event.limit,
      );

      if (response.success && response.data != null) {
        final paginatedResponse = response.data!;
        final messages = paginatedResponse.data;

        _conversations[event.chatId] = messages;
        _currentPages[event.chatId] = event.page;
        _hasMoreMessages[event.chatId] = paginatedResponse.hasNextPage;
        _isLoadingMore[event.chatId] = false;

        emit(MessagingLoaded(
          conversations: Map.from(_conversations),
          isLoadingMore: Map.from(_isLoadingMore),
          hasMoreMessages: Map.from(_hasMoreMessages),
        ));
      } else {
        emit(MessagingError(
          message: response.message ?? 'Failed to load messages',
          code: response.error?.code,
          chatId: event.chatId,
        ));
      }
    } catch (e) {
      emit(MessagingError(
        message: 'Failed to load messages: ${e.toString()}',
        chatId: event.chatId,
      ));
    }
  }

  Future<void> _onLoadMoreMessages(
    MessagingLoadMoreMessages event,
    Emitter<MessagingState> emit,
  ) async {
    if (_isLoadingMore[event.chatId] == true || 
        _hasMoreMessages[event.chatId] == false) {
      return;
    }

    _isLoadingMore[event.chatId] = true;
    
    emit(MessagingLoaded(
      conversations: Map.from(_conversations),
      isLoadingMore: Map.from(_isLoadingMore),
      hasMoreMessages: Map.from(_hasMoreMessages),
    ));

    try {
      final currentPage = _currentPages[event.chatId] ?? 1;
      final nextPage = currentPage + 1;

      final response = await _messageService.getChatMessages(
        chatId: event.chatId,
        page: nextPage,
        limit: 20,
      );

      if (response.success && response.data != null) {
        final paginatedResponse = response.data!;
        final newMessages = paginatedResponse.data;

        // Append new messages to existing ones
        final existingMessages = _conversations[event.chatId] ?? [];
        _conversations[event.chatId] = [...existingMessages, ...newMessages];
        _currentPages[event.chatId] = nextPage;
        _hasMoreMessages[event.chatId] = paginatedResponse.hasNextPage;
      }
    } catch (e) {
      emit(MessagingError(
        message: 'Failed to load more messages: ${e.toString()}',
        chatId: event.chatId,
      ));
    } finally {
      _isLoadingMore[event.chatId] = false;
      
      emit(MessagingLoaded(
        conversations: Map.from(_conversations),
        isLoadingMore: Map.from(_isLoadingMore),
        hasMoreMessages: Map.from(_hasMoreMessages),
      ));
    }
  }

  Future<void> _onSendMessage(
    MessagingSendMessage event,
    Emitter<MessagingState> emit,
  ) async {
    emit(MessagingSendingMessage(tempMessageId: event.tempMessageId));

    try {
      final response = await _messageService.sendSecureMessage(
        recipientId: event.recipientId,
        groupId: event.groupId,
        message: event.message,
        messageType: event.messageType,
        mediaFileId: event.mediaFileId,
      );

      if (response.success && response.data != null) {
        final message = response.data!;
        
        // Add message to local state
        final chatId = event.recipientId ?? event.groupId!;
        final existingMessages = _conversations[chatId] ?? [];
        _conversations[chatId] = [message, ...existingMessages];

        emit(MessagingMessageSent(message: message));
        
        emit(MessagingLoaded(
          conversations: Map.from(_conversations),
          isLoadingMore: Map.from(_isLoadingMore),
          hasMoreMessages: Map.from(_hasMoreMessages),
        ));
      } else {
        emit(MessagingSendError(
          message: response.message ?? 'Failed to send message',
          tempMessageId: event.tempMessageId,
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(MessagingSendError(
        message: 'Failed to send message: ${e.toString()}',
        tempMessageId: event.tempMessageId,
      ));
    }
  }

  Future<void> _onMessageReceived(
    MessagingMessageReceived event,
    Emitter<MessagingState> emit,
  ) async {
    try {
      final messageData = event.messageData;
      final message = MessageModel.fromJson(messageData);
      
      // Determine chat ID
      final chatId = message.groupId ?? message.senderId;
      
      // Add message to local state
      final existingMessages = _conversations[chatId] ?? [];
      _conversations[chatId] = [message, ...existingMessages];

      emit(MessagingMessageReceived(message: message));
      
      emit(MessagingLoaded(
        conversations: Map.from(_conversations),
        isLoadingMore: Map.from(_isLoadingMore),
        hasMoreMessages: Map.from(_hasMoreMessages),
      ));
    } catch (e) {
      emit(MessagingError(
        message: 'Failed to process received message: ${e.toString()}',
      ));
    }
  }

  Future<void> _onEditMessage(
    MessagingEditMessage event,
    Emitter<MessagingState> emit,
  ) async {
    try {
      final response = await _messageService.editMessage(
        messageId: event.messageId,
        newContent: event.newContent,
      );

      if (response.success && response.data != null) {
        final updatedMessage = response.data!;
        
        // Update message in local state
        _updateMessageInConversations(updatedMessage);

        emit(MessagingMessageUpdated(message: updatedMessage));
        
        emit(MessagingLoaded(
          conversations: Map.from(_conversations),
          isLoadingMore: Map.from(_isLoadingMore),
          hasMoreMessages: Map.from(_hasMoreMessages),
        ));
      } else {
        emit(MessagingError(
          message: response.message ?? 'Failed to edit message',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(MessagingError(
        message: 'Failed to edit message: ${e.toString()}',
      ));
    }
  }

  Future<void> _onDeleteMessage(
    MessagingDeleteMessage event,
    Emitter<MessagingState> emit,
  ) async {
    try {
      final response = await _messageService.deleteMessage(
        messageId: event.messageId,
        deleteForEveryone: event.deleteForEveryone,
      );

      if (response.success) {
        // Remove message from local state
        final chatId = _removeMessageFromConversations(event.messageId);
        
        emit(MessagingMessageDeleted(
          messageId: event.messageId,
          chatId: chatId ?? '',
        ));
        
        emit(MessagingLoaded(
          conversations: Map.from(_conversations),
          isLoadingMore: Map.from(_isLoadingMore),
          hasMoreMessages: Map.from(_hasMoreMessages),
        ));
      } else {
        emit(MessagingError(
          message: response.message ?? 'Failed to delete message',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(MessagingError(
        message: 'Failed to delete message: ${e.toString()}',
      ));
    }
  }

  Future<void> _onReactToMessage(
    MessagingReactToMessage event,
    Emitter<MessagingState> emit,
  ) async {
    try {
      final response = await _messageService.reactToMessage(
        messageId: event.messageId,
        reaction: event.reaction,
      );

      if (!response.success) {
        emit(MessagingError(
          message: response.message ?? 'Failed to react to message',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(MessagingError(
        message: 'Failed to react to message: ${e.toString()}',
      ));
    }
  }

  Future<void> _onRemoveReaction(
    MessagingRemoveReaction event,
    Emitter<MessagingState> emit,
  ) async {
    try {
      final response = await _messageService.removeReaction(
        messageId: event.messageId,
      );

      if (!response.success) {
        emit(MessagingError(
          message: response.message ?? 'Failed to remove reaction',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(MessagingError(
        message: 'Failed to remove reaction: ${e.toString()}',
      ));
    }
  }

  Future<void> _onForwardMessage(
    MessagingForwardMessage event,
    Emitter<MessagingState> emit,
  ) async {
    try {
      final response = await _messageService.forwardMessage(
        messageId: event.messageId,
        recipientId: event.recipientId,
        groupId: event.groupId,
      );

      if (response.success && response.data != null) {
        final message = response.data!;
        
        // Add forwarded message to local state
        final chatId = event.recipientId ?? event.groupId!;
        final existingMessages = _conversations[chatId] ?? [];
        _conversations[chatId] = [message, ...existingMessages];

        emit(MessagingMessageSent(message: message));
        
        emit(MessagingLoaded(
          conversations: Map.from(_conversations),
          isLoadingMore: Map.from(_isLoadingMore),
          hasMoreMessages: Map.from(_hasMoreMessages),
        ));
      } else {
        emit(MessagingError(
          message: response.message ?? 'Failed to forward message',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(MessagingError(
        message: 'Failed to forward message: ${e.toString()}',
      ));
    }
  }

  Future<void> _onToggleStarMessage(
    MessagingToggleStarMessage event,
    Emitter<MessagingState> emit,
  ) async {
    try {
      final response = await _messageService.toggleStarMessage(
        messageId: event.messageId,
        isStarred: event.isStarred,
      );

      if (!response.success) {
        emit(MessagingError(
          message: response.message ?? 'Failed to star/unstar message',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(MessagingError(
        message: 'Failed to star/unstar message: ${e.toString()}',
      ));
    }
  }

  Future<void> _onSearchMessages(
    MessagingSearchMessages event,
    Emitter<MessagingState> emit,
  ) async {
    try {
      final response = await _messageService.searchMessages(
        query: event.query,
        chatId: event.chatId,
        page: event.page,
        limit: event.limit,
      );

      if (response.success && response.data != null) {
        final paginatedResponse = response.data!;
        
        emit(MessagingSearchResults(
          query: event.query,
          results: paginatedResponse.data,
          isLoading: false,
          hasMore: paginatedResponse.hasNextPage,
        ));
      } else {
        emit(MessagingError(
          message: response.message ?? 'Search failed',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(MessagingError(
        message: 'Search failed: ${e.toString()}',
      ));
    }
  }

  Future<void> _onDecryptMessage(
    MessagingDecryptMessage event,
    Emitter<MessagingState> emit,
  ) async {
    try {
      final response = await _messageService.decryptMessage(
        messageId: event.messageId,
      );

      if (!response.success) {
        emit(MessagingDecryptError(
          message: response.message ?? 'Failed to decrypt message',
          messageId: event.messageId,
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(MessagingDecryptError(
        message: 'Failed to decrypt message: ${e.toString()}',
        messageId: event.messageId,
      ));
    }
  }

  Future<void> _onBatchDecryptMessages(
    MessagingBatchDecryptMessages event,
    Emitter<MessagingState> emit,
  ) async {
    try {
      final response = await _messageService.batchDecryptMessages(
        messageIds: event.messageIds,
      );

      if (!response.success) {
        emit(MessagingError(
          message: response.message ?? 'Failed to decrypt messages',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(MessagingError(
        message: 'Failed to decrypt messages: ${e.toString()}',
      ));
    }
  }

  Future<void> _onGetSecurityStatus(
    MessagingGetSecurityStatus event,
    Emitter<MessagingState> emit,
  ) async {
    try {
      final response = await _signalService.getConversationSecurity(
        chatId: event.chatId,
      );

      emit(MessagingSecurityStatus(
        chatId: event.chatId,
        isSecure: response.isSecure,
        encryptionProtocol: response.encryptionProtocol,
        isVerified: response.isVerified,
      ));
    } catch (e) {
      emit(MessagingError(
        message: 'Failed to get security status: ${e.toString()}',
        chatId: event.chatId,
      ));
    }
  }

  Future<void> _onStartTyping(
    MessagingStartTyping event,
    Emitter<MessagingState> emit,
  ) async {
    _webSocketService.sendTypingIndicator(
      chatId: event.chatId,
      isTyping: true,
    );
  }

  Future<void> _onStopTyping(
    MessagingStopTyping event,
    Emitter<MessagingState> emit,
  ) async {
    _webSocketService.sendTypingIndicator(
      chatId: event.chatId,
      isTyping: false,
    );
  }

  Future<void> _onTypingReceived(
    MessagingTypingReceived event,
    Emitter<MessagingState> emit,
  ) async {
    emit(MessagingTypingIndicator(
      chatId: event.chatId,
      userId: event.userId,
      isTyping: event.isTyping,
    ));
  }

  Future<void> _onConnected(
    MessagingConnected event,
    Emitter<MessagingState> emit,
  ) async {
    emit(const MessagingConnectionStatus(
      isConnected: true,
      lastConnected: null,
    ));
  }

  Future<void> _onDisconnected(
    MessagingDisconnected event,
    Emitter<MessagingState> emit,
  ) async {
    emit(MessagingConnectionStatus(
      isConnected: false,
      lastConnected: DateTime.now(),
    ));
  }

  Future<void> _onReconnect(
    MessagingReconnect event,
    Emitter<MessagingState> emit,
  ) async {
    try {
      await _webSocketService.connect();
    } catch (e) {
      emit(MessagingError(
        message: 'Failed to reconnect: ${e.toString()}',
      ));
    }
  }

  Future<void> _onClearChat(
    MessagingClearChat event,
    Emitter<MessagingState> emit,
  ) async {
    _conversations.remove(event.chatId);
    _isLoadingMore.remove(event.chatId);
    _hasMoreMessages.remove(event.chatId);
    _currentPages.remove(event.chatId);

    emit(MessagingLoaded(
      conversations: Map.from(_conversations),
      isLoadingMore: Map.from(_isLoadingMore),
      hasMoreMessages: Map.from(_hasMoreMessages),
    ));
  }

  Future<void> _onClearAll(
    MessagingClearAll event,
    Emitter<MessagingState> emit,
  ) async {
    _conversations.clear();
    _isLoadingMore.clear();
    _hasMoreMessages.clear();
    _currentPages.clear();

    emit(MessagingLoaded(
      conversations: Map.from(_conversations),
      isLoadingMore: Map.from(_isLoadingMore),
      hasMoreMessages: Map.from(_hasMoreMessages),
    ));
  }

  Future<void> _onRefreshChat(
    MessagingRefreshChat event,
    Emitter<MessagingState> emit,
  ) async {
    add(MessagingLoadMessages(chatId: event.chatId));
  }

  Future<void> _onClearError(
    MessagingClearError event,
    Emitter<MessagingState> emit,
  ) async {
    if (state is MessagingError || 
        state is MessagingSendError || 
        state is MessagingDecryptError) {
      emit(MessagingLoaded(
        conversations: Map.from(_conversations),
        isLoadingMore: Map.from(_isLoadingMore),
        hasMoreMessages: Map.from(_hasMoreMessages),
      ));
    }
  }

  /// Helper methods
  void _updateMessageInConversations(MessageModel updatedMessage) {
    for (final chatId in _conversations.keys) {
      final messages = _conversations[chatId]!;
      final index = messages.indexWhere((m) => m.id == updatedMessage.id);
      if (index != -1) {
        messages[index] = updatedMessage;
        break;
      }
    }
  }

  String? _removeMessageFromConversations(String messageId) {
    for (final chatId in _conversations.keys) {
      final messages = _conversations[chatId]!;
      final removed = messages.removeWhere((m) => m.id == messageId);
      if (removed > 0) {
        return chatId;
      }
    }
    return null;
  }

  /// Get messages for a specific chat
  List<MessageModel> getMessagesForChat(String chatId) {
    return _conversations[chatId] ?? [];
  }

  /// Check if there are more messages to load for a chat
  bool hasMoreMessagesForChat(String chatId) {
    return _hasMoreMessages[chatId] ?? false;
  }

  /// Check if currently loading more messages for a chat
  bool isLoadingMoreForChat(String chatId) {
    return _isLoadingMore[chatId] ?? false;
  }

  @override
  Future<void> close() {
    _messageSubscription?.cancel();
    _typingSubscription?.cancel();
    _connectionSubscription?.cancel();
    _webSocketService.disconnect();
    return super.close();
  }
}