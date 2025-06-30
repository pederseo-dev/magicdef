import Hyperswarm from 'hyperswarm'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import readline from 'readline'

const swarm = new Hyperswarm()

// Configurar readline para input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Configurar conexiones de peers
swarm.on('connection', (peer) => {
  const name = b4a.toString(peer.remotePublicKey, 'hex').substr(0, 6)
  console.log(`🔗 Peer conectado: ${name}`)
  
  peer.on('data', (data) => {
    const message = data.toString()
    console.log(`📨 <${name}>: ${message}`)
  })
  
  peer.on('error', e => console.log(`❌ Error de conexión: ${e}`))
})

// Escuchar actualizaciones del swarm
swarm.on('update', () => {
  console.log(`🔄 Peers conectados: ${swarm.connections.size}`)
})

// Función para crear sala de chat
async function createChatRoom() {
  const topicBuffer = crypto.randomBytes(32)
  const topic = b4a.toString(topicBuffer, 'hex')
  console.log(`🎯 Creando sala: ${topic}`)
  
  const discovery = swarm.join(topicBuffer, { client: true, server: true })
  await discovery.flushed()
  
  console.log('✅ Sala creada y lista')
  return topic
}

// Función para unirse a sala
async function joinChatRoom(topicStr) {
  const topicBuffer = b4a.from(topicStr, 'hex')
  console.log(`🎯 Uniéndose a sala: ${topicStr}`)
  
  const discovery = swarm.join(topicBuffer, { client: true, server: true })
  await discovery.flushed()
  
  console.log('✅ Conectado a la sala')
}

// Función para enviar mensaje
function sendMessage(message) {
  const peers = [...swarm.connections]
  console.log(`📤 Enviando a ${peers.length} peers: ${message}`)
  
  for (const peer of peers) {
    peer.write(message)
  }
}

// Función para mostrar menú
function showMenu() {
  console.log('\n=== CHAT P2P TERMINAL ===')
  console.log('1. Crear nueva sala')
  console.log('2. Unirse a sala existente')
  console.log('3. Enviar mensaje')
  console.log('4. Ver peers conectados')
  console.log('5. Salir')
  console.log('========================')
}

// Función principal
async function main() {
  let currentTopic = null
  
  showMenu()
  
  rl.on('line', async (input) => {
    const choice = input.trim()
    
    switch (choice) {
      case '1':
        currentTopic = await createChatRoom()
        console.log(`Sala creada: ${currentTopic}`)
        break
        
      case '2':
        rl.question('Ingresa el topic de la sala: ', async (topic) => {
          try {
            await joinChatRoom(topic)
            currentTopic = topic
          } catch (error) {
            console.error('Error al unirse:', error.message)
          }
        })
        return
        
      case '3':
        if (swarm.connections.size === 0) {
          console.log('❌ No hay peers conectados')
          break
        }
        rl.question('Mensaje: ', (message) => {
          sendMessage(message)
        })
        return
        
      case '4':
        console.log(`Peers conectados: ${swarm.connections.size}`)
        break
        
      case '5':
        console.log('Cerrando...')
        rl.close()
        process.exit(0)
        break
        
      default:
        console.log('Opción inválida')
    }
    
    showMenu()
  })
}

// Manejar Ctrl+C
process.on('SIGINT', () => {
  console.log('\nCerrando chat...')
  rl.close()
  process.exit(0)
})

console.log('🚀 Iniciando Chat P2P Terminal...')
main() 