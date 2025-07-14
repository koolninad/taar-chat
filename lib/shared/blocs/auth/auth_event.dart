import 'package:equatable/equatable.dart';

/// Authentication events
abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

/// Check authentication status on app start
class AuthCheckStatus extends AuthEvent {
  const AuthCheckStatus();
}

/// Send OTP
class AuthSendOtp extends AuthEvent {
  final String phoneNumber;
  final String countryCode;

  const AuthSendOtp({
    required this.phoneNumber,
    required this.countryCode,
  });

  @override
  List<Object?> get props => [phoneNumber, countryCode];
}

/// Verify OTP
class AuthVerifyOtp extends AuthEvent {
  final String phoneNumber;
  final String countryCode;
  final String otpCode;
  final Map<String, dynamic>? userInfo;

  const AuthVerifyOtp({
    required this.phoneNumber,
    required this.countryCode,
    required this.otpCode,
    this.userInfo,
  });

  @override
  List<Object?> get props => [phoneNumber, countryCode, otpCode, userInfo];
}

/// Update user profile
class AuthUpdateProfile extends AuthEvent {
  final String? firstName;
  final String? lastName;
  final String? bio;
  final String? avatarUrl;
  final Map<String, dynamic>? additionalFields;

  const AuthUpdateProfile({
    this.firstName,
    this.lastName,
    this.bio,
    this.avatarUrl,
    this.additionalFields,
  });

  @override
  List<Object?> get props => [
        firstName,
        lastName,
        bio,
        avatarUrl,
        additionalFields,
      ];
}

/// Refresh access token
class AuthRefreshToken extends AuthEvent {
  const AuthRefreshToken();
}

/// Logout
class AuthLogout extends AuthEvent {
  const AuthLogout();
}

/// Clear error state
class AuthClearError extends AuthEvent {
  const AuthClearError();
}

/// Reset authentication state
class AuthReset extends AuthEvent {
  const AuthReset();
}

/// Handle session expiry
class AuthSessionExpired extends AuthEvent {
  const AuthSessionExpired();
}

/// Set authenticated user (used when loading from storage)
class AuthSetUser extends AuthEvent {
  final String accessToken;
  final String refreshToken;

  const AuthSetUser({
    required this.accessToken,
    required this.refreshToken,
  });

  @override
  List<Object?> get props => [accessToken, refreshToken];
}