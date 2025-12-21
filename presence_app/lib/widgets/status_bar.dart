import 'package:flutter/material.dart';
import 'package:presence_app/services/message_service.dart';

class StatusBar extends StatelessWidget {
  const StatusBar({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: MessageService(),
      builder: (context, _) {
        final messages = MessageService().messages;
        final currentMessage = messages.isNotEmpty ? messages.last : null;

        return AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          height: 32,
          color: _getColorForType(currentMessage?.type),
          child: currentMessage != null
              ? Center(
                  child: Text(
                    currentMessage.text,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                    ),
                    textAlign: TextAlign.center,
                  ),
                )
              : const SizedBox.expand(),
        );
      },
    );
  }

  Color _getColorForType(MessageType? type) {
    switch (type) {
      case MessageType.success:
        return Colors.teal[600]!;
      case MessageType.error:
        return Colors.red[700]!;
      case MessageType.warning:
        return Colors.amber[700]!;
      case MessageType.info:
      case null:
        return Colors.blueGrey[700]!;
    }
  }
}
