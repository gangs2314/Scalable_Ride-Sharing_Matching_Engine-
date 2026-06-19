// lib/main.dart
import 'package:flutter/material.dart';
import 'features/auth/auth_screen.dart';

void main() {
  runApp(const RiderApp());
}

class RiderApp extends StatelessWidget {
  const RiderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Rider App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        // This injects Green into all default Flutter components
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.green), 
        useMaterial3: true,
      ),
      home: const AuthScreen(), 
    );
  }
}