import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

class CallPage extends StatefulWidget {
  final String contactName;
  final bool isVideo;

  const CallPage({
    super.key,
    required this.contactName,
    required this.isVideo,
  });

  @override
  State<CallPage> createState() => _CallPageState();
}

class _CallPageState extends State<CallPage> {
  bool _isMuted = false;
  bool _isSpeakerOn = false;
  bool _isVideoEnabled = true;
  Duration _callDuration = Duration.zero;

  @override
  void initState() {
    super.initState();
    _startCallTimer();
  }

  void _startCallTimer() {
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() {
          _callDuration = _callDuration + const Duration(seconds: 1);
        });
        _startCallTimer();
      }
    });
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: widget.isVideo ? Colors.black : AppColors.backgroundDark,
      body: SafeArea(
        child: Column(
          children: [
            // Top section
            Expanded(
              flex: 2,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Profile picture
                    Container(
                      width: 120,
                      height: 120,
                      decoration: const BoxDecoration(
                        color: AppColors.surface,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.person,
                        size: 60,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    
                    const SizedBox(height: 24),
                    
                    // Contact name
                    Text(
                      widget.contactName,
                      style: AppTextStyles.heading2.copyWith(
                        color: Colors.white,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    
                    const SizedBox(height: 8),
                    
                    // Call status
                    Text(
                      _formatDuration(_callDuration),
                      style: AppTextStyles.subtitle1.copyWith(
                        color: Colors.white70,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            // Video preview (if video call)
            if (widget.isVideo && _isVideoEnabled)
              Expanded(
                child: Container(
                  margin: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.grey[800],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Stack(
                    children: [
                      // Self video preview
                      Positioned(
                        top: 16,
                        right: 16,
                        child: Container(
                          width: 100,
                          height: 140,
                          decoration: BoxDecoration(
                            color: Colors.grey[700],
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Center(
                            child: Icon(
                              Icons.person,
                              color: Colors.white,
                              size: 40,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            
            // Control buttons
            Container(
              padding: const EdgeInsets.all(24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  // Mute button
                  _CallButton(
                    icon: _isMuted ? Icons.mic_off : Icons.mic,
                    backgroundColor: _isMuted ? AppColors.error : Colors.white24,
                    onPressed: () {
                      setState(() {
                        _isMuted = !_isMuted;
                      });
                    },
                  ),
                  
                  // Speaker button (voice call only)
                  if (!widget.isVideo)
                    _CallButton(
                      icon: _isSpeakerOn ? Icons.volume_up : Icons.volume_down,
                      backgroundColor: _isSpeakerOn ? AppColors.primary : Colors.white24,
                      onPressed: () {
                        setState(() {
                          _isSpeakerOn = !_isSpeakerOn;
                        });
                      },
                    ),
                  
                  // Video toggle (video call only)
                  if (widget.isVideo)
                    _CallButton(
                      icon: _isVideoEnabled ? Icons.videocam : Icons.videocam_off,
                      backgroundColor: _isVideoEnabled ? Colors.white24 : AppColors.error,
                      onPressed: () {
                        setState(() {
                          _isVideoEnabled = !_isVideoEnabled;
                        });
                      },
                    ),
                  
                  // End call button
                  _CallButton(
                    icon: Icons.call_end,
                    backgroundColor: AppColors.error,
                    onPressed: () {
                      context.pop();
                    },
                    size: 60,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CallButton extends StatelessWidget {
  final IconData icon;
  final Color backgroundColor;
  final VoidCallback onPressed;
  final double size;

  const _CallButton({
    required this.icon,
    required this.backgroundColor,
    required this.onPressed,
    this.size = 48,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: backgroundColor,
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          color: Colors.white,
          size: size * 0.5,
        ),
      ),
    );
  }
}