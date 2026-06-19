// driver_app/lib/main.dart
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'core/sockets/socket_service.dart';

void main() {
  runApp(const DriverApp());
}

class DriverApp extends StatelessWidget {
  const DriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Driver Platform',
      theme: ThemeData(primarySwatch: Colors.green),
      home: const DriverMapScreen(),
    );
  }
}

class DriverMapScreen extends StatefulWidget {
  const DriverMapScreen({super.key});

  @override
  State<DriverMapScreen> createState() => _DriverMapScreenState();
}

class _DriverMapScreenState extends State<DriverMapScreen> {
  late GoogleMapController mapController;
  final SocketService _socketService = SocketService();
  bool isOnline = false;
  Map<String, dynamic>? currentRideRequest; // Holds the incoming request

  static const CameraPosition _initialPosition = CameraPosition(
    target: LatLng(12.9716, 77.5946),
    zoom: 14.0,
  );

  @override
  void initState() {
    super.initState();
    
    // Listen for incoming rides from the SocketService
    _socketService.rideRequestStream.listen((requestData) {
      setState(() {
        currentRideRequest = requestData;
      });
      // Optionally play a sound here!
    });
  }

  void _onMapCreated(GoogleMapController controller) {
    mapController = controller;
  }

  void _toggleOnline(bool value) {
    setState(() => isOnline = value);
    if (isOnline) {
      _socketService.connectAndGoOnline();
    } else {
      _socketService.goOffline();
      setState(() => currentRideRequest = null); // Clear requests if offline
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Driver Dashboard'),
        backgroundColor: Colors.black87,
        foregroundColor: Colors.white,
        actions: [
          Row(
            children: [
              Text(isOnline ? "ONLINE" : "OFFLINE", 
                  style: TextStyle(fontWeight: FontWeight.bold, color: isOnline ? Colors.green : Colors.grey)),
              Switch(
                value: isOnline,
                activeColor: Colors.green,
                onChanged: _toggleOnline,
              ),
            ],
          )
        ],
      ),
      body: Stack(
        children: [
          GoogleMap(
            onMapCreated: _onMapCreated,
            initialCameraPosition: _initialPosition,
            myLocationEnabled: true,
            myLocationButtonEnabled: true,
            zoomControlsEnabled: false,
          ),
          
          if (!isOnline)
            Container(
              color: Colors.black54,
              child: const Center(
                child: Text("You are offline.\nGo online to receive rides.", textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
              ),
            ),

          // 🔥 Show the Incoming Ride Sheet
          if (isOnline && currentRideRequest != null)
            Align(
              alignment: Alignment.bottomCenter,
              child: _buildIncomingRideSheet(),
            )
        ],
      ),
    );
  }

  Widget _buildIncomingRideSheet() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 10)],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text("NEW RIDE REQUEST", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.green)),
          const Divider(),
          const ListTile(
            leading: Icon(Icons.person),
            title: Text("Rider 1"),
            subtitle: Text("4.9 ★"),
            trailing: Text("3 min away\nEst: ₹150", textAlign: TextAlign.right),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => currentRideRequest = null), // Reject
                  child: const Text("IGNORE"),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                  onPressed: () {
                    // Accept the ride!
                    _socketService.acceptRide(currentRideRequest!['ride_id']);
                    setState(() => currentRideRequest = null);
                    // Navigate to navigation screen...
                  },
                  child: const Text("ACCEPT"),
                ),
              ),
            ],
          )
        ],
      ),
    );
  }
}