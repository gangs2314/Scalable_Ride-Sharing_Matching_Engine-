import 'dart:async';
import 'dart:io' show Platform;
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart'; // Add this

class SocketService {
  static final SocketService _instance = SocketService._internal();
  io.Socket? socket;
  StreamSubscription<Position>? _positionStream;

  // 🔥 1. Add a StreamController to broadcast backend events to the UI
  final _socketResponseController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get socketResponseStream => _socketResponseController.stream;

  factory SocketService() => _instance;
  SocketService._internal();

  String get baseUrl {
    if (Platform.isAndroid) return 'http://10.0.2.2:3000';
    return 'http://127.0.0.1:3000';
  }

  Future<void> connect() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    if (token == null) return;

    socket = io.io(baseUrl, io.OptionBuilder()
        .setTransports(['websocket'])
        .disableAutoConnect()
        .setAuth({'token': token})
        .build());

    socket?.connect();
    
    socket?.onConnect((_) => print('🔌 Connected to WebSocket'));

    // 🔥 2. Listen for 'ride_confirmed' from the Node.js server
    socket?.on('ride_confirmed', (data) {
      print('🚗 Ride Matched: $data');
      _socketResponseController.add({'type': 'RIDE_CONFIRMED', 'data': data});
    });

    // We will listen for real driver location updates here later
    socket?.on('driver_location_update', (data) {
      _socketResponseController.add({'type': 'DRIVER_MOVED', 'data': data});
    });

    socket?.onDisconnect((_) => print('🔌 Disconnected'));
  }

  Future<void> startLocationTracking() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen((Position position) {
      sendLocation(position.latitude, position.longitude);
    });
  }

  void sendLocation(double lat, double lon) {
    if (socket != null && socket!.connected) {
      socket?.emit('update_location', {'lat': lat, 'lon': lon});
    }
  }

  void disconnect() {
    _positionStream?.cancel();
    socket?.disconnect();
  }

  // --- FOR TESTING: Simulate a driver moving towards a destination ---
  void simulateDriverMovement(LatLng start, LatLng end) {
    print("Starting driver simulation...");
    double latStep = (end.latitude - start.latitude) / 10;
    double lngStep = (end.longitude - start.longitude) / 10;
    int stepCount = 0;

    Timer.periodic(const Duration(seconds: 1), (timer) {
      if (stepCount >= 10) {
        timer.cancel();
        return;
      }
      
      double currentLat = start.latitude + (latStep * stepCount);
      double currentLng = start.longitude + (lngStep * stepCount);
      
      // Spoof the event that would normally come from the socket
      _socketResponseController.add({
        'type': 'DRIVER_MOVED',
        'data': {'lat': currentLat, 'lon': currentLng}
      });
      
      stepCount++;
    });
  }
}