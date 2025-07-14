import 'package:equatable/equatable.dart';

/// Contacts events
abstract class ContactsEvent extends Equatable {
  const ContactsEvent();

  @override
  List<Object?> get props => [];
}

/// Load contacts
class ContactsLoad extends ContactsEvent {
  final int page;
  final int limit;

  const ContactsLoad({
    this.page = 1,
    this.limit = 20,
  });

  @override
  List<Object?> get props => [page, limit];
}

/// Load more contacts
class ContactsLoadMore extends ContactsEvent {
  const ContactsLoadMore();
}

/// Search users
class ContactsSearchUsers extends ContactsEvent {
  final String? phoneNumber;
  final String? name;
  final int page;
  final int limit;

  const ContactsSearchUsers({
    this.phoneNumber,
    this.name,
    this.page = 1,
    this.limit = 20,
  });

  @override
  List<Object?> get props => [phoneNumber, name, page, limit];
}

/// Add contact
class ContactsAdd extends ContactsEvent {
  final String userId;
  final String? nickname;

  const ContactsAdd({
    required this.userId,
    this.nickname,
  });

  @override
  List<Object?> get props => [userId, nickname];
}

/// Update contact
class ContactsUpdate extends ContactsEvent {
  final String contactId;
  final String? nickname;
  final bool? isBlocked;

  const ContactsUpdate({
    required this.contactId,
    this.nickname,
    this.isBlocked,
  });

  @override
  List<Object?> get props => [contactId, nickname, isBlocked];
}

/// Remove contact
class ContactsRemove extends ContactsEvent {
  final String contactId;

  const ContactsRemove({
    required this.contactId,
  });

  @override
  List<Object?> get props => [contactId];
}

/// Import contacts from phone
class ContactsImport extends ContactsEvent {
  final List<Map<String, String>> phoneContacts;

  const ContactsImport({
    required this.phoneContacts,
  });

  @override
  List<Object?> get props => [phoneContacts];
}

/// Sync contacts with server
class ContactsSync extends ContactsEvent {
  const ContactsSync();
}

/// Get user profile
class ContactsGetUserProfile extends ContactsEvent {
  final String userId;

  const ContactsGetUserProfile({
    required this.userId,
  });

  @override
  List<Object?> get props => [userId];
}

/// Get user activity
class ContactsGetUserActivity extends ContactsEvent {
  final String userId;

  const ContactsGetUserActivity({
    required this.userId,
  });

  @override
  List<Object?> get props => [userId];
}

/// Block user
class ContactsBlockUser extends ContactsEvent {
  final String userId;

  const ContactsBlockUser({
    required this.userId,
  });

  @override
  List<Object?> get props => [userId];
}

/// Unblock user
class ContactsUnblockUser extends ContactsEvent {
  final String userId;

  const ContactsUnblockUser({
    required this.userId,
  });

  @override
  List<Object?> get props => [userId];
}

/// Get blocked users
class ContactsGetBlockedUsers extends ContactsEvent {
  final int page;
  final int limit;

  const ContactsGetBlockedUsers({
    this.page = 1,
    this.limit = 20,
  });

  @override
  List<Object?> get props => [page, limit];
}

/// Get privacy settings
class ContactsGetPrivacySettings extends ContactsEvent {
  const ContactsGetPrivacySettings();
}

/// Update privacy settings
class ContactsUpdatePrivacySettings extends ContactsEvent {
  final String? lastSeenVisibility;
  final String? profilePhotoVisibility;
  final String? aboutVisibility;

  const ContactsUpdatePrivacySettings({
    this.lastSeenVisibility,
    this.profilePhotoVisibility,
    this.aboutVisibility,
  });

  @override
  List<Object?> get props => [
        lastSeenVisibility,
        profilePhotoVisibility,
        aboutVisibility,
      ];
}

/// Get nearby users
class ContactsGetNearbyUsers extends ContactsEvent {
  final double latitude;
  final double longitude;
  final double radiusKm;

  const ContactsGetNearbyUsers({
    required this.latitude,
    required this.longitude,
    this.radiusKm = 10.0,
  });

  @override
  List<Object?> get props => [latitude, longitude, radiusKm];
}

/// Get mutual contacts
class ContactsGetMutualContacts extends ContactsEvent {
  final String userId;

  const ContactsGetMutualContacts({
    required this.userId,
  });

  @override
  List<Object?> get props => [userId];
}

/// Report user
class ContactsReportUser extends ContactsEvent {
  final String userId;
  final String reason;
  final String? description;

  const ContactsReportUser({
    required this.userId,
    required this.reason,
    this.description,
  });

  @override
  List<Object?> get props => [userId, reason, description];
}

/// Get user verification status
class ContactsGetVerificationStatus extends ContactsEvent {
  final String userId;

  const ContactsGetVerificationStatus({
    required this.userId,
  });

  @override
  List<Object?> get props => [userId];
}

/// Update notification settings
class ContactsUpdateNotificationSettings extends ContactsEvent {
  final bool? messageNotifications;
  final bool? groupNotifications;
  final bool? callNotifications;
  final String? notificationSound;
  final bool? vibration;

  const ContactsUpdateNotificationSettings({
    this.messageNotifications,
    this.groupNotifications,
    this.callNotifications,
    this.notificationSound,
    this.vibration,
  });

  @override
  List<Object?> get props => [
        messageNotifications,
        groupNotifications,
        callNotifications,
        notificationSound,
        vibration,
      ];
}

/// Get notification settings
class ContactsGetNotificationSettings extends ContactsEvent {
  const ContactsGetNotificationSettings();
}

/// Clear search results
class ContactsClearSearch extends ContactsEvent {
  const ContactsClearSearch();
}

/// Clear error state
class ContactsClearError extends ContactsEvent {
  const ContactsClearError();
}

/// Refresh contacts
class ContactsRefresh extends ContactsEvent {
  const ContactsRefresh();
}