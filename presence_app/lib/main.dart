
import 'package:flutter/material.dart';
import 'package:presence_app/screens/index_screen.dart';
import 'package:presence_app/screens/home_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Presence App',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const IndexScreen(),
        '/home': (context) => const HomeScreen(),
      },
    );
  }
}
