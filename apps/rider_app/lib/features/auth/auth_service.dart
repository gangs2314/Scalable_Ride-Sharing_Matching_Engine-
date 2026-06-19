// lib/features/auth/auth_service.dart
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/api/api_client.dart';

class AuthService {
  Future<bool> loginWithPhone(String phone) async {
    try {
      final response = await ApiClient.post('/auth/login', {
        'phone': phone,
        'role': 'RIDER'
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final token = data['data']['token'];

        // Save the JWT token securely
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('jwt_token', token);
        
        print('✅ Login successful! Token saved.');
        return true;
      } else {
        print('❌ Login failed: ${response.body}');
        return false;
      }
    } catch (e) {
      print('❌ Error during login: $e');
      return false;
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');
  }
}