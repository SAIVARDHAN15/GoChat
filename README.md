# GoChat - Secure Real-Time Messaging Application

GoChat is a real-time chat application built with Spring Boot, WebSockets, and custom End-to-End Encryption (E2EE). It supports public chat rooms, private messaging, live user presence, and is fully Docker-deployable.

Access Here : https://gochat-c472.onrender.com

---

## 🚀 Features

- **Real-Time Messaging:** Instant delivery using WebSockets (STOMP + SockJS).
- **End-to-End Encryption (E2EE):** Custom Columnar Transposition Cipher implemented on the client-side. Server only relays encrypted content.
- **Public Lounge:** A shared chat room for all connected users.
- **Private 1-on-1 Chats:** Secure and encrypted communication channel.
- **User Presence:** Live list of online users with real-time status updates.
- **Auto-Generated Avatars:** Based on initials and gender indicators.
- **Lightweight Frontend:** HTML, CSS, and Vanilla JavaScript.
- **Containerized Deployment:** Dockerfile + Render/Cloud-ready architecture.

---

## 🛠 Tech Stack

### Backend
- Java 21
- Spring Boot 3.x
- Spring WebSocket + STOMP
- Maven

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript (ES6)
- STOMP.js + SockJS

### DevOps
- Docker
- Render Cloud Hosting (or Railway)


## 🔐 Encryption Logic

GoChat uses a symmetric **Columnar Transposition Cipher** on the frontend.

- **Shared Key:** Derived from sorted usernames (e.g., Alice + Bob → AliceBob)
- **Cipher:** Message written row-by-row in a grid, read column-by-column
- **Server:** Never sees decrypted messages

---

## ⚙️ Getting Started

### Prerequisites
- Java 21+
- Maven
- Docker (optional for container build)

---

## ▶️ Run Locally

### Clone the repository

git clone https://github.com/SAIVARDHAN15/GoChat.git


### Build the project

./mvnw clean package

### Run the application

java -jar target/Chat-0.0.1-SNAPSHOT.jar


### Access the UI
Open your browser at: http://localhost:8080

---

## 🐳 Run with Docker

### Build Docker image

docker build -t gochat-app .


### Run container

docker run -p 8080:8080 gochat-app

---
