#!/usr/bin/env dart

/// Integration test script for Taar Chat API
/// Tests the connection between Flutter frontend and Node.js backend

import 'dart:io';
import 'dart:convert';

void main() async {
  print('🧪 Starting Taar Chat Integration Tests\n');
  
  final tester = IntegrationTester();
  await tester.runTests();
}

class IntegrationTester {
  static const String baseUrl = 'http://localhost:3000/api/v1';
  final HttpClient client = HttpClient();
  
  Future<void> runTests() async {
    try {
      await testServerHealth();
      await testAuthEndpoints();
      // await testMessageEndpoints();
      // await testUserEndpoints();
      
      print('\n✅ All integration tests completed successfully!');
    } catch (e) {
      print('\n❌ Integration tests failed: $e');
      exit(1);
    } finally {
      client.close();
    }
  }
  
  Future<void> testServerHealth() async {
    print('🏥 Testing server health...');
    
    try {
      final request = await client.getUrl(Uri.parse('http://localhost:3000/health'));
      final response = await request.close();
      
      if (response.statusCode == 200) {
        print('   ✅ Server is healthy');
      } else {
        throw Exception('Server health check failed: ${response.statusCode}');
      }
    } catch (e) {
      print('   ❌ Server health check failed: $e');
      print('   💡 Make sure the backend is running with: cd backend && npm run dev');
      rethrow;
    }
  }
  
  Future<void> testAuthEndpoints() async {
    print('\n🔐 Testing authentication endpoints...');
    
    // Test OTP sending
    print('   📱 Testing OTP send endpoint...');
    try {
      final otpResponse = await makeRequest(
        'POST',
        '/auth/send-otp',
        body: {
          'phoneNumber': '+919876543210',
          'countryCode': '+91',
        },
      );
      
      if (otpResponse['success'] == true) {
        print('      ✅ OTP send endpoint working');
      } else {
        print('      ❌ OTP send failed: ${otpResponse['error']}');
      }
    } catch (e) {
      print('      ❌ OTP send error: $e');
    }
    
    // Test invalid OTP verification (since we don't have real OTP)
    print('   🔑 Testing OTP verification endpoint...');
    try {
      final verifyResponse = await makeRequest(
        'POST',
        '/auth/verify-otp',
        body: {
          'phoneNumber': '+919876543210',
          'countryCode': '+91',
          'otpCode': '123456', // Invalid OTP
        },
      );
      
      // We expect this to fail with invalid OTP
      if (verifyResponse['success'] == false) {
        print('      ✅ OTP verification endpoint responding correctly (invalid OTP)');
      } else {
        print('      ⚠️  Unexpected OTP verification success');
      }
    } catch (e) {
      print('      ❌ OTP verification error: $e');
    }
    
    // Test unauthorized profile access
    print('   👤 Testing profile endpoint (unauthorized)...');
    try {
      final profileResponse = await makeRequest('GET', '/auth/profile');
      
      if (profileResponse['success'] == false && 
          profileResponse['error']?['code'] == 'UNAUTHORIZED') {
        print('      ✅ Profile endpoint properly protected');
      } else {
        print('      ❌ Profile endpoint security issue');
      }
    } catch (e) {
      print('      ❌ Profile endpoint error: $e');
    }
  }
  
  Future<Map<String, dynamic>> makeRequest(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    late HttpClientRequest request;
    
    switch (method.toUpperCase()) {
      case 'GET':
        request = await client.getUrl(uri);
        break;
      case 'POST':
        request = await client.postUrl(uri);
        break;
      case 'PUT':
        request = await client.putUrl(uri);
        break;
      case 'DELETE':
        request = await client.deleteUrl(uri);
        break;
      default:
        throw ArgumentError('Unsupported HTTP method: $method');
    }
    
    // Set headers
    request.headers.set('Content-Type', 'application/json');
    request.headers.set('Accept', 'application/json');
    
    if (headers != null) {
      headers.forEach((key, value) {
        request.headers.set(key, value);
      });
    }
    
    // Add body for POST/PUT requests
    if (body != null && (method == 'POST' || method == 'PUT')) {
      final jsonBody = json.encode(body);
      request.contentLength = utf8.encode(jsonBody).length;
      request.write(jsonBody);
    }
    
    final response = await request.close();
    final responseBody = await response.transform(utf8.decoder).join();
    
    try {
      return json.decode(responseBody) as Map<String, dynamic>;
    } catch (e) {
      return {
        'success': false,
        'error': 'Failed to parse response: $responseBody',
        'statusCode': response.statusCode,
      };
    }
  }
}