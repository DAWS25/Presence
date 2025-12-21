import 'package:flutter/material.dart';
import 'dart:async';

enum MessageType { info, success, error, warning }

class Message {
  final String text;
  final MessageType type;
  final DateTime timestamp;
  final Duration duration;

  Message({
    required this.text,
    required this.type,
    required this.duration,
  }) : timestamp = DateTime.now();
}

class MessageService extends ChangeNotifier {
  static final MessageService _instance = MessageService._internal();

  final List<Message> _messages = [];
  final Map<Message, Timer> _messageTimers = {};

  MessageService._internal();

  factory MessageService() {
    return _instance;
  }

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

    // Cancel timer for the previous message if it exists
    if (_messages.isNotEmpty) {
      final previousMessage = _messages.first;
      _messageTimers[previousMessage]?.cancel();
      _messageTimers.remove(previousMessage);
    }

    // Clear the list and add the new message
    _messages.clear();

    _messages.add(message);
    notifyListeners();

    // Auto-remove message after duration
    final timer = Timer(duration, () {
      if (_messages.contains(message)) {
        _messages.remove(message);
        _messageTimers.remove(message);
        notifyListeners();
      }
    });

    _messageTimers[message] = timer;
  }

  void removeMessage(Message message) {
    _messageTimers[message]?.cancel();
    _messageTimers.remove(message);
    _messages.remove(message);
    notifyListeners();
  }

  void clearAll() {
    for (var timer in _messageTimers.values) {
      timer.cancel();
    }
    _messageTimers.clear();
    _messages.clear();
    notifyListeners();
  }
}

// Shortcut methods for easy use
void showInfoMessage(String text, {Duration duration = const Duration(milliseconds: 3330)}) {
  MessageService().showMessage(text, type: MessageType.info, duration: duration);
}

void showSuccessMessage(String text, {Duration duration = const Duration(milliseconds: 3330)}) {
  MessageService().showMessage(text, type: MessageType.success, duration: duration);
}

void showErrorMessage(String text, {Duration duration = const Duration(milliseconds: 3330)}) {
  MessageService().showMessage(text, type: MessageType.error, duration: duration);
}

void showWarningMessage(String text, {Duration duration = const Duration(milliseconds: 3330)}) {
  MessageService().showMessage(text, type: MessageType.warning, duration: duration);
}

