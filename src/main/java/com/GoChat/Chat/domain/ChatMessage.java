package com.GoChat.Chat.domain;

import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ChatMessage {
    private String content;
    private String sender;
    private String recipient;
    private String gender;
    private String publicKey;
    private String timestamp;
    private MessageType type;
}