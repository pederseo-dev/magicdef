import Hyperswarm from 'hyperswarm'   // Module for P2P networking and connecting peers
import crypto from 'hypercore-crypto' // Cryptographic functions for generating the key in app
import b4a from 'b4a'                 // Module for buffer-to-string and vice-versa conversions 

// Almacén de funciones locales
const functionStore = new Map()
const swarm = new Hyperswarm()

// Variable para controlar si el proceso debe mantenerse vivo
let shouldKeepAlive = false

// Configurar conexiones de peers
swarm.on('connection', (peer) => {
  console.log('�� Peer conectado!')
  
  peer.on('data', (data) => {
    try {
      const message = JSON.parse(data.toString())
      console.log('📨 Mensaje recibido:', message.type)
      handleMessage(message, peer)
    } catch (error) {
      console.error('Error parsing message:', error)
    }
  })
  
  peer.on('error', e => console.error(`Connection error: ${e}`))
})

// Escuchar actualizaciones del swarm
swarm.on('update', () => {
  console.log('🔄 Peers conectados:', swarm.connections.size)
})

// Manejar mensajes entrantes
function handleMessage(message, peer) {
  if (message.type === 'function_call') {
    console.log('⚡ Ejecutando función:', message.key, 'con args:', message.args)
    const func = functionStore.get(message.key)
    if (func) {
      try {
        const result = func(...message.args)
        console.log('✅ Resultado:', result)
        peer.write(JSON.stringify({
          type: 'function_result',
          key: message.key,
          result: result
        }))
      } catch (error) {
        peer.write(JSON.stringify({
          type: 'function_error',
          key: message.key,
          error: error.message
        }))
      }
    } else {
      peer.write(JSON.stringify({
        type: 'function_error',
        key: message.key,
        error: 'Función no encontrada'
      }))
    }
  } else if (message.type === 'function_result') {
    console.log('✅ Resultado recibido para:', message.key, '=', message.result)
    if (message.key === pendingCall?.key) {
      pendingCall.resolve(message.result)
      pendingCall = null
    }
  } else if (message.type === 'function_error') {
    console.log('❌ Error recibido para:', message.key, '=', message.error)
    if (message.key === pendingCall?.key) {
      pendingCall.reject(new Error(message.error))
      pendingCall = null
    }
  }
}

// Variable para manejar llamadas pendientes
let pendingCall = null

// Función auxiliar para esperar de forma síncrona
function waitSync(ms) {
  const start = Date.now()
  while (Date.now() - start < ms) {}
}

// Definir función mágica - INICIA SALA
function peardef(topic, func) {
  if (typeof topic !== 'string') {
    throw new Error('El topic debe ser una cadena de texto')
  }
  
  if (typeof func !== 'function') {
    throw new Error('El segundo parámetro debe ser una función')
  }
  
  // Almacenar función localmente
  functionStore.set(topic, func)
  
  // Crear sala con el topic
  const topicBuffer = crypto.hash(b4a.from(topic))
  const topicHex = b4a.toString(topicBuffer, 'hex')
  console.log('🎯 Iniciando sala:', topicHex.substr(0, 16) + '...')
  
  // Unirse a la sala como servidor
  swarm.join(topicBuffer, { client: true, server: true })
  
  // Marcar que el proceso debe mantenerse vivo
  shouldKeepAlive = true
  
  // Configurar manejo automático del proceso
  if (!process.listenerCount('SIGINT')) {
    process.on('SIGINT', () => {
      console.log('Cerrando magicdef...')
      process.exit(0)
    })
  }
  
  // Mantener el proceso vivo automáticamente
  if (!global.magicdefKeepAlive) {
    global.magicdefKeepAlive = setInterval(() => {
      // Proceso se mantiene vivo
    }, 1000)
  }
}

// Llamar función mágica - SE CONECTA, ENVÍA, RECIBE, CIERRA
function pearcall(topic, ...args) {
  // Intentar ejecutar localmente primero
  if (functionStore.has(topic)) {
    console.log('🏠 Ejecutando función local:', topic)
    return functionStore.get(topic)(...args)
  }
  
  console.log('🌐 Buscando función remota:', topic)
  
  // Crear un swarm temporal para esta llamada
  const tempSwarm = new Hyperswarm()
  let tempPeer = null
  let result = null
  let error = null
  
  // Configurar el peer temporal
  tempSwarm.on('connection', (peer) => {
    console.log('🔗 Conectado al servidor!')
    tempPeer = peer
    
    peer.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString())
        console.log('📨 Respuesta recibida:', message.type)
        
        if (message.type === 'function_result') {
          result = message.result
        } else if (message.type === 'function_error') {
          error = new Error(message.error)
        }
      } catch (err) {
        console.error('Error parsing response:', err)
      }
    })
    
    peer.on('error', e => console.error(`Connection error: ${e}`))
  })
  
  // Conectarse a la sala con el mismo topic
  const topicBuffer = crypto.hash(b4a.from(topic))
  const topicHex = b4a.toString(topicBuffer, 'hex')
  console.log('🎯 Conectándose a sala:', topicHex.substr(0, 16) + '...')
  
  tempSwarm.join(topicBuffer, { client: true, server: false })
  
  // Esperar a que se conecte un peer
  let attempts = 0
  while (!tempPeer && attempts < 50) {
    console.log('⏳ Esperando conexión... (intento', attempts + 1, '/50)')
    waitSync(200)
    attempts++
  }
  
  if (!tempPeer) {
    tempSwarm.destroy()
    throw new Error(`No se pudo conectar a la función "${topic}"`)
  }
  
  // Enviar petición
  console.log('📤 Enviando petición...')
  const message = JSON.stringify({
    type: 'function_call',
    key: topic,
    args: args
  })
  
  tempPeer.write(message)
  
  // Esperar respuesta
  attempts = 0
  while (!result && !error && attempts < 100) {
    waitSync(100)
    attempts++
  }
  
  // Cerrar conexión temporal
  tempSwarm.destroy()
  
  if (error) {
    throw error
  }
  
  if (!result) {
    throw new Error(`Timeout esperando respuesta de "${topic}"`)
  }
  
  console.log('✅ Función ejecutada, cerrando conexión...')
  return result
}

// Exportar las funciones
export { peardef, pearcall }
