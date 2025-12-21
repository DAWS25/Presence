import 'package:flutter_test/flutter_test.dart';
import 'package:presence_app/services/message_service.dart';

void main() {
  group('MessageService', () {
    test('should be a singleton', () {
      final instance1 = MessageService();
      final instance2 = MessageService();
      
      expect(identical(instance1, instance2), true);
    });

    test('should add and auto-clear messages after duration', () async {
      final service = MessageService();
      service.clearAllMessages(); // Start with clean slate
      
      expect(service.messages.length, 0);
      
      // Add a message with 100ms duration for quick testing
      service.showMessage(
        'Test message',
        type: MessageType.info,
        duration: const Duration(milliseconds: 100),
      );
      
      // Message should be added immediately
      expect(service.messages.length, 1);
      expect(service.messages.first.text, 'Test message');
      
      // Wait for the auto-clear duration plus a small buffer
      await Future.delayed(const Duration(milliseconds: 150));
      
      // Message should be cleared
      expect(service.messages.length, 0);
    });

    test('should handle multiple messages and clear them independently', () async {
      final service = MessageService();
      service.clearAllMessages();
      
      // Add first message with 100ms duration
      service.showMessage(
        'First message',
        type: MessageType.info,
        duration: const Duration(milliseconds: 100),
      );
      
      // Add second message with 200ms duration
      await Future.delayed(const Duration(milliseconds: 50));
      service.showMessage(
        'Second message',
        type: MessageType.success,
        duration: const Duration(milliseconds: 200),
      );
      
      // Both messages should be present
      expect(service.messages.length, 2);
      
      // After 120ms, first message should be cleared
      await Future.delayed(const Duration(milliseconds: 80));
      expect(service.messages.length, 1);
      expect(service.messages.first.text, 'Second message');
      
      // After another 150ms, second message should also be cleared
      await Future.delayed(const Duration(milliseconds: 150));
      expect(service.messages.length, 0);
    });

    test('should clear all messages immediately with clearAllMessages', () {
      final service = MessageService();
      service.clearAllMessages();
      
      service.showMessage('Message 1', type: MessageType.info);
      service.showMessage('Message 2', type: MessageType.success);
      service.showMessage('Message 3', type: MessageType.warning);
      
      expect(service.messages.length, 3);
      
      service.clearAllMessages();
      
      expect(service.messages.length, 0);
    });
  });
}
