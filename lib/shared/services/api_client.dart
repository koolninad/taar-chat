import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/api_response.dart';
import 'auth_service.dart';
import '../../core/constants/app_constants.dart';

class ApiClient {
  static String get baseUrl => AppConstants.apiBaseUrl;
  static const int connectTimeout = 30000; // 30 seconds
  static const int receiveTimeout = 30000; // 30 seconds

  late final Dio _dio;
  late final FlutterSecureStorage _secureStorage;
  late final AuthService _authService;

  // Singleton pattern
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  ApiClient._internal() {
    _secureStorage = const FlutterSecureStorage();
    _authService = AuthService();
    _initializeDio();
  }

  void _initializeDio() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(milliseconds: connectTimeout),
      receiveTimeout: const Duration(milliseconds: receiveTimeout),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Add interceptors
    _dio.interceptors.add(_createAuthInterceptor());
    _dio.interceptors.add(_createLoggingInterceptor());
    _dio.interceptors.add(_createErrorInterceptor());
  }

  /// Authentication interceptor to add JWT token to requests
  Interceptor _createAuthInterceptor() {
    return InterceptorsWrapper(
      onRequest: (RequestOptions options, RequestInterceptorHandler handler) async {
        // Skip auth for login/register endpoints
        final authExcludedPaths = [
          '/auth/send-otp',
          '/auth/verify-otp',
          '/auth/refresh',
        ];

        final shouldSkipAuth = authExcludedPaths.any(
          (path) => options.path.contains(path),
        );

        if (!shouldSkipAuth) {
          final token = await _authService.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
        }

        handler.next(options);
      },
      onError: (DioException error, ErrorInterceptorHandler handler) async {
        // Handle token refresh on 401 errors
        if (error.response?.statusCode == 401) {
          try {
            final refreshed = await _authService.refreshToken();
            if (refreshed) {
              // Retry the original request with new token
              final token = await _authService.getAccessToken();
              if (token != null) {
                error.requestOptions.headers['Authorization'] = 'Bearer $token';
                final response = await _dio.fetch(error.requestOptions);
                handler.resolve(response);
                return;
              }
            }
          } catch (e) {
            // Refresh failed, logout user
            await _authService.logout();
          }
        }
        handler.next(error);
      },
    );
  }

  /// Logging interceptor for debugging
  Interceptor _createLoggingInterceptor() {
    return LogInterceptor(
      request: true,
      requestHeader: true,
      requestBody: true,
      responseHeader: false,
      responseBody: true,
      error: true,
      logPrint: (object) {
        // Only log in debug mode
        assert(() {
          print('🌐 API: $object');
          return true;
        }());
      },
    );
  }

  /// Error handling interceptor
  Interceptor _createErrorInterceptor() {
    return InterceptorsWrapper(
      onError: (DioException error, ErrorInterceptorHandler handler) {
        final apiError = _handleError(error);
        handler.reject(DioException(
          requestOptions: error.requestOptions,
          error: apiError,
          type: error.type,
          response: error.response,
        ));
      },
    );
  }

  /// Handle and transform API errors
  ApiError _handleError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const ApiError(
          message: 'Connection timeout. Please check your internet connection.',
          code: 'TIMEOUT',
        );

      case DioExceptionType.badResponse:
        final response = error.response;
        if (response != null) {
          try {
            final data = response.data;
            if (data is Map<String, dynamic>) {
              final errorData = data['error'] as Map<String, dynamic>?;
              if (errorData != null) {
                return ApiError.fromJson(errorData);
              } else {
                return ApiError(
                  message: data['message'] ?? 'Unknown error occurred',
                  code: data['code'] ?? 'UNKNOWN',
                  statusCode: response.statusCode,
                );
              }
            }
          } catch (e) {
            // Failed to parse error response
          }
        }
        return ApiError(
          message: 'Server error occurred',
          code: 'SERVER_ERROR',
          statusCode: error.response?.statusCode,
        );

      case DioExceptionType.cancel:
        return const ApiError(
          message: 'Request was cancelled',
          code: 'CANCELLED',
        );

      case DioExceptionType.connectionError:
        return const ApiError(
          message: 'No internet connection',
          code: 'NO_CONNECTION',
        );

      default:
        return const ApiError(
          message: 'Unknown error occurred',
          code: 'UNKNOWN',
        );
    }
  }

  /// Generic GET request
  Future<ApiResponse<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParameters);
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      throw e.error as ApiError;
    }
  }

  /// Generic POST request
  Future<ApiResponse<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.post(
        path,
        data: data,
        queryParameters: queryParameters,
      );
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      throw e.error as ApiError;
    }
  }

  /// Generic PUT request
  Future<ApiResponse<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.put(
        path,
        data: data,
        queryParameters: queryParameters,
      );
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      throw e.error as ApiError;
    }
  }

  /// Generic DELETE request
  Future<ApiResponse<T>> delete<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.delete(path, queryParameters: queryParameters);
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      throw e.error as ApiError;
    }
  }

  /// File upload with progress tracking
  Future<ApiResponse<T>> uploadFile<T>(
    String path,
    String filePath,
    String fieldName, {
    Map<String, dynamic>? data,
    void Function(int, int)? onSendProgress,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final formData = FormData();
      
      // Add file
      formData.files.add(MapEntry(
        fieldName,
        await MultipartFile.fromFile(filePath),
      ));

      // Add other data
      if (data != null) {
        data.forEach((key, value) {
          formData.fields.add(MapEntry(key, value.toString()));
        });
      }

      final response = await _dio.post(
        path,
        data: formData,
        onSendProgress: onSendProgress,
      );

      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      throw e.error as ApiError;
    }
  }

  /// Handle API response and transform to ApiResponse
  ApiResponse<T> _handleResponse<T>(
    Response response,
    T Function(dynamic)? fromJson,
  ) {
    final data = response.data;
    
    if (data is Map<String, dynamic>) {
      final success = data['success'] as bool? ?? false;
      
      if (success) {
        T? result;
        if (fromJson != null && data['data'] != null) {
          result = fromJson(data['data']);
        } else {
          result = data['data'] as T?;
        }

        return ApiResponse.success(
          data: result,
          message: data['message'] as String?,
        );
      } else {
        throw ApiError(
          message: data['message'] as String? ?? 'Request failed',
          code: data['error'] as String? ?? 'REQUEST_FAILED',
          statusCode: response.statusCode,
        );
      }
    }

    throw const ApiError(
      message: 'Invalid response format',
      code: 'INVALID_RESPONSE',
    );
  }

  /// Update base URL (useful for environment switching)
  void updateBaseUrl(String newBaseUrl) {
    _dio.options.baseUrl = newBaseUrl;
  }

  /// Add custom header
  void addHeader(String key, String value) {
    _dio.options.headers[key] = value;
  }

  /// Remove header
  void removeHeader(String key) {
    _dio.options.headers.remove(key);
  }

  /// Cancel all pending requests
  void cancelRequests() {
    _dio.clear();
  }
}

/// API Error class for structured error handling
class ApiError implements Exception {
  final String message;
  final String code;
  final int? statusCode;
  final Map<String, dynamic>? details;

  const ApiError({
    required this.message,
    required this.code,
    this.statusCode,
    this.details,
  });

  factory ApiError.fromJson(Map<String, dynamic> json) {
    return ApiError(
      message: json['message'] as String? ?? 'Unknown error',
      code: json['code'] as String? ?? 'UNKNOWN',
      statusCode: json['statusCode'] as int?,
      details: json['details'] as Map<String, dynamic>?,
    );
  }

  @override
  String toString() => 'ApiError: $message (Code: $code, Status: $statusCode)';

  bool get isNetworkError => code == 'NO_CONNECTION' || code == 'TIMEOUT';
  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;
  bool get isValidationError => code == 'VALIDATION_ERROR';
  bool get isRateLimitError => code == 'RATE_LIMIT_ERROR';
  bool get isServerError => statusCode != null && statusCode! >= 500;

  String? get fieldError => details?['field'] as String?;
  int? get retryAfter => details?['retryAfter'] as int?;
}