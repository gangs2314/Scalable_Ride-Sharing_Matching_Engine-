// driver_app/lib/core/sockets/socket_service.dart
import 'dart:async';
import 'dart:io' show Platform;
import 'package:socket_io_client/socket_io_client.dart' as io;

class SocketService {
  static final SocketService _instance = SocketService._internal();
  io.Socket? socket;
  
  // Broadcasts incoming rides to the UI
  final _rideRequestController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get rideRequestStream => _rideRequestController.stream;

  factory SocketService() => _instance;
  SocketService._internal();

  String get baseUrl {
    if (Platform.isAndroid) return 'http://10.0.2.2:3000';
    return 'http://127.0.0.1:3000';
  }

  void connectAndGoOnline() {
    socket = io.io(baseUrl, io.OptionBuilder()
        .setTransports(['websocket'])
        .disableAutoConnect()
        // Here we could pass a driver token
        .build());

    socket?.connect();
    
    socket?.onConnect((_) {
      print('🟢 Driver Online and Listening!');
      // Register this socket as a driver on the backend
      socket?.emit('driver_online', {'driver_id': 'driver_123', 'name': 'Rahul'});
    });

    // 🔥 This is the critical part: Listening for new rides!
    socket?.on('new_ride_request', (data) {
      print('🚨 New Ride Request Received: $data');
      _rideRequestController.add(data);
    });

    socket?.onDisconnect((_) => print('🔴 Driver Offline'));
  }

  void acceptRide(String rideId) {
    socket?.emit('accept_ride', {'ride_id': rideId});
  }

  void goOffline() {
    socket?.disconnect();
  }
}