import 'dart:convert';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/api_response.dart';
import 'api_client.dart';

/// Signal Protocol client for Flutter
/// This is a simplified implementation that interfaces with our backend
class SignalService {
  static const String _identityKeyKey = 'signal_identity_key';
  static const String _registrationIdKey = 'signal_registration_id';
  static const String _preKeysKey = 'signal_prekeys';

  late final ApiClient _apiClient;
  late final FlutterSecureStorage _secureStorage;

  // Singleton pattern
  static final SignalService _instance = SignalService._internal();
  factory SignalService() => _instance;

  SignalService._internal() {
    _apiClient = ApiClient();
    _secureStorage = const FlutterSecureStorage();
  }

  /// Initialize Signal Protocol for current user
  Future<ApiResponse<Map<String, dynamic>>> initializeSignalProtocol({
    int deviceId = 1,
  }) async {
    try {
      final response = await _apiClient.post<Map<String, dynamic>>(
        '/signal/init',
        data: {'deviceId': deviceId},
        fromJson: (json) => json as Map<String, dynamic>,
      );

      // Store identity information locally
      if (response.success && response.data != null) {
        final identity = response.data!['identity'] as Map<String, dynamic>;
        await _storeIdentityInfo(identity);
      }

      return response;
    } catch (e) {
      rethrow;
    }
  }

  /// Generate prekeys
  Future<ApiResponse<void>> generatePreKeys({
    int deviceId = 1,
    int count = 100,
  }) async {
    return await _apiClient.post<void>(
      '/signal/prekeys',
      data: {
        'deviceId': deviceId,
        'count': count,
      },
    );
  }

  /// Get own prekey bundle
  Future<ApiResponse<Map<String, dynamic>>> getOwnPreKeyBundle({
    int deviceId = 1,
  }) async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/signal/prekeys/my',
      queryParameters: {'deviceId': deviceId},
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Get another user's prekey bundle
  Future<ApiResponse<Map<String, dynamic>>> getUserPreKeyBundle({
    required String userId,
    int deviceId = 1,
  }) async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/signal/prekeys/$userId',
      queryParameters: {'deviceId': deviceId},
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Rotate signed prekey
  Future<ApiResponse<void>> rotateSignedPreKey({
    int deviceId = 1,
  }) async {
    return await _apiClient.post<void>(
      '/signal/signed-prekey/rotate',
      data: {'deviceId': deviceId},
    );
  }

  /// Get user sessions
  Future<ApiResponse<Map<String, dynamic>>> getUserSessions() async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/signal/sessions',
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Generate safety number (fingerprint) for verification
  Future<ApiResponse<Map<String, dynamic>>> generateFingerprint({
    required String remoteUserId,
  }) async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/signal/fingerprint/$remoteUserId',
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Encrypt message using Signal Protocol
  Future<ApiResponse<Map<String, dynamic>>> encryptMessage({
    String? recipientId,
    String? groupId,
    required String message,
    int deviceId = 1,
  }) async {
    final data = <String, dynamic>{
      'message': message,
      'deviceId': deviceId,
    };

    if (recipientId != null) data['recipientId'] = recipientId;
    if (groupId != null) data['groupId'] = groupId;

    return await _apiClient.post<Map<String, dynamic>>(
      '/signal/encrypt',
      data: data,
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Verify safety numbers
  Future<ApiResponse<Map<String, dynamic>>> verifySafetyNumbers({
    required String remoteUserId,
    required String fingerprint,
  }) async {
    return await _apiClient.post<Map<String, dynamic>>(
      '/signal/verify/$remoteUserId',
      data: {'fingerprint': fingerprint},
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Get Signal Protocol health status
  Future<ApiResponse<Map<String, dynamic>>> getSignalHealth() async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/signal/health',
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Store identity information locally
  Future<void> _storeIdentityInfo(Map<String, dynamic> identity) async {
    await _secureStorage.write(
      key: _identityKeyKey,
      value: identity['identityKey'] as String,
    );
    await _secureStorage.write(
      key: _registrationIdKey,
      value: identity['registrationId'].toString(),
    );
  }

  /// Get stored identity key
  Future<String?> getStoredIdentityKey() async {
    return await _secureStorage.read(key: _identityKeyKey);
  }

  /// Get stored registration ID
  Future<String?> getStoredRegistrationId() async {
    return await _secureStorage.read(key: _registrationIdKey);
  }

  /// Check if Signal Protocol is initialized
  Future<bool> isSignalInitialized() async {
    final identityKey = await getStoredIdentityKey();
    final registrationId = await getStoredRegistrationId();
    return identityKey != null && registrationId != null;
  }

  /// Clear all Signal Protocol data
  Future<void> clearSignalData() async {
    await _secureStorage.delete(key: _identityKeyKey);
    await _secureStorage.delete(key: _registrationIdKey);
    await _secureStorage.delete(key: _preKeysKey);
  }

  /// Local encryption for offline messages (fallback)
  Future<String> encryptMessageLocally({
    required String message,
    required String key,
  }) async {
    try {
      final keyBytes = base64.decode(key);
      final encrypter = Encrypter(AES(Key(keyBytes)));
      final iv = IV.fromSecureRandom(16);
      
      final encrypted = encrypter.encrypt(message, iv: iv);
      
      // Combine IV and encrypted data
      final combined = iv.bytes + encrypted.bytes;
      return base64.encode(combined);
    } catch (e) {
      throw Exception('Failed to encrypt message locally: $e');
    }
  }

  /// Local decryption for offline messages (fallback)
  Future<String> decryptMessageLocally({
    required String encryptedMessage,
    required String key,
  }) async {
    try {
      final keyBytes = base64.decode(key);
      final encrypter = Encrypter(AES(Key(keyBytes)));
      
      final combinedBytes = base64.decode(encryptedMessage);
      
      // Extract IV and encrypted data
      final iv = IV(Uint8List.fromList(combinedBytes.take(16).toList()));
      final encryptedData = Uint8List.fromList(combinedBytes.skip(16).toList());
      
      final encrypted = Encrypted(encryptedData);
      return encrypter.decrypt(encrypted, iv: iv);
    } catch (e) {
      throw Exception('Failed to decrypt message locally: $e');
    }
  }

  /// Generate a random encryption key
  String generateEncryptionKey() {
    final key = Key.fromSecureRandom(32);
    return base64.encode(key.bytes);
  }

  /// Generate message hash for integrity verification
  String generateMessageHash(String message) {
    final bytes = utf8.encode(message);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  /// Verify message integrity
  bool verifyMessageIntegrity(String message, String hash) {
    final calculatedHash = generateMessageHash(message);
    return calculatedHash == hash;
  }

  /// Get conversation security status
  Future<ConversationSecurity> getConversationSecurity({
    required String chatId,
  }) async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        '/secure-messages/security/$chatId',
        fromJson: (json) => json as Map<String, dynamic>,
      );

      if (response.success && response.data != null) {
        final securityData = response.data!['securityStatus'] as Map<String, dynamic>;
        return ConversationSecurity.fromJson(securityData);
      }

      return const ConversationSecurity(
        isSecure: false,
        encryptionProtocol: 'none',
        isVerified: false,
      );
    } catch (e) {
      return const ConversationSecurity(
        isSecure: false,
        encryptionProtocol: 'none',
        isVerified: false,
      );
    }
  }

  /// Initialize group session for group messaging
  Future<ApiResponse<Map<String, dynamic>>> initializeGroupSession({
    required String groupId,
    required List<String> memberIds,
  }) async {
    return await _apiClient.post<Map<String, dynamic>>(
      '/signal/group/init',
      data: {
        'groupId': groupId,
        'memberIds': memberIds,
      },
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Add member to group session
  Future<ApiResponse<void>> addMemberToGroupSession({
    required String groupId,
    required String userId,
  }) async {
    return await _apiClient.post<void>(
      '/signal/group/$groupId/add-member',
      data: {'userId': userId},
    );
  }

  /// Remove member from group session
  Future<ApiResponse<void>> removeMemberFromGroupSession({
    required String groupId,
    required String userId,
  }) async {
    return await _apiClient.post<void>(
      '/signal/group/$groupId/remove-member',
      data: {'userId': userId},
    );
  }
}

/// Conversation security status model
class ConversationSecurity {
  final bool isSecure;
  final String encryptionProtocol;
  final bool isVerified;
  final String? fingerprint;
  final DateTime? lastVerified;

  const ConversationSecurity({
    required this.isSecure,
    required this.encryptionProtocol,
    required this.isVerified,
    this.fingerprint,
    this.lastVerified,
  });

  factory ConversationSecurity.fromJson(Map<String, dynamic> json) {
    return ConversationSecurity(
      isSecure: json['isSecure'] as bool? ?? false,
      encryptionProtocol: json['encryptionProtocol'] as String? ?? 'none',
      isVerified: json['isVerified'] as bool? ?? false,
      fingerprint: json['fingerprint'] as String?,
      lastVerified: json['lastVerified'] != null 
          ? DateTime.parse(json['lastVerified'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'isSecure': isSecure,
      'encryptionProtocol': encryptionProtocol,
      'isVerified': isVerified,
      if (fingerprint != null) 'fingerprint': fingerprint,
      if (lastVerified != null) 'lastVerified': lastVerified!.toIso8601String(),
    };
  }
}

/// Signal Protocol initialization status
enum SignalInitStatus {
  notInitialized,
  initializing,
  initialized,
  error,
}

/// Signal Protocol client state
class SignalClientState {
  final SignalInitStatus status;
  final String? identityKey;
  final String? registrationId;
  final String? error;

  const SignalClientState({
    required this.status,
    this.identityKey,
    this.registrationId,
    this.error,
  });

  const SignalClientState.notInitialized()
      : this(status: SignalInitStatus.notInitialized);

  const SignalClientState.initializing()
      : this(status: SignalInitStatus.initializing);

  const SignalClientState.initialized({
    required String identityKey,
    required String registrationId,
  }) : this(
          status: SignalInitStatus.initialized,
          identityKey: identityKey,
          registrationId: registrationId,
        );

  const SignalClientState.error(String error)
      : this(status: SignalInitStatus.error, error: error);

  bool get isInitialized => status == SignalInitStatus.initialized;
  bool get isInitializing => status == SignalInitStatus.initializing;
  bool get hasError => status == SignalInitStatus.error;
}