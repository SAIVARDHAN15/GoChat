package com.GoChat.config;

import com.GoChat.Chat.domain.ChatMessage;
import com.GoChat.Chat.domain.MessageType;
import com.GoChat.Chat.domain.UserInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final SimpMessageSendingOperations messagingTemplate;

    // Store full UserInfo
    private final Map<String, UserInfo> activeUsers = new ConcurrentHashMap<>();

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = (String) headerAccessor.getSessionAttributes().get("username");

        if (username != null) {
            log.info("User Disconnected: {}", username);
            activeUsers.remove(username);

            var chatMessage = ChatMessage.builder()
                    .type(MessageType.LEAVE)
                    .sender(username)
                    .build();

            messagingTemplate.convertAndSend("/topic/public", chatMessage);

            // Broadcast updated list of UserInfo objects
            messagingTemplate.convertAndSend("/topic/users", activeUsers.values());
        }
    }

    public void addUser(UserInfo user) {
        activeUsers.put(user.getUsername(), user);
        messagingTemplate.convertAndSend("/topic/users", activeUsers.values());
    }
}