import 'package:equatable/equatable.dart';
import '../../models/api_response.dart';

/// Contacts states
abstract class ContactsState extends Equatable {
  const ContactsState();

  @override
  List<Object?> get props => [];
}

/// Initial state
class ContactsInitial extends ContactsState {
  const ContactsInitial();
}

/// Loading states
class ContactsLoading extends ContactsState {
  const ContactsLoading();
}

class ContactsSearching extends ContactsState {
  final String query;

  const ContactsSearching({
    required this.query,
  });

  @override
  List<Object?> get props => [query];
}

class ContactsImporting extends ContactsState {
  const ContactsImporting();
}

class ContactsSyncing extends ContactsState {
  const ContactsSyncing();
}

/// Success states
class ContactsLoaded extends ContactsState {
  final List<ContactModel> contacts;
  final bool hasMore;
  final int currentPage;

  const ContactsLoaded({
    required this.contacts,
    required this.hasMore,
    required this.currentPage,
  });

  @override
  List<Object?> get props => [contacts, hasMore, currentPage];

  ContactsLoaded copyWith({
    List<ContactModel>? contacts,
    bool? hasMore,
    int? currentPage,
  }) {
    return ContactsLoaded(
      contacts: contacts ?? this.contacts,
      hasMore: hasMore ?? this.hasMore,
      currentPage: currentPage ?? this.currentPage,
    );
  }
}

class ContactsSearchResults extends ContactsState {
  final String query;
  final List<UserModel> users;
  final bool isLoading;
  final bool hasMore;

  const ContactsSearchResults({
    required this.query,
    required this.users,
    required this.isLoading,
    required this.hasMore,
  });

  @override
  List<Object?> get props => [query, users, isLoading, hasMore];
}

class ContactAdded extends ContactsState {
  final ContactModel contact;

  const ContactAdded({
    required this.contact,
  });

  @override
  List<Object?> get props => [contact];
}

class ContactUpdated extends ContactsState {
  final ContactModel contact;

  const ContactUpdated({
    required this.contact,
  });

  @override
  List<Object?> get props => [contact];
}

class ContactRemoved extends ContactsState {
  final String contactId;

  const ContactRemoved({
    required this.contactId,
  });

  @override
  List<Object?> get props => [contactId];
}

class ContactsImported extends ContactsState {
  final int importedCount;
  final int totalCount;

  const ContactsImported({
    required this.importedCount,
    required this.totalCount,
  });

  @override
  List<Object?> get props => [importedCount, totalCount];
}

class ContactsSynced extends ContactsState {
  final int syncedCount;
  final DateTime lastSyncTime;

  const ContactsSynced({
    required this.syncedCount,
    required this.lastSyncTime,
  });

  @override
  List<Object?> get props => [syncedCount, lastSyncTime];
}

/// User profile states
class UserProfileLoaded extends ContactsState {
  final UserModel user;

  const UserProfileLoaded({
    required this.user,
  });

  @override
  List<Object?> get props => [user];
}

class UserActivityLoaded extends ContactsState {
  final String userId;
  final Map<String, dynamic> activity;

  const UserActivityLoaded({
    required this.userId,
    required this.activity,
  });

  @override
  List<Object?> get props => [userId, activity];
}

/// Blocking states
class UserBlocked extends ContactsState {
  final String userId;

  const UserBlocked({
    required this.userId,
  });

  @override
  List<Object?> get props => [userId];
}

class UserUnblocked extends ContactsState {
  final String userId;

  const UserUnblocked({
    required this.userId,
  });

  @override
  List<Object?> get props => [userId];
}

class BlockedUsersLoaded extends ContactsState {
  final List<UserModel> blockedUsers;
  final bool hasMore;

  const BlockedUsersLoaded({
    required this.blockedUsers,
    required this.hasMore,
  });

  @override
  List<Object?> get props => [blockedUsers, hasMore];
}

/// Privacy states
class PrivacySettingsLoaded extends ContactsState {
  final Map<String, dynamic> settings;

  const PrivacySettingsLoaded({
    required this.settings,
  });

  @override
  List<Object?> get props => [settings];
}

class PrivacySettingsUpdated extends ContactsState {
  final Map<String, dynamic> settings;

  const PrivacySettingsUpdated({
    required this.settings,
  });

  @override
  List<Object?> get props => [settings];
}

/// Nearby users states
class NearbyUsersLoaded extends ContactsState {
  final List<UserModel> nearbyUsers;
  final double latitude;
  final double longitude;
  final double radiusKm;

  const NearbyUsersLoaded({
    required this.nearbyUsers,
    required this.latitude,
    required this.longitude,
    required this.radiusKm,
  });

  @override
  List<Object?> get props => [nearbyUsers, latitude, longitude, radiusKm];
}

/// Mutual contacts states
class MutualContactsLoaded extends ContactsState {
  final String userId;
  final List<UserModel> mutualContacts;

  const MutualContactsLoaded({
    required this.userId,
    required this.mutualContacts,
  });

  @override
  List<Object?> get props => [userId, mutualContacts];
}

/// Error states
class ContactsError extends ContactsState {
  final String message;
  final String? code;

  const ContactsError({
    required this.message,
    this.code,
  });

  @override
  List<Object?> get props => [message, code];
}

class ContactsSearchError extends ContactsState {
  final String message;
  final String query;
  final String? code;

  const ContactsSearchError({
    required this.message,
    required this.query,
    this.code,
  });

  @override
  List<Object?> get props => [message, query, code];
}

class ContactsImportError extends ContactsState {
  final String message;
  final String? code;

  const ContactsImportError({
    required this.message,
    this.code,
  });

  @override
  List<Object?> get props => [message, code];
}