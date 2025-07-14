import 'package:flutter_bloc/flutter_bloc.dart';
import '../../services/auth_service.dart';
import '../../models/api_response.dart';
import 'auth_event.dart';
import 'auth_state.dart' as bloc_state;

class AuthBloc extends Bloc<AuthEvent, bloc_state.AuthState> {
  final AuthService _authService;

  AuthBloc({
    AuthService? authService,
  })  : _authService = authService ?? AuthService(),
        super(const bloc_state.AuthInitial()) {
    on<AuthCheckStatus>(_onCheckStatus);
    on<AuthSendOtp>(_onSendOtp);
    on<AuthVerifyOtp>(_onVerifyOtp);
    on<AuthUpdateProfile>(_onUpdateProfile);
    on<AuthRefreshToken>(_onRefreshToken);
    on<AuthLogout>(_onLogout);
    on<AuthClearError>(_onClearError);
    on<AuthReset>(_onReset);
    on<AuthSessionExpired>(_onSessionExpired);
    on<AuthSetUser>(_onSetUser);
  }

  Future<void> _onCheckStatus(
    AuthCheckStatus event,
    Emitter<bloc_state.AuthState> emit,
  ) async {
    emit(const bloc_state.AuthLoading());

    try {
      final authState = await _authService.initializeAuth();
      
      if (authState == AuthState.authenticated) {
        final user = await _authService.getCurrentUser();
        final accessToken = await _authService.getAccessToken();
        final refreshToken = await _authService.getRefreshToken();

        if (user != null && accessToken != null && refreshToken != null) {
          emit(bloc_state.AuthAuthenticated(
            user: user,
            accessToken: accessToken,
            refreshToken: refreshToken,
          ));
        } else {
          emit(const bloc_state.AuthLoggedOut());
        }
      } else {
        emit(const bloc_state.AuthLoggedOut());
      }
    } catch (e) {
      emit(AuthError(
        message: 'Failed to check authentication status: ${e.toString()}',
      ));
    }
  }

  Future<void> _onSendOtp(
    AuthSendOtp event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthOtpSending());

    try {
      final response = await _authService.sendOtp(
        phoneNumber: event.phoneNumber,
        countryCode: event.countryCode,
      );

      if (response.success && response.data != null) {
        emit(AuthOtpSent(
          phoneNumber: event.phoneNumber,
          countryCode: event.countryCode,
          message: response.data!['message'] ?? 'OTP sent successfully',
        ));
      } else {
        emit(AuthOtpError(
          message: response.message ?? 'Failed to send OTP',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(AuthOtpError(
        message: 'Failed to send OTP: ${e.toString()}',
      ));
    }
  }

  Future<void> _onVerifyOtp(
    AuthVerifyOtp event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthOtpVerifying());

    try {
      final response = await _authService.verifyOtp(
        phoneNumber: event.phoneNumber,
        countryCode: event.countryCode,
        otpCode: event.otpCode,
        userInfo: event.userInfo,
      );

      if (response.success && response.data != null) {
        final authResponse = response.data!;
        
        emit(AuthOtpVerified(
          authResponse: authResponse,
          isNewUser: authResponse.isNewUser,
        ));

        // If user is fully registered, transition to authenticated state
        if (!authResponse.isNewUser || authResponse.user.firstName.isNotEmpty) {
          emit(AuthAuthenticated(
            user: authResponse.user,
            accessToken: authResponse.accessToken,
            refreshToken: authResponse.refreshToken,
          ));
        }
      } else {
        emit(AuthVerificationError(
          message: response.message ?? 'Invalid OTP',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(AuthVerificationError(
        message: 'Failed to verify OTP: ${e.toString()}',
      ));
    }
  }

  Future<void> _onUpdateProfile(
    AuthUpdateProfile event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthProfileUpdating());

    try {
      final response = await _authService.updateProfile(
        firstName: event.firstName,
        lastName: event.lastName,
        bio: event.bio,
        avatarUrl: event.avatarUrl,
        additionalFields: event.additionalFields,
      );

      if (response.success && response.data != null) {
        final user = response.data!;
        
        emit(AuthProfileUpdated(user: user));
        
        // Get current tokens
        final accessToken = await _authService.getAccessToken();
        final refreshToken = await _authService.getRefreshToken();
        
        if (accessToken != null && refreshToken != null) {
          emit(AuthAuthenticated(
            user: user,
            accessToken: accessToken,
            refreshToken: refreshToken,
          ));
        }
      } else {
        emit(AuthError(
          message: response.message ?? 'Failed to update profile',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(AuthError(
        message: 'Failed to update profile: ${e.toString()}',
      ));
    }
  }

  Future<void> _onRefreshToken(
    AuthRefreshToken event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthTokenRefreshing());

    try {
      final response = await _authService.refreshAccessToken();

      if (response.success && response.data != null) {
        final tokenData = response.data!;
        
        emit(AuthTokenRefreshed(
          accessToken: tokenData['accessToken'],
          refreshToken: tokenData['refreshToken'],
        ));

        // Get current user and transition to authenticated state
        final user = await _authService.getCurrentUser();
        if (user != null) {
          emit(AuthAuthenticated(
            user: user,
            accessToken: tokenData['accessToken'],
            refreshToken: tokenData['refreshToken'],
          ));
        }
      } else {
        emit(const AuthSessionExpired());
      }
    } catch (e) {
      emit(const AuthSessionExpired());
    }
  }

  Future<void> _onLogout(
    AuthLogout event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());

    try {
      await _authService.logout();
      emit(const AuthLoggedOut());
    } catch (e) {
      // Even if logout fails, clear local state
      emit(const AuthLoggedOut());
    }
  }

  Future<void> _onClearError(
    AuthClearError event,
    Emitter<AuthState> emit,
  ) async {
    if (state is AuthError || 
        state is AuthOtpError || 
        state is AuthVerificationError) {
      emit(const AuthInitial());
    }
  }

  Future<void> _onReset(
    AuthReset event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthInitial());
  }

  Future<void> _onSessionExpired(
    AuthSessionExpired event,
    Emitter<AuthState> emit,
  ) async {
    await _authService.clearTokens();
    emit(const AuthSessionExpired());
  }

  Future<void> _onSetUser(
    AuthSetUser event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());

    try {
      final user = await _authService.getCurrentUser();
      
      if (user != null) {
        emit(AuthAuthenticated(
          user: user,
          accessToken: event.accessToken,
          refreshToken: event.refreshToken,
        ));
      } else {
        emit(const AuthLoggedOut());
      }
    } catch (e) {
      emit(AuthError(
        message: 'Failed to load user data: ${e.toString()}',
      ));
    }
  }

  /// Check if user is authenticated
  bool get isAuthenticated => state is AuthAuthenticated;

  /// Get current user (if authenticated)
  UserModel? get currentUser {
    final currentState = state;
    if (currentState is AuthAuthenticated) {
      return currentState.user;
    }
    return null;
  }

  /// Get current access token (if authenticated)
  String? get accessToken {
    final currentState = state;
    if (currentState is AuthAuthenticated) {
      return currentState.accessToken;
    }
    return null;
  }
}