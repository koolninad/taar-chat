import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../shared/services/auth_service.dart';
import '../../../../shared/services/api_client.dart';

class PhoneVerificationPage extends StatefulWidget {
  const PhoneVerificationPage({super.key});

  @override
  State<PhoneVerificationPage> createState() => _PhoneVerificationPageState();
}

class _PhoneVerificationPageState extends State<PhoneVerificationPage> {
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  final _authService = AuthService();
  bool _isCodeSent = false;
  bool _isLoading = false;
  String _selectedCountryCode = '+91';
  String? _errorMessage;

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  void _sendCode() async {
    if (_phoneController.text.isEmpty) return;
    
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    
    try {
      final response = await _authService.sendOtp(
        phoneNumber: _phoneController.text,
        countryCode: _selectedCountryCode,
      );
      
      if (response.success) {
        setState(() {
          _isLoading = false;
          _isCodeSent = true;
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Verification code sent successfully'),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        setState(() {
          _isLoading = false;
          _errorMessage = response.error ?? 'Failed to send verification code';
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e is ApiError ? e.message : 'Network error occurred';
      });
    }
  }

  void _verifyCode() async {
    if (_codeController.text.length != 6) return;
    
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    
    try {
      final response = await _authService.verifyOtp(
        phoneNumber: _phoneController.text,
        countryCode: _selectedCountryCode,
        otpCode: _codeController.text,
      );
      
      if (response.success && response.data != null) {
        setState(() {
          _isLoading = false;
        });
        
        // Check if user needs to complete profile setup
        if (response.data!.isNewUser) {
          context.go('/profile-setup');
        } else {
          context.go('/home');
        }
      } else {
        setState(() {
          _isLoading = false;
          _errorMessage = response.error ?? 'Invalid verification code';
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e is ApiError ? e.message : 'Network error occurred';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: AppConstants.defaultPadding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 32),
              
              Text(
                _isCodeSent ? 'Enter verification code' : 'Enter your phone number',
                style: AppTextStyles.heading2,
              ),
              
              const SizedBox(height: 16),
              
              Text(
                _isCodeSent 
                  ? 'We\'ve sent a 6-digit code to $_selectedCountryCode ${_phoneController.text}'
                  : 'We\'ll send you a verification code to confirm your number',
                style: AppTextStyles.body1.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              
              const SizedBox(height: 32),
              
              // Error Message
              if (_errorMessage != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.error.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.error.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.error_outline,
                        color: AppColors.error,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.error,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
              
              if (!_isCodeSent) ...[
                // Country Code and Phone Number Input
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.divider),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('🇮🇳'),
                          const SizedBox(width: 8),
                          Text(_selectedCountryCode),
                          const Icon(Icons.arrow_drop_down),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(10),
                        ],
                        decoration: const InputDecoration(
                          hintText: 'Phone number',
                          prefixIcon: Icon(Icons.phone),
                        ),
                      ),
                    ),
                  ],
                ),
              ] else ...[
                // OTP Input
                TextFormField(
                  controller: _codeController,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(6),
                  ],
                  decoration: const InputDecoration(
                    hintText: '000000',
                    counterText: '',
                  ),
                  style: AppTextStyles.heading3.copyWith(
                    letterSpacing: 8,
                  ),
                  onChanged: (value) {
                    if (value.length == 6) {
                      _verifyCode();
                    }
                  },
                ),
              ],
              
              const SizedBox(height: 32),
              
              // Action Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading 
                    ? null 
                    : _isCodeSent 
                      ? _verifyCode 
                      : _sendCode,
                  child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation(Colors.white),
                        ),
                      )
                    : Text(_isCodeSent ? 'Verify Code' : 'Send Code'),
                ),
              ),
              
              if (_isCodeSent) ...[
                const SizedBox(height: 16),
                
                // Resend Code
                Center(
                  child: TextButton(
                    onPressed: () {
                      setState(() {
                        _isCodeSent = false;
                        _codeController.clear();
                      });
                    },
                    child: const Text('Resend code'),
                  ),
                ),
              ],
              
              const Spacer(),
              
              // Info Text
              Container(
                padding: AppConstants.defaultPadding,
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(AppConstants.borderRadius),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.info_outline,
                      color: AppColors.primary,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Your phone number will be used to identify you on Taar. It will not be shared with other users.',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}