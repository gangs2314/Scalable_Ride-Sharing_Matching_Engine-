// lib/core/api/api_client.dart
import 'dart:convert';
import 'dart:io' show Platform;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  // Dynamically set the base URL based on the device running the app
  static String get baseUrl {
    try {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:3000/api'; // Android Emulator alias for localhost
      } else {
        return 'http://127.0.0.1:3000/api'; // Windows, Mac, or iOS Simulator
      }
    } catch (e) {
      return 'http://127.0.0.1:3000/api'; // Fallback
    }
  }

  static Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<http.Response> post(String endpoint, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$baseUrl$endpoint');
    
    print('📡 Sending POST request to: $url'); // Debug print
    
    return await http.post(
      url,
      headers: headers,
      body: jsonEncode(body),
    );
  }

  static Future<http.Response> get(String endpoint) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$baseUrl$endpoint');
    
    print('📡 Sending GET request to: $url'); // Debug print
    
    return await http.get(url, headers: headers);
  }
}