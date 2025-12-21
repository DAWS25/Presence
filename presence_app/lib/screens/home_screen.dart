import 'package:flutter/material.dart';
import 'package:presence_app/screens/dashboard_tab.dart';
import 'package:presence_app/screens/camera_tab.dart';
import 'package:presence_app/screens/presence_tab.dart';
import 'package:presence_app/screens/settings_tab.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

  final List<Widget> _screens = [
    const DashboardTab(),
    const CameraTab(),
    const PresenceTab(),
    const SettingsTab(),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('MyPlace'),
      ),
      body: _screens[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        items: const <BottomNavigationBarItem>[
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard, size: 28),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.camera, size: 28),
            label: 'Camera',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person, size: 28),
            label: 'Presence',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings, size: 28),
            label: 'Settings',
          ),
        ],
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
        backgroundColor: Colors.white,
        selectedItemColor: Colors.deepPurple,
        unselectedItemColor: Colors.grey,
        showUnselectedLabels: true,
        type: BottomNavigationBarType.fixed,
      ),
    );
  }
}
