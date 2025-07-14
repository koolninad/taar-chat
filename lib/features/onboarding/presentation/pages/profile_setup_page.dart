import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../shared/services/auth_service.dart';
import '../../../../shared/services/api_client.dart';

class ProfileSetupPage extends StatefulWidget {
  const ProfileSetupPage({super.key});

  @override
  State<ProfileSetupPage> createState() => _ProfileSetupPageState();
}

class _ProfileSetupPageState extends State<ProfileSetupPage> {
  final _nameController = TextEditingController();
  final _aboutController = TextEditingController();
  final _authService = AuthService();
  String? _profileImagePath;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _aboutController.dispose();
    super.dispose();
  }

  void _pickImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery);
    
    if (image != null) {
      setState(() {
        _profileImagePath = image.path;
      });
    }
  }

  void _takePhoto() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.camera);
    
    if (image != null) {
      setState(() {
        _profileImagePath = image.path;
      });
    }
  }

  void _showImagePicker() {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from gallery'),
              onTap: () {
                Navigator.pop(context);
                _pickImage();
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Take a photo'),
              onTap: () {
                Navigator.pop(context);
                _takePhoto();
              },
            ),
            if (_profileImagePath != null)
              ListTile(
                leading: const Icon(Icons.delete),
                title: const Text('Remove photo'),
                onTap: () {
                  Navigator.pop(context);
                  setState(() {
                    _profileImagePath = null;
                  });
                },
              ),
          ],
        ),
      ),
    );
  }

  void _completeSetup() async {
    if (_nameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter your name'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await _authService.updateProfile(
        name: _nameController.text.trim(),
        about: _aboutController.text.trim().isNotEmpty 
            ? _aboutController.text.trim() 
            : null,
        // TODO: Upload profile image if selected
        // avatarUrl: _profileImagePath != null ? await _uploadImage() : null,
      );

      if (response.success) {
        setState(() {
          _isLoading = false;
        });
        
        context.go('/home');
      } else {
        setState(() {
          _isLoading = false;
          _errorMessage = response.error ?? 'Failed to update profile';
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
        actions: [
          TextButton(
            onPressed: () => context.go('/home'),
            child: const Text('Skip'),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: AppConstants.defaultPadding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 32),
              
              Text(
                'Setup your profile',
                style: AppTextStyles.heading2,
              ),
              
              const SizedBox(height: 16),
              
              Text(
                'Add your name and profile photo to help friends recognize you',
                style: AppTextStyles.body1.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              
              const SizedBox(height: 48),
              
              // Profile Photo
              Center(
                child: GestureDetector(
                  onTap: _showImagePicker,
                  child: Stack(
                    children: [
                      Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.surface,
                          border: Border.all(
                            color: AppColors.divider,
                            width: 2,
                          ),
                        ),
                        child: _profileImagePath != null
                          ? ClipOval(
                              child: Image.asset(
                                _profileImagePath!,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) {
                                  return const Icon(
                                    Icons.person,
                                    size: 60,
                                    color: AppColors.textSecondary,
                                  );
                                },
                              ),
                            )
                          : const Icon(
                              Icons.person,
                              size: 60,
                              color: AppColors.textSecondary,
                            ),
                      ),
                      
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.camera_alt,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              
              const SizedBox(height: 48),
              
              // Name Input
              TextFormField(
                controller: _nameController,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'Name',
                  prefixIcon: Icon(Icons.person_outline),
                ),
                maxLength: 50,
              ),
              
              const SizedBox(height: 24),
              
              // About Input
              TextFormField(
                controller: _aboutController,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'About (optional)',
                  hintText: 'Hey there! I am using Taar.',
                  prefixIcon: Icon(Icons.info_outline),
                ),
                maxLength: 139,
                maxLines: 2,
              ),
              
              const Spacer(),
              
              // Complete Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _completeSetup,
                  child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation(Colors.white),
                        ),
                      )
                    : const Text('Complete Setup'),
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Info Text
              Text(
                'Your profile information can be changed later in Settings.',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}