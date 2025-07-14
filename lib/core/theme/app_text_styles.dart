import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTextStyles {
  static TextStyle get _baseTextStyle => GoogleFonts.inter();

  static TextStyle get heading1 => _baseTextStyle.copyWith(
        fontSize: 32,
        fontWeight: FontWeight.w700,
        height: 1.2,
      );

  static TextStyle get heading2 => _baseTextStyle.copyWith(
        fontSize: 24,
        fontWeight: FontWeight.w600,
        height: 1.3,
      );

  static TextStyle get heading3 => _baseTextStyle.copyWith(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        height: 1.3,
      );

  static TextStyle get subtitle1 => _baseTextStyle.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w500,
        height: 1.4,
      );

  static TextStyle get subtitle2 => _baseTextStyle.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        height: 1.4,
      );

  static TextStyle get body1 => _baseTextStyle.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        height: 1.5,
      );

  static TextStyle get body2 => _baseTextStyle.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        height: 1.5,
      );

  static TextStyle get caption => _baseTextStyle.copyWith(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        height: 1.4,
      );

  static TextStyle get overline => _baseTextStyle.copyWith(
        fontSize: 10,
        fontWeight: FontWeight.w400,
        height: 1.4,
        letterSpacing: 1.5,
      );

  static TextStyle get button => _baseTextStyle.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        height: 1.2,
        letterSpacing: 0.5,
      );

  static TextStyle get chatMessage => _baseTextStyle.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        height: 1.3,
      );

  static TextStyle get chatTime => _baseTextStyle.copyWith(
        fontSize: 11,
        fontWeight: FontWeight.w400,
        height: 1.2,
      );

  static TextStyle get chatName => _baseTextStyle.copyWith(
        fontSize: 17,
        fontWeight: FontWeight.w500,
        height: 1.2,
      );

  static TextStyle get tabLabel => _baseTextStyle.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        height: 1.2,
      );
}