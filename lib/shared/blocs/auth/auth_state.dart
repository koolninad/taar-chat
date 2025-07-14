import 'package:equatable/equatable.dart';
import '../../models/api_response.dart';

/// Authentication states
abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

/// Initial state
class AuthInitial extends AuthState {
  const AuthInitial();
}

/// Loading states
class AuthLoading extends AuthState {
  const AuthLoading();
}

class AuthOtpSending extends AuthState {
  const AuthOtpSending();
}

class AuthOtpVerifying extends AuthState {
  const AuthOtpVerifying();
}

class AuthProfileUpdating extends AuthState {
  const AuthProfileUpdating();
}

/// Success states
class AuthOtpSent extends AuthState {
  final String phoneNumber;
  final String countryCode;
  final String message;

  const AuthOtpSent({
    required this.phoneNumber,
    required this.countryCode,
    required this.message,
  });

  @override
  List<Object?> get props => [phoneNumber, countryCode, message];
}

class AuthOtpVerified extends AuthState {
  final AuthResponse authResponse;
  final bool isNewUser;

  const AuthOtpVerified({
    required this.authResponse,
    required this.isNewUser,
  });

  @override
  List<Object?> get props => [authResponse, isNewUser];
}

class AuthAuthenticated extends AuthState {
  final UserModel user;
  final String accessToken;
  final String refreshToken;

  const AuthAuthenticated({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
  });

  @override
  List<Object?> get props => [user, accessToken, refreshToken];
}

class AuthProfileUpdated extends AuthState {
  final UserModel user;

  const AuthProfileUpdated({
    required this.user,
  });

  @override
  List<Object?> get props => [user];
}

/// Error states
class AuthError extends AuthState {
  final String message;
  final String? code;

  const AuthError({
    required this.message,
    this.code,
  });

  @override
  List<Object?> get props => [message, code];
}

class AuthOtpError extends AuthState {
  final String message;
  final String? code;

  const AuthOtpError({
    required this.message,
    this.code,
  });

  @override
  List<Object?> get props => [message, code];
}

class AuthVerificationError extends AuthState {
  final String message;
  final String? code;

  const AuthVerificationError({
    required this.message,
    this.code,
  });

  @override
  List<Object?> get props => [message, code];
}

/// Session expired
class AuthSessionExpired extends AuthState {
  const AuthSessionExpired();
}

/// Logged out
class AuthLoggedOut extends AuthState {
  const AuthLoggedOut();
}

/// Token refreshing
class AuthTokenRefreshing extends AuthState {
  const AuthTokenRefreshing();
}

/// Token refreshed
class AuthTokenRefreshed extends AuthState {
  final String accessToken;
  final String refreshToken;

  const AuthTokenRefreshed({
    required this.accessToken,
    required this.refreshToken,
  });

  @override
  List<Object?> get props => [accessToken, refreshToken];
}