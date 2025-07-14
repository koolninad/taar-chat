import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/status.dart' as status;
import '../models/api_response.dart';
import 'auth_service.dart';
import '../../core/constants/app_constants.dart';

/// WebSocket message types
enum WebSocketMessageType {
  message,
  messageRead,
  messageDelivered,
  userOnline,
  userOffline,
  typing,
  stopTyping,
  groupMessage,
  groupMemberAdded,
  groupMemberRemoved,
  connectionAck,
  error,
}

/// WebSocket message model
class WebSocketMessage {
  final WebSocketMessageType type;
  final Map<String, dynamic> data;
  final String? userId;
  final String? chatId;
  final DateTime timestamp;

  WebSocketMessage({
    required this.type,
    required this.data,
    this.userId,
    this.chatId,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  factory WebSocketMessage.fromJson(Map<String, dynamic> json) {
    return WebSocketMessage(
      type: _parseMessageType(json['type'] as String),
      data: json['data'] as Map<String, dynamic>? ?? {},
      userId: json['userId'] as String?,
      chatId: json['chatId'] as String?,
      timestamp: DateTime.parse(json['timestamp'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type.name,
      'data': data,
      if (userId != null) 'userId': userId,
      if (chatId != null) 'chatId': chatId,
      'timestamp': timestamp.toIso8601String(),
    };
  }

  static WebSocketMessageType _parseMessageType(String type) {
    return WebSocketMessageType.values.firstWhere(
      (e) => e.name == type,
      orElse: () => WebSocketMessageType.error,
    );
  }
}

/// WebSocket connection state
enum WebSocketState {
  disconnected,
  connecting,
  connected,
  reconnecting,
  error,
}

/// WebSocket service for real-time communication
class WebSocketService {
  static String get _wsUrl => AppConstants.webSocketUrl;
  static const int _reconnectDelay = 3000; // 3 seconds
  static const int _maxReconnectAttempts = 5;
  static const int _heartbeatInterval = 30000; // 30 seconds

  WebSocketChannel? _channel;
  StreamSubscription? _messageSubscription;
  Timer? _reconnectTimer;
  Timer? _heartbeatTimer;

  int _reconnectAttempts = 0;
  WebSocketState _state = WebSocketState.disconnected;
  
  late final AuthService _authService;

  // Event streams
  final _stateController = StreamController<WebSocketState>.broadcast();
  final _messageController = StreamController<WebSocketMessage>.broadcast();
  final _errorController = StreamController<String>.broadcast();

  // Singleton pattern
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;

  WebSocketService._internal() {
    _authService = AuthService();
  }

  /// Stream of connection state changes
  Stream<WebSocketState> get stateStream => _stateController.stream;

  /// Stream of incoming messages
  Stream<WebSocketMessage> get messageStream => _messageController.stream;

  /// Stream of errors
  Stream<String> get errorStream => _errorController.stream;

  /// Current connection state
  WebSocketState get state => _state;

  /// Whether the socket is connected
  bool get isConnected => _state == WebSocketState.connected;

  /// Connect to WebSocket server
  Future<void> connect() async {
    if (_state == WebSocketState.connecting || _state == WebSocketState.connected) {
      return;
    }

    _updateState(WebSocketState.connecting);

    try {
      // Get authentication token
      final token = await _authService.getAccessToken();
      if (token == null) {
        throw Exception('No authentication token available');
      }

      // Create WebSocket connection with auth token
      final uri = Uri.parse('$_wsUrl?token=$token');
      _channel = WebSocketChannel.connect(uri);

      // Listen for messages
      _messageSubscription = _channel!.stream.listen(
        _handleMessage,
        onError: _handleError,
        onDone: _handleDisconnection,
        cancelOnError: false,
      );

      // Start heartbeat
      _startHeartbeat();

      _updateState(WebSocketState.connected);
      _reconnectAttempts = 0;

      print('📡 WebSocket connected successfully');
    } catch (e) {
      _updateState(WebSocketState.error);
      _errorController.add('Failed to connect: $e');
      
      // Schedule reconnection
      _scheduleReconnect();
    }
  }

  /// Disconnect from WebSocket server
  Future<void> disconnect() async {
    _reconnectTimer?.cancel();
    _heartbeatTimer?.cancel();
    
    await _messageSubscription?.cancel();
    await _channel?.sink.close(status.goingAway);
    
    _channel = null;
    _messageSubscription = null;
    
    _updateState(WebSocketState.disconnected);
    print('📡 WebSocket disconnected');
  }

  /// Send message through WebSocket
  void sendMessage(WebSocketMessage message) {
    if (!isConnected) {
      _errorController.add('Cannot send message: WebSocket not connected');
      return;
    }

    try {
      final messageJson = jsonEncode(message.toJson());
      _channel?.sink.add(messageJson);
    } catch (e) {
      _errorController.add('Failed to send message: $e');
    }
  }

  /// Send a chat message
  void sendChatMessage({
    required String recipientId,
    required String content,
    String messageType = 'TEXT',
    String? mediaFileId,
  }) {
    final message = WebSocketMessage(
      type: WebSocketMessageType.message,
      chatId: recipientId,
      data: {
        'recipientId': recipientId,
        'content': content,
        'messageType': messageType,
        if (mediaFileId != null) 'mediaFileId': mediaFileId,
      },
    );

    sendMessage(message);
  }

  /// Send a group message
  void sendGroupMessage({
    required String groupId,
    required String content,
    String messageType = 'TEXT',
    String? mediaFileId,
  }) {
    final message = WebSocketMessage(
      type: WebSocketMessageType.groupMessage,
      chatId: groupId,
      data: {
        'groupId': groupId,
        'content': content,
        'messageType': messageType,
        if (mediaFileId != null) 'mediaFileId': mediaFileId,
      },
    );

    sendMessage(message);
  }

  /// Mark message as read
  void markMessageAsRead({
    required String messageId,
    required String senderId,
  }) {
    final message = WebSocketMessage(
      type: WebSocketMessageType.messageRead,
      data: {
        'messageId': messageId,
        'senderId': senderId,
      },
    );

    sendMessage(message);
  }

  /// Send typing indicator
  void sendTyping({
    required String chatId,
    bool isGroup = false,
  }) {
    final message = WebSocketMessage(
      type: WebSocketMessageType.typing,
      chatId: chatId,
      data: {
        'chatId': chatId,
        'isGroup': isGroup,
      },
    );

    sendMessage(message);
  }

  /// Stop typing indicator
  void stopTyping({
    required String chatId,
    bool isGroup = false,
  }) {
    final message = WebSocketMessage(
      type: WebSocketMessageType.stopTyping,
      chatId: chatId,
      data: {
        'chatId': chatId,
        'isGroup': isGroup,
      },
    );

    sendMessage(message);
  }

  /// Handle incoming messages
  void _handleMessage(dynamic data) {
    try {
      final messageData = jsonDecode(data as String) as Map<String, dynamic>;
      final message = WebSocketMessage.fromJson(messageData);
      
      // Handle special message types
      switch (message.type) {
        case WebSocketMessageType.connectionAck:
          print('📡 WebSocket connection acknowledged');
          break;
          
        case WebSocketMessageType.error:
          _errorController.add(message.data['message'] as String? ?? 'Unknown error');
          break;
          
        default:
          _messageController.add(message);
      }
    } catch (e) {
      _errorController.add('Failed to parse message: $e');
    }
  }

  /// Handle connection errors
  void _handleError(dynamic error) {
    print('📡 WebSocket error: $error');
    _updateState(WebSocketState.error);
    _errorController.add(error.toString());
    _scheduleReconnect();
  }

  /// Handle connection closure
  void _handleDisconnection() {
    print('📡 WebSocket disconnected');
    _updateState(WebSocketState.disconnected);
    _scheduleReconnect();
  }

  /// Schedule automatic reconnection
  void _scheduleReconnect() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      print('📡 Max reconnection attempts reached');
      _updateState(WebSocketState.error);
      return;
    }

    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(milliseconds: _reconnectDelay), () {
      if (_state != WebSocketState.connected) {
        _reconnectAttempts++;
        print('📡 Attempting to reconnect... (${_reconnectAttempts}/$_maxReconnectAttempts)');
        _updateState(WebSocketState.reconnecting);
        connect();
      }
    });
  }

  /// Start heartbeat to keep connection alive
  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(
      Duration(milliseconds: _heartbeatInterval),
      (timer) {
        if (isConnected) {
          _channel?.sink.add(jsonEncode({'type': 'ping'}));
        } else {
          timer.cancel();
        }
      },
    );
  }

  /// Update connection state and notify listeners
  void _updateState(WebSocketState newState) {
    if (_state != newState) {
      _state = newState;
      _stateController.add(newState);
    }
  }

  /// Get filtered message stream for specific chat
  Stream<WebSocketMessage> getChatMessages(String chatId) {
    return messageStream.where((message) => message.chatId == chatId);
  }

  /// Get filtered message stream by type
  Stream<WebSocketMessage> getMessagesByType(WebSocketMessageType type) {
    return messageStream.where((message) => message.type == type);
  }

  /// Dispose of all resources
  void dispose() {
    disconnect();
    _stateController.close();
    _messageController.close();
    _errorController.close();
  }
}