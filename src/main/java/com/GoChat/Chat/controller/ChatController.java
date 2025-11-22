package com.GoChat.Chat.controller;

import com.GoChat.Chat.domain.ChatMessage;
import com.GoChat.Chat.domain.UserInfo;
import com.GoChat.config.WebSocketEventListener;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final WebSocketEventListener eventListener;

    @MessageMapping("/chat.addUser")
    @SendTo("/topic/public")
    public ChatMessage addUser(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        headerAccessor.getSessionAttributes().put("username", chatMessage.getSender());

        // Build UserInfo from the Join Message
        UserInfo user = UserInfo.builder()
                .username(chatMessage.getSender())
                .gender(chatMessage.getGender())
                .publicKey(chatMessage.getPublicKey())
                .build();

        eventListener.addUser(user);

        return chatMessage;
    }

    @MessageMapping("/chat.sendMessage")
    @SendTo("/topic/public")
    public ChatMessage sendMessage(@Payload ChatMessage chatMessage) {
        return chatMessage;
    }

    @MessageMapping("/chat.private")
    public void sendPrivateMessage(@Payload ChatMessage chatMessage) {
        messagingTemplate.convertAndSend(
                "/topic/private." + chatMessage.getRecipient(),
                chatMessage
        );
    }
}