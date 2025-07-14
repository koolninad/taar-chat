import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import 'chat_list_page.dart';
import '../../../status/presentation/pages/status_page.dart';
import '../../../calls/presentation/pages/calls_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with TickerProviderStateMixin {
  late TabController _tabController;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      setState(() {
        _currentIndex = _tabController.index;
      });
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primary,
      body: Column(
        children: [
          // Custom App Bar
          SafeArea(
            bottom: false,
            child: Container(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Text(
                    'Taar',
                    style: AppTextStyles.heading2.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.search, color: Colors.white),
                    onPressed: () {
                      // TODO: Implement search
                    },
                  ),
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert, color: Colors.white),
                    onSelected: (value) {
                      switch (value) {
                        case 'settings':
                          context.push('/settings');
                          break;
                        case 'new_group':
                          // TODO: Implement new group
                          break;
                        case 'new_broadcast':
                          // TODO: Implement new broadcast
                          break;
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'new_group',
                        child: Text('New group'),
                      ),
                      const PopupMenuItem(
                        value: 'new_broadcast',
                        child: Text('New broadcast'),
                      ),
                      const PopupMenuItem(
                        value: 'settings',
                        child: Text('Settings'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          
          // Tab Bar
          Container(
            color: AppColors.primary,
            child: TabBar(
              controller: _tabController,
              indicatorColor: Colors.white,
              indicatorWeight: 3,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white70,
              labelStyle: AppTextStyles.tabLabel,
              tabs: const [
                Tab(text: 'CHATS'),
                Tab(text: 'STATUS'),
                Tab(text: 'CALLS'),
              ],
            ),
          ),
          
          // Tab Views
          Expanded(
            child: Container(
              decoration: const BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(0),
                  topRight: Radius.circular(0),
                ),
              ),
              child: TabBarView(
                controller: _tabController,
                children: const [
                  ChatListPage(),
                  StatusPage(),
                  CallsPage(),
                ],
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: _buildFloatingActionButton(),
    );
  }

  Widget _buildFloatingActionButton() {
    IconData icon;
    VoidCallback onPressed;

    switch (_currentIndex) {
      case 0: // Chats
        icon = Icons.chat;
        onPressed = () {
          // TODO: Navigate to new chat/contact selection
        };
        break;
      case 1: // Status
        icon = Icons.camera_alt;
        onPressed = () {
          // TODO: Navigate to camera for status
        };
        break;
      case 2: // Calls
        icon = Icons.add_call;
        onPressed = () {
          // TODO: Show call options
        };
        break;
      default:
        icon = Icons.chat;
        onPressed = () {};
    }

    return FloatingActionButton(
      onPressed: onPressed,
      backgroundColor: AppColors.accent,
      child: Icon(icon, color: Colors.white),
    );
  }
}