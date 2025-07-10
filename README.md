# MagicDef 🪄

> Create and execute remote functions in a peer-to-peer network

[![npm version](https://badge.fury.io/js/magicdef.svg)](https://badge.fury.io/js/magicdef)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MagicDef is a JavaScript library that allows you to share and execute functions in a distributed manner on a peer-to-peer network using Hyperswarm. With MagicDef, you can create applications where multiple nodes can share their functions and execute them remotely without needing a central server.

## ✨ Features

- 🔗 **Peer-to-Peer**: Direct communication between nodes without central server
- 🚀 **Remote Execution**: Execute functions on other peers in the network
- 🔍 **Auto Discovery**: Automatically find available functions
- ⚡ **Real Time**: Instant communication between peers
- 🛡️ **No External Dependencies**: Only requires Hyperswarm for networking
- 📦 **Easy to Use**: Simple and intuitive API

## 🚀 Installation

### Requirements
- **Node.js** 16.0 or higher

### Install
```bash
npm install magicdef
```

## 📖 Basic Usage

### 1. Create Instance and Connect

**ES Modules (Also supports CommonJS):**
```javascript
import MagicDef from 'magicdef'

// Create instance for a specific room
const md = new MagicDef()

// Connect to P2P network
await md.connect('my-function-room')
```

### 2. Export Functions

```javascript
// Define functions to share
function suma(a, b) {
  return a + b
}

function saludar(nombre) {
  return `Hello, ${nombre}!`
}

// Export functions to the network
md.export(suma, saludar)
```

### 3. Execute Functions

```javascript
async function callFunctions(){
  // Execute local or remote function (automatic)
  const resultado = await md.suma(5, 3)
  console.log(resultado) // 8

  const saludo = await md.saludar('World')
  console.log(saludo) // "Hello, World!"
}
callFunctions()
```

### 4. Multiple Instances (Optional)

```javascript
// Create multiple instances for different rooms
const room1 = new MagicDef()
const room2 = new MagicDef()

await room1.connect('chat-room')
await room2.connect('work-room')

// Each instance is independent
room1.export(chatFunction)
room2.export(workFunction)
```

### 5. Example: Peer 1 vs Peer 2

**Peer 1 - Chat room:**
```javascript
// Peer 1 - Chat room
const chatRoom = new MagicDef()
await chatRoom.connect('chat')

function saludar(nombre) {
  return `Hello ${nombre}!`
}

chatRoom.export(saludar)

// Use function from Peer 2
async function results(){
  const resultado = await chatRoom.calcular(5, 3)
  console.log(resultado) // 8
}
results()
```

**Peer 2 - Same chat room:**
```javascript
// Peer 2 - Same chat room
const chatRoom = new MagicDef()
await chatRoom.connect('chat')

function calcular(a, b) {
  return a + b
}

chatRoom.export(calcular)

// Use function from Peer 1
async function results(){
  const saludo = await chatRoom.saludar('World')
  console.log(saludo) // "Hello World!"
}
results
```

## ⚠️ Error Handling

When a remote function cannot be executed, MagicDef returns an error object instead of throwing an exception:

```javascript
const resultado = await MagicDef.funcionInexistente(1, 2)

if (resultado.error) {
  console.log('Error:', resultado.message)
  console.log('Type:', resultado.type)
}
```

### Error Types:

- **`NO_PEERS`**: No peers connected to the network
- **`NO_FUNCTIONS`**: There are peers but they haven't shared functions
- **`FUNCTION_NOT_FOUND`**: The function doesn't exist in any peer
- **`TIMEOUT`**: The function didn't respond within 5 seconds

## ⚠️ Security Considerations
- **Code execution**: MagicDef executes code received from other peers
- **Trust**: Only execute functions from peers you trust
- **Validation**: Consider validating parameters before executing functions
- **Private networks**: Use unique topics for private networks

## 🚀 Advantages of using MagicDef

### 🌐 **Simplified Networks**
- **Automatic configuration** - Just write your room name and you're done
- **Works anywhere** - Home, office, cloud, no additional configuration needed
- **No complex infrastructure** - No servers, ports or DNS needed
- **Direct connection** - Peers find each other automatically
- **Built-in encryption** - Automatic security without configuration
- **Natural scalability** - More peers = more capacity automatically

### 🔄 **Transparent Execution**
- **No configuration** - Works locally and remotely automatically
- **Smart proxy** - Call functions as if they were local
- **Error handling** - Clear responses when something fails

### 🏗️ **Flexible Architecture**
- **Multiple instances** - Each instance is independent
- **Multiple rooms** - Different networks for different purposes
- **Scalability** - Works with 2 or 200 peers

### 💡 **Ideal Use Cases**
- **Distributed microservices** - No need for API Gateway
- **Distributed computing** - Share processing functions
- **Collaborative chatbots** - Shared AI functions
- **Multiplayer games** - Distributed game logic
- **Development tools** - Share utilities between teams

### 🎯 **Why MagicDef?**
- **No VPN needed** - Connect peers directly without tunnels
- **No Tailscale needed** - Automatic discovery without configuration
- **No servers needed** - P2P communication without infrastructure
- **No APIs needed** - Call functions directly as if they were local
- **No WebSockets needed** - Automatic and persistent connections
- **No gRPC needed** - Simple and transparent protocol

---

## 📄 License

This project is under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Links

- [Hyperswarm](https://github.com/hyperswarm/hyperswarm) - Peer discovery and communication
- [Holepunch](https://holepunch.to/) - P2P networking tools
