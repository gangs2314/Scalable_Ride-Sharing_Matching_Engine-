import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/sockets/socket_service.dart';

class DestinationSearchDelegate extends SearchDelegate<LatLng?> {
  @override
  List<Widget> buildActions(BuildContext context) {
    return [
      IconButton(
        icon: const Icon(Icons.clear),
        onPressed: () => query = '',
      ),
    ];
  }

  @override
  Widget buildLeading(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.arrow_back),
      onPressed: () => close(context, null),
    );
  }

  @override
  Widget buildResults(BuildContext context) {
    return const Center(
      child: Text('No destinations found'),
    );
  }

  @override
  Widget buildSuggestions(BuildContext context) {
    // Mock suggestions - replace with actual search
    final suggestions = [
      LatLng(12.9716, 77.5946), // Bangalore
      LatLng(12.9720, 77.5940), // Another point
    ];

    return ListView.builder(
      itemCount: suggestions.length,
      itemBuilder: (context, index) {
        return ListTile(
          leading: const Icon(Icons.location_on),
          title: Text('Destination ${index + 1}'),
          subtitle: const Text('Sample location'),
          onTap: () => close(context, suggestions[index]),
        );
      },
    );
  }
}

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  late GoogleMapController mapController;
  final SocketService _socketService = SocketService();
  
  Marker? _destinationMarker;
  Marker? _driverMarker;
  Marker? _userMarker;
  LatLng? _selectedDestination;
  LatLng? _currentUserLocation;
  
  bool _isRequesting = false;
  bool _isRideActive = false;
  String? _driverName;
  String? _driverVehicle;
  String? _driverPlate;

  static const CameraPosition _initialPosition = CameraPosition(
    target: LatLng(12.9716, 77.5946),
    zoom: 14.0,
  );

  @override
  void initState() {
    super.initState();
    _initializeTracking();

    _socketService.socketResponseStream.listen((event) {
      print('Received event: $event'); // Debug log
      
      if (event['type'] == 'RIDE_CONFIRMED') {
        _handleRideConfirmed(event['data']);
      }
      
      if (event['type'] == 'DRIVER_MOVED') {
        _handleDriverMoved(event['data']);
      }

      if (event['type'] == 'USER_LOCATION_UPDATED') {
        _handleUserLocationUpdated(event['data']);
      }
    });
  }

  void _handleRideConfirmed(Map<String, dynamic> data) {
    setState(() {
      _isRequesting = false;
      _isRideActive = true;
      _driverName = data['driver_name'];
      _driverVehicle = data['car_model'];
      _driverPlate = data['license_plate'] ?? 'KA 01 AB 1234';
    });
    _showDriverFoundDialog(data);
  }

  void _handleDriverMoved(Map<String, dynamic> data) {
    final lat = data['lat'] as double;
    final lng = data['lon'] as double;
    final driverPos = LatLng(lat, lng);
    
    setState(() {
      _driverMarker = Marker(
        markerId: const MarkerId('driver'),
        position: driverPos,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
        infoWindow: const InfoWindow(title: "Your Driver"),
        rotation: data['bearing']?.toDouble() ?? 0.0,
        anchor: const Offset(0.5, 0.5),
      );
    });

    // Animate camera to show both user and driver
    _fitCameraToMarkers();
  }

  void _handleUserLocationUpdated(Map<String, dynamic> data) {
    setState(() {
      _currentUserLocation = LatLng(data['lat'], data['lng']);
      _userMarker = Marker(
        markerId: const MarkerId('user'),
        position: _currentUserLocation!,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        infoWindow: const InfoWindow(title: "Your Location"),
      );
    });
  }

  void _fitCameraToMarkers() {
    if (_driverMarker == null || _currentUserLocation == null) return;

    final bounds = LatLngBounds(
      southwest: LatLng(
        _driverMarker!.position.latitude < _currentUserLocation!.latitude 
          ? _driverMarker!.position.latitude 
          : _currentUserLocation!.latitude,
        _driverMarker!.position.longitude < _currentUserLocation!.longitude 
          ? _driverMarker!.position.longitude 
          : _currentUserLocation!.longitude,
      ),
      northeast: LatLng(
        _driverMarker!.position.latitude > _currentUserLocation!.latitude 
          ? _driverMarker!.position.latitude 
          : _currentUserLocation!.latitude,
        _driverMarker!.position.longitude > _currentUserLocation!.longitude 
          ? _driverMarker!.position.longitude 
          : _currentUserLocation!.longitude,
      ),
    );

    mapController.animateCamera(
      CameraUpdate.newLatLngBounds(bounds, 100),
    );
  }

  Future<void> _initializeTracking() async {
    await _socketService.connect();
    await _socketService.startLocationTracking();
  }

  @override
  void dispose() {
    _socketService.disconnect();
    super.dispose();
  }

  void _onMapCreated(GoogleMapController controller) {
    mapController = controller;
  }

  void _openDestinationSearch() async {
    final LatLng? result = await showSearch<LatLng?>(
      context: context,
      delegate: DestinationSearchDelegate(),
    );

    if (result != null) {
      mapController.animateCamera(CameraUpdate.newLatLngZoom(result, 16.0));
      setState(() {
        _selectedDestination = result;
        _destinationMarker = Marker(
          markerId: const MarkerId('destination'),
          position: result,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
          infoWindow: const InfoWindow(title: 'Destination'),
        );
      });
    }
  }

  void _sendRideRequest() {
    setState(() => _isRequesting = true);

    _socketService.socket?.emit('create_ride', {
      'destination_lat': _selectedDestination!.latitude,
      'destination_lon': _selectedDestination!.longitude,
    });

    // Show snackbar for debugging
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Finding nearby drivers...'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _cancelRide() {
    setState(() {
      _isRideActive = false;
      _driverMarker = null;
      _driverName = null;
      _driverVehicle = null;
      _driverPlate = null;
    });

    _socketService.socket?.emit('cancel_ride', {});
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Ride cancelled'),
        backgroundColor: Colors.orange,
      ),
    );
  }

  void _showDriverFoundDialog(Map<String, dynamic> data) {
    showModalBottomSheet(
      context: context,
      isDismissible: false,
      enableDrag: false,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        height: 320,
        child: Column(
          children: [
            const Icon(Icons.check_circle, color: Colors.green, size: 64),
            const SizedBox(height: 16),
            const Text(
              "Driver Found!",
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              "${data['driver_name']} is arriving in a ${data['car_model']}",
              style: const TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              data['license_plate'] ?? 'KA 01 AB 1234',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.green,
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                onPressed: () {
                  Navigator.pop(context);
                  _fitCameraToMarkers();
                },
                child: const Text(
                  "Track Driver",
                  style: TextStyle(color: Colors.white, fontSize: 18),
                ),
              ),
            )
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Combine markers
    Set<Marker> allMarkers = {};
    if (_destinationMarker != null) allMarkers.add(_destinationMarker!);
    if (_driverMarker != null) allMarkers.add(_driverMarker!);
    if (_userMarker != null && !_isRideActive) allMarkers.add(_userMarker!);

    return Scaffold(
      body: Stack(
        children: [
          GoogleMap(
            onMapCreated: _onMapCreated,
            initialCameraPosition: _initialPosition,
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            compassEnabled: true,
            trafficEnabled: false,
            buildingsEnabled: true,
            padding: EdgeInsets.only(
              bottom: _selectedDestination == null 
                ? 200 
                : (_isRideActive ? 200 : 300),
            ),
            markers: allMarkers,
          ),

          // Back button when destination selected
          if (_selectedDestination != null && !_isRequesting && !_isRideActive)
            Positioned(
              top: 50,
              left: 20,
              child: CircleAvatar(
                backgroundColor: Colors.white,
                child: IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.black),
                  onPressed: () => setState(() {
                    _selectedDestination = null;
                    _destinationMarker = null;
                  }),
                ),
              ),
            ),

          // Debug buttons for testing (remove in production)
          Positioned(
            top: 50,
            right: 20,
            child: Column(
              children: [
                if (_isRequesting)
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange,
                    ),
                    onPressed: () {
                      // Simulate driver found
                      _handleRideConfirmed({
                        'driver_name': 'Rahul Kumar',
                        'car_model': 'Swift Dzire',
                        'license_plate': 'KA 01 AB 1234'
                      });
                    },
                    child: const Text(
                      "Simulate Match",
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                const SizedBox(height: 8),
                if (_isRideActive)
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                    ),
                    onPressed: () {
                      // Simulate driver moving
                      if (_driverMarker != null) {
                        final newLat = _driverMarker!.position.latitude + 0.001;
                        final newLng = _driverMarker!.position.longitude + 0.001;
                        _handleDriverMoved({
                          'lat': newLat,
                          'lon': newLng,
                          'bearing': 45.0
                        });
                      } else {
                        _handleDriverMoved({
                          'lat': 12.9730,
                          'lon': 77.5960,
                          'bearing': 45.0
                        });
                      }
                    },
                    child: const Text(
                      "Simulate Move",
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
              ],
            ),
          ),

          // Bottom sheet
          Align(
            alignment: Alignment.bottomCenter,
            child: _selectedDestination == null 
              ? _buildDraggableSearchSheet() 
              : (_isRideActive 
                  ? _buildInTransitSheet() 
                  : _buildConfirmRideSheet()),
          ),
        ],
      ),
    );
  }

  Widget _buildDraggableSearchSheet() {
    return DraggableScrollableSheet(
      initialChildSize: 0.35,
      minChildSize: 0.2,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: _sheetDecoration(),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(20),
            children: [
              _buildHandle(),
              const Text(
                "Where to?",
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              GestureDetector(
                onTap: _openDestinationSearch,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 15,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.search, color: Colors.green),
                      SizedBox(width: 10),
                      Text(
                        "Search Destination",
                        style: TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              _buildLocationItem(Icons.home, "Home", "Saved address"),
              _buildLocationItem(Icons.work, "Work", "Saved address"),
            ],
          ),
        );
      },
    );
  }

  Widget _buildConfirmRideSheet() {
    if (_isRequesting) {
      return Container(
        height: 250,
        decoration: _sheetDecoration(),
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: Colors.green),
              SizedBox(height: 20),
              Text(
                "Finding nearby drivers...",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      );
    }

    return Container(
      height: 300,
      padding: const EdgeInsets.all(20),
      decoration: _sheetDecoration(),
      child: Column(
        children: [
          _buildHandle(),
          const Text(
            "Confirm Your Ride",
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const Divider(height: 30),
          const ListTile(
            leading: Icon(Icons.directions_car, color: Colors.green, size: 30),
            title: Text("Eco-Ride (4-seater)"),
            subtitle: Text("Arrival: 4 mins"),
            trailing: Text(
              "₹145.50",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              onPressed: _sendRideRequest,
              child: const Text(
                "CONFIRM PICKUP",
                style: TextStyle(
                  fontSize: 18,
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInTransitSheet() {
    return Container(
      height: 200,
      padding: const EdgeInsets.all(20),
      decoration: _sheetDecoration(),
      child: Column(
        children: [
          _buildHandle(),
          ListTile(
            leading: CircleAvatar(
              backgroundColor: Colors.blue,
              child: const Icon(Icons.person, color: Colors.white),
            ),
            title: Text(
              _driverName ?? "Driver is arriving",
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            subtitle: Text(
              "$_driverPlate • $_driverVehicle",
              style: const TextStyle(fontSize: 14),
            ),
            trailing: const Text(
              "2 mins",
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.green,
                fontSize: 18,
              ),
            ),
          ),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red[50],
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              onPressed: _cancelRide,
              child: const Text(
                "CANCEL RIDE",
                style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  BoxDecoration _sheetDecoration() {
    return BoxDecoration(
      color: Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.1),
          blurRadius: 10,
          spreadRadius: 5,
        ),
      ],
    );
  }

  Widget _buildHandle() {
    return Center(
      child: Container(
        width: 40,
        height: 5,
        margin: const EdgeInsets.only(bottom: 15),
        decoration: BoxDecoration(
          color: Colors.grey[300],
          borderRadius: BorderRadius.circular(10),
        ),
      ),
    );
  }

  Widget _buildLocationItem(IconData icon, String title, String subtitle) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: Colors.grey[200],
        child: Icon(icon, color: Colors.black54),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(subtitle),
      onTap: () {
        // Handle saved location tap
      },
    );
  }
}