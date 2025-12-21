import 'dart:async';
import 'package:flutter/material.dart';
import 'package:presence_app/screens/dashboard_tab.dart';
import 'package:presence_app/screens/camera_tab.dart';
import 'package:presence_app/screens/presence_tab.dart';
import 'package:presence_app/screens/settings_tab.dart';
import 'package:presence_app/services/message_service.dart';
import 'package:presence_app/widgets/status_bar.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  late Timer _periodicTimer;

  final List<Widget> _screens = [
    const DashboardTab(),
    const CameraTab(),
    const PresenceTab(),
    const SettingsTab(),
  ];

  @override
  void initState() {
    super.initState();
    // Show greeting message when entering home screen
    MessageService().showMessage(
      'Welcome back!',
      type: MessageType.success,
    );

    // Show current time every 10 seconds (allows 3.33s display + 6.67s gap before next message)
    _periodicTimer = Timer.periodic(
      const Duration(seconds: 10),
      (_) {
        final now = DateTime.now();
        final timeString = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}';
        MessageService().showMessage(
          'Current time: $timeString',
          type: MessageType.info,
        );
      },
    );
  }

  @override
  void dispose() {
    _periodicTimer.cancel();
    super.dispose();
  }

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
      body: Column(
        children: [
          const StatusBar(),
          Expanded(child: _screens[_selectedIndex]),
        ],
      ),
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
