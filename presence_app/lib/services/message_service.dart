import 'package:flutter/foundation.dart';

enum MessageType {
  success,
  error,
  warning,
  info,
}

class Message {
  final String text;
  final MessageType type;
  final Duration duration;

  Message({
    required this.text,
    required this.type,
    required this.duration,
  });
}

class MessageService extends ChangeNotifier {
  // Singleton pattern - CRITICAL FIX
  static final MessageService _instance = MessageService._internal();
  
  factory MessageService() {
    return _instance;
  }
  
  MessageService._internal();

  final List<Message> _messages = [];

  List<Message> get messages => List.unmodifiable(_messages);

  void showMessage(
    String text, {
    MessageType type = MessageType.info,
    Duration duration = const Duration(milliseconds: 3330),
  }) {
    final message = Message(
      text: text,
      type: type,
      duration: duration,
    );

    _messages.add(message);
    notifyListeners();

    // Auto-remove message after duration
    Future.delayed(duration, () {
      if (_messages.contains(message)) {
        _messages.remove(message);
        notifyListeners();
      }
    });
  }

  void clearAllMessages() {
    _messages.clear();
    notifyListeners();
  }
}
