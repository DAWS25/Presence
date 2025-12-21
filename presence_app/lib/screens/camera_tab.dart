import 'package:flutter/material.dart';
import 'package:camera/camera.dart';

class CameraTab extends StatefulWidget {
  const CameraTab({super.key});

  @override
  State<CameraTab> createState() => _CameraTabState();
}

class _CameraTabState extends State<CameraTab> {
  CameraController? _controller;
  Future<void>? _initializeControllerFuture;
  int _selectedCameraIdx = 0;
  List<CameraDescription> cameras = [];
  bool _cameraAvailable = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    try {
      cameras = await availableCameras();
      if (cameras.isEmpty) {
        _setUnavailable('No cameras available on this device');
        return;
      }

      _controller = CameraController(
        cameras[_selectedCameraIdx],
        ResolutionPreset.high,
      );

      _initializeControllerFuture = _controller!.initialize();
      await _initializeControllerFuture;
      setState(() {
        _cameraAvailable = true;
      });
    } catch (e) {
      _setUnavailable('Camera not available: $e\n\nNote: Camera may not work on Android emulator. Use a physical device or enable camera emulation in AVD settings.');
    }
  }

  void _setUnavailable(String message) {
    if (!mounted) return;
    setState(() {
      _cameraAvailable = false;
      _errorMessage = message;
    });
  }

  Future<void> _switchCamera() async {
    if (cameras.length < 2) return;

    _selectedCameraIdx = (_selectedCameraIdx + 1) % cameras.length;

    try {
      await _controller?.dispose();

      _controller = CameraController(
        cameras[_selectedCameraIdx],
        ResolutionPreset.high,
      );

      _initializeControllerFuture = _controller!.initialize();
      await _initializeControllerFuture;
      setState(() {});
    } catch (e) {
      _setUnavailable('Error switching camera: $e');
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_cameraAvailable) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.camera_alt_outlined,
                size: 64,
                color: Colors.grey,
              ),
              const SizedBox(height: 16),
              Text(
                _errorMessage ?? 'Camera not available',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {
                  _errorMessage = null;
                  _initializeCamera();
                },
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_initializeControllerFuture == null || _controller == null) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    return FutureBuilder<void>(
      future: _initializeControllerFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.done) {
          return Stack(
            children: [
              CameraPreview(_controller!),
              Positioned(
                bottom: 20,
                right: 20,
                child: FloatingActionButton(
                  onPressed: _switchCamera,
                  tooltip: 'Switch Camera',
                  child: const Icon(Icons.flip_camera_ios),
                ),
              ),
            ],
          );
        } else if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('Error: ${snapshot.error}'),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {
                    _cameraAvailable = false;
                    _initializeCamera();
                  },
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        } else {
          return const Center(
            child: CircularProgressIndicator(),
          );
        }
      },
    );
  }
}

