import 'package:flutter_bloc/flutter_bloc.dart';
import '../../services/user_service.dart';
import '../../models/api_response.dart';
import 'contacts_event.dart';
import 'contacts_state.dart';

class ContactsBloc extends Bloc<ContactsEvent, ContactsState> {
  final UserService _userService;

  // State management
  List<ContactModel> _contacts = [];
  int _currentPage = 1;
  bool _hasMore = true;

  ContactsBloc({
    UserService? userService,
  })  : _userService = userService ?? UserService(),
        super(const ContactsInitial()) {
    
    on<ContactsLoad>(_onLoad);
    on<ContactsLoadMore>(_onLoadMore);
    on<ContactsSearchUsers>(_onSearchUsers);
    on<ContactsAdd>(_onAdd);
    on<ContactsUpdate>(_onUpdate);
    on<ContactsRemove>(_onRemove);
    on<ContactsImport>(_onImport);
    on<ContactsSync>(_onSync);
    on<ContactsGetUserProfile>(_onGetUserProfile);
    on<ContactsGetUserActivity>(_onGetUserActivity);
    on<ContactsBlockUser>(_onBlockUser);
    on<ContactsUnblockUser>(_onUnblockUser);
    on<ContactsGetBlockedUsers>(_onGetBlockedUsers);
    on<ContactsGetPrivacySettings>(_onGetPrivacySettings);
    on<ContactsUpdatePrivacySettings>(_onUpdatePrivacySettings);
    on<ContactsGetNearbyUsers>(_onGetNearbyUsers);
    on<ContactsGetMutualContacts>(_onGetMutualContacts);
    on<ContactsReportUser>(_onReportUser);
    on<ContactsGetVerificationStatus>(_onGetVerificationStatus);
    on<ContactsUpdateNotificationSettings>(_onUpdateNotificationSettings);
    on<ContactsGetNotificationSettings>(_onGetNotificationSettings);
    on<ContactsClearSearch>(_onClearSearch);
    on<ContactsClearError>(_onClearError);
    on<ContactsRefresh>(_onRefresh);
  }

  Future<void> _onLoad(
    ContactsLoad event,
    Emitter<ContactsState> emit,
  ) async {
    emit(const ContactsLoading());

    try {
      final response = await _userService.getContacts(
        page: event.page,
        limit: event.limit,
      );

      if (response.success && response.data != null) {
        final paginatedResponse = response.data!;
        
        _contacts = paginatedResponse.data;
        _currentPage = event.page;
        _hasMore = paginatedResponse.hasNextPage;

        emit(ContactsLoaded(
          contacts: List.from(_contacts),
          hasMore: _hasMore,
          currentPage: _currentPage,
        ));
      } else {
        emit(ContactsError(
          message: response.message ?? 'Failed to load contacts',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to load contacts: ${e.toString()}',
      ));
    }
  }

  Future<void> _onLoadMore(
    ContactsLoadMore event,
    Emitter<ContactsState> emit,
  ) async {
    if (!_hasMore) return;

    final currentState = state;
    if (currentState is! ContactsLoaded) return;

    try {
      final nextPage = _currentPage + 1;
      final response = await _userService.getContacts(
        page: nextPage,
        limit: 20,
      );

      if (response.success && response.data != null) {
        final paginatedResponse = response.data!;
        final newContacts = paginatedResponse.data;

        _contacts.addAll(newContacts);
        _currentPage = nextPage;
        _hasMore = paginatedResponse.hasNextPage;

        emit(ContactsLoaded(
          contacts: List.from(_contacts),
          hasMore: _hasMore,
          currentPage: _currentPage,
        ));
      } else {
        emit(ContactsError(
          message: response.message ?? 'Failed to load more contacts',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to load more contacts: ${e.toString()}',
      ));
    }
  }

  Future<void> _onSearchUsers(
    ContactsSearchUsers event,
    Emitter<ContactsState> emit,
  ) async {
    final query = event.phoneNumber ?? event.name ?? '';
    emit(ContactsSearching(query: query));

    try {
      final response = await _userService.searchUsers(
        phoneNumber: event.phoneNumber,
        name: event.name,
        page: event.page,
        limit: event.limit,
      );

      if (response.success && response.data != null) {
        final paginatedResponse = response.data!;
        
        emit(ContactsSearchResults(
          query: query,
          users: paginatedResponse.data,
          isLoading: false,
          hasMore: paginatedResponse.hasNextPage,
        ));
      } else {
        emit(ContactsSearchError(
          message: response.message ?? 'Search failed',
          query: query,
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsSearchError(
        message: 'Search failed: ${e.toString()}',
        query: query,
      ));
    }
  }

  Future<void> _onAdd(
    ContactsAdd event,
    Emitter<ContactsState> emit,
  ) async {
    try {
      final response = await _userService.addContact(
        userId: event.userId,
        nickname: event.nickname,
      );

      if (response.success && response.data != null) {
        final contact = response.data!;
        
        _contacts.insert(0, contact);
        
        emit(ContactAdded(contact: contact));
        
        emit(ContactsLoaded(
          contacts: List.from(_contacts),
          hasMore: _hasMore,
          currentPage: _currentPage,
        ));
      } else {
        emit(ContactsError(
          message: response.message ?? 'Failed to add contact',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to add contact: ${e.toString()}',
      ));
    }
  }

  Future<void> _onUpdate(
    ContactsUpdate event,
    Emitter<ContactsState> emit,
  ) async {
    try {
      final response = await _userService.updateContact(
        contactId: event.contactId,
        nickname: event.nickname,
        isBlocked: event.isBlocked,
      );

      if (response.success && response.data != null) {
        final updatedContact = response.data!;
        
        // Update in local list
        final index = _contacts.indexWhere((c) => c.id == event.contactId);
        if (index != -1) {
          _contacts[index] = updatedContact;
        }
        
        emit(ContactUpdated(contact: updatedContact));
        
        emit(ContactsLoaded(
          contacts: List.from(_contacts),
          hasMore: _hasMore,
          currentPage: _currentPage,
        ));
      } else {
        emit(ContactsError(
          message: response.message ?? 'Failed to update contact',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to update contact: ${e.toString()}',
      ));
    }
  }

  Future<void> _onRemove(
    ContactsRemove event,
    Emitter<ContactsState> emit,
  ) async {
    try {
      final response = await _userService.removeContact(
        contactId: event.contactId,
      );

      if (response.success) {
        _contacts.removeWhere((c) => c.id == event.contactId);
        
        emit(ContactRemoved(contactId: event.contactId));
        
        emit(ContactsLoaded(
          contacts: List.from(_contacts),
          hasMore: _hasMore,
          currentPage: _currentPage,
        ));
      } else {
        emit(ContactsError(
          message: response.message ?? 'Failed to remove contact',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to remove contact: ${e.toString()}',
      ));
    }
  }

  Future<void> _onImport(
    ContactsImport event,
    Emitter<ContactsState> emit,
  ) async {
    emit(const ContactsImporting());

    try {
      final response = await _userService.importContacts(
        contacts: event.phoneContacts,
      );

      if (response.success && response.data != null) {
        final importData = response.data!;
        
        emit(ContactsImported(
          importedCount: importData['importedCount'] ?? 0,
          totalCount: event.phoneContacts.length,
        ));

        // Reload contacts to show imported ones
        add(const ContactsLoad());
      } else {
        emit(ContactsImportError(
          message: response.message ?? 'Failed to import contacts',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsImportError(
        message: 'Failed to import contacts: ${e.toString()}',
      ));
    }
  }

  Future<void> _onSync(
    ContactsSync event,
    Emitter<ContactsState> emit,
  ) async {
    emit(const ContactsSyncing());

    try {
      final response = await _userService.syncContacts();

      if (response.success && response.data != null) {
        final syncData = response.data!;
        
        emit(ContactsSynced(
          syncedCount: syncData['syncedCount'] ?? 0,
          lastSyncTime: DateTime.now(),
        ));

        // Reload contacts to show synced data
        add(const ContactsLoad());
      } else {
        emit(ContactsError(
          message: response.message ?? 'Failed to sync contacts',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to sync contacts: ${e.toString()}',
      ));
    }
  }

  Future<void> _onGetUserProfile(
    ContactsGetUserProfile event,
    Emitter<ContactsState> emit,
  ) async {
    try {
      final response = await _userService.getUserProfile(
        userId: event.userId,
      );

      if (response.success && response.data != null) {
        emit(UserProfileLoaded(user: response.data!));
      } else {
        emit(ContactsError(
          message: response.message ?? 'Failed to load user profile',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to load user profile: ${e.toString()}',
      ));
    }
  }

  Future<void> _onGetUserActivity(
    ContactsGetUserActivity event,
    Emitter<ContactsState> emit,
  ) async {
    try {
      final response = await _userService.getUserActivity(
        userId: event.userId,
      );

      if (response.success && response.data != null) {
        emit(UserActivityLoaded(
          userId: event.userId,
          activity: response.data!,
        ));
      } else {
        emit(ContactsError(
          message: response.message ?? 'Failed to load user activity',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to load user activity: ${e.toString()}',
      ));
    }
  }

  Future<void> _onBlockUser(
    ContactsBlockUser event,
    Emitter<ContactsState> emit,
  ) async {
    try {
      final response = await _userService.blockUser(
        userId: event.userId,
      );

      if (response.success) {
        emit(UserBlocked(userId: event.userId));
      } else {
        emit(ContactsError(
          message: response.message ?? 'Failed to block user',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to block user: ${e.toString()}',
      ));
    }
  }

  Future<void> _onUnblockUser(
    ContactsUnblockUser event,
    Emitter<ContactsState> emit,
  ) async {
    try {
      final response = await _userService.unblockUser(
        userId: event.userId,
      );

      if (response.success) {
        emit(UserUnblocked(userId: event.userId));
      } else {
        emit(ContactsError(
          message: response.message ?? 'Failed to unblock user',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to unblock user: ${e.toString()}',
      ));
    }
  }

  Future<void> _onGetBlockedUsers(
    ContactsGetBlockedUsers event,
    Emitter<ContactsState> emit,
  ) async {
    try {
      final response = await _userService.getBlockedUsers(
        page: event.page,
        limit: event.limit,
      );

      if (response.success && response.data != null) {
        final paginatedResponse = response.data!;
        
        emit(BlockedUsersLoaded(
          blockedUsers: paginatedResponse.data,
          hasMore: paginatedResponse.hasNextPage,
        ));
      } else {
        emit(ContactsError(
          message: response.message ?? 'Failed to load blocked users',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to load blocked users: ${e.toString()}',
      ));
    }
  }

  Future<void> _onGetPrivacySettings(
    ContactsGetPrivacySettings event,
    Emitter<ContactsState> emit,
  ) async {
    try {
      final response = await _userService.getPrivacySettings();

      if (response.success && response.data != null) {
        emit(PrivacySettingsLoaded(settings: response.data!));
      } else {
        emit(ContactsError(
          message: response.message ?? 'Failed to load privacy settings',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to load privacy settings: ${e.toString()}',
      ));
    }
  }

  Future<void> _onUpdatePrivacySettings(
    ContactsUpdatePrivacySettings event,
    Emitter<ContactsState> emit,
  ) async {
    try {
      final response = await _userService.updatePrivacySettings(
        lastSeenVisibility: event.lastSeenVisibility,
        profilePhotoVisibility: event.profilePhotoVisibility,
        aboutVisibility: event.aboutVisibility,
      );

      if (response.success && response.data != null) {
        emit(PrivacySettingsUpdated(settings: response.data!));
      } else {
        emit(ContactsError(
          message: response.message ?? 'Failed to update privacy settings',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to update privacy settings: ${e.toString()}',
      ));
    }
  }

  Future<void> _onGetNearbyUsers(
    ContactsGetNearbyUsers event,
    Emitter<ContactsState> emit,
  ) async {
    try {
      final response = await _userService.getNearbyUsers(
        latitude: event.latitude,
        longitude: event.longitude,
        radiusKm: event.radiusKm,
      );

      if (response.success && response.data != null) {
        emit(NearbyUsersLoaded(
          nearbyUsers: response.data!,
          latitude: event.latitude,
          longitude: event.longitude,
          radiusKm: event.radiusKm,
        ));
      } else {
        emit(ContactsError(
          message: response.message ?? 'Failed to load nearby users',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to load nearby users: ${e.toString()}',
      ));
    }
  }

  Future<void> _onGetMutualContacts(
    ContactsGetMutualContacts event,
    Emitter<ContactsState> emit,
  ) async {
    try {
      final response = await _userService.getMutualContacts(
        userId: event.userId,
      );

      if (response.success && response.data != null) {
        emit(MutualContactsLoaded(
          userId: event.userId,
          mutualContacts: response.data!,
        ));
      } else {
        emit(ContactsError(
          message: response.message ?? 'Failed to load mutual contacts',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to load mutual contacts: ${e.toString()}',
      ));
    }
  }

  Future<void> _onReportUser(
    ContactsReportUser event,
    Emitter<ContactsState> emit,
  ) async {
    try {
      final response = await _userService.reportUser(
        userId: event.userId,
        reason: event.reason,
        description: event.description,
      );

      if (!response.success) {
        emit(ContactsError(
          message: response.message ?? 'Failed to report user',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to report user: ${e.toString()}',
      ));
    }
  }

  Future<void> _onGetVerificationStatus(
    ContactsGetVerificationStatus event,
    Emitter<ContactsState> emit,
  ) async {
    try {
      final response = await _userService.getVerificationStatus(
        userId: event.userId,
      );

      if (!response.success) {
        emit(ContactsError(
          message: response.message ?? 'Failed to get verification status',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to get verification status: ${e.toString()}',
      ));
    }
  }

  Future<void> _onUpdateNotificationSettings(
    ContactsUpdateNotificationSettings event,
    Emitter<ContactsState> emit,
  ) async {
    try {
      final response = await _userService.updateNotificationSettings(
        messageNotifications: event.messageNotifications,
        groupNotifications: event.groupNotifications,
        callNotifications: event.callNotifications,
        notificationSound: event.notificationSound,
        vibration: event.vibration,
      );

      if (!response.success) {
        emit(ContactsError(
          message: response.message ?? 'Failed to update notification settings',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to update notification settings: ${e.toString()}',
      ));
    }
  }

  Future<void> _onGetNotificationSettings(
    ContactsGetNotificationSettings event,
    Emitter<ContactsState> emit,
  ) async {
    try {
      final response = await _userService.getNotificationSettings();

      if (!response.success) {
        emit(ContactsError(
          message: response.message ?? 'Failed to get notification settings',
          code: response.error?.code,
        ));
      }
    } catch (e) {
      emit(ContactsError(
        message: 'Failed to get notification settings: ${e.toString()}',
      ));
    }
  }

  Future<void> _onClearSearch(
    ContactsClearSearch event,
    Emitter<ContactsState> emit,
  ) async {
    if (state is ContactsSearchResults || state is ContactsSearchError) {
      emit(ContactsLoaded(
        contacts: List.from(_contacts),
        hasMore: _hasMore,
        currentPage: _currentPage,
      ));
    }
  }

  Future<void> _onClearError(
    ContactsClearError event,
    Emitter<ContactsState> emit,
  ) async {
    if (state is ContactsError || 
        state is ContactsSearchError || 
        state is ContactsImportError) {
      emit(ContactsLoaded(
        contacts: List.from(_contacts),
        hasMore: _hasMore,
        currentPage: _currentPage,
      ));
    }
  }

  Future<void> _onRefresh(
    ContactsRefresh event,
    Emitter<ContactsState> emit,
  ) async {
    add(const ContactsLoad());
  }

  /// Get contacts list
  List<ContactModel> get contacts => List.from(_contacts);

  /// Check if has more contacts to load
  bool get hasMoreContacts => _hasMore;

  /// Get current page
  int get currentPage => _currentPage;
}