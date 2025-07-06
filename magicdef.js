import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'

// CONFIGURACIÓN INICIAL
const swarm = new Hyperswarm()

// Clase MagicDef - Librería completa
class MagicDef {
  // Propiedades estáticas
  static ownfunctions = {}
  static nodesFunctions = {}
  static peerDetectionSetup = false

  // Método estático privado para analizar funciones (solo uso interno)
  static #analyzer(...funcs) {
    const functionsMetadata = []
    
    funcs.forEach(func => {
      // Convertir la función a string para analizarla
      const funcString = func.toString()
      
      // Extraer el nombre de la función (si es una función nombrada)
      let functionName = func.name || 'anonymous'
      
      // Si es una función anónima asignada a una variable, intentar obtener el nombre
      if (functionName === 'anonymous' && funcString.includes('=')) {
        // Buscar patrones como: const nombre = (params) => o let nombre = function(params)
        const nameMatch = funcString.match(/(?:const|let|var)\s+(\w+)\s*=/)
        if (nameMatch) {
          functionName = nameMatch[1]
        }
      }
      
      // Extraer los parámetros
      let parameters = []
      
      // Buscar parámetros en diferentes formatos de función
      const paramPatterns = [
        /function\s*\w*\s*\(([^)]*)\)/, // function nombre(params)
        /\(([^)]*)\)\s*=>/, // (params) =>
        /^\s*([^=]+)=>\s*{/, // params => {
        /^\s*([^=]+)=>\s*[^{]/, // params => expression
      ]
      
      for (const pattern of paramPatterns) {
        const match = funcString.match(pattern)
        if (match && match[1]) {
          const paramString = match[1].trim()
          if (paramString) {
            // Dividir por comas y limpiar espacios
            parameters = paramString.split(',').map(param => param.trim())
            break
          }
        }
      }
      
      // Agregar metadata a la lista
      functionsMetadata.push({
        functionName: functionName,
        parameters: parameters
      })
      
      // Almacenar la función original
      MagicDef.ownfunctions[functionName] = func
    })
    
    return functionsMetadata
  }

  // Método estático privado para enviar mensaje a todos los peers
  static #sendMessage(message) {
    const peers = [...swarm.connections]
    
    for (const peer of peers) {
      peer.write(message)
    }
  }

  // Método estático privado para manejar mensajes recibidos
  static #handleMessage(message, peerName) {
    // Intentar parsear como JSON
    try {
      const parsedMessage = JSON.parse(message)
      
      // si se recibe un mensaje con {ownfunctions:[]} cargar las funciones en nodesFunctions
      if (parsedMessage.ownfunctions) {
        const peerId = peerName // Usar el peerName como ID
        
        // Verificar si ya tenemos funciones de este peer
        if (MagicDef.nodesFunctions[peerId]) {
          return
        }
        
        // Inicializar array de funciones para este peer
        MagicDef.nodesFunctions[peerId] = []
        
        // Agregar cada función del mensaje
        parsedMessage.ownfunctions.forEach(func => {
          MagicDef.nodesFunctions[peerId].push(func)
        })
        
        console.log(`✅ Funciones cargadas del peer ${peerId}: ${parsedMessage.ownfunctions.length} función(es)`)
        parsedMessage.ownfunctions.forEach(func => {
          console.log(`   - ${func.functionName} (${func.parameters.join(', ')})`)
        })
        
      }
      
      //si recibe un mensaje de tipo {callFunction:{functionName,parameters}} llamar a la funcion
      if (parsedMessage.callFunction) {
        console.log(`📨 Mensaje recibido:`, JSON.stringify(parsedMessage, null, 2))
        const { functionName, parameters } = parsedMessage.callFunction
        console.log(`📨 Recibida llamada a función: ${functionName}(${parameters.join(', ')})`)
        
        // si el nombre esta dentro de ownFunctions ejecutar la funcion
        if (MagicDef.ownfunctions[functionName]) {
          console.log(`✅ Ejecutando función local: ${functionName}`)
          
          try {
            // Ejecutar la función
            const resultado = MagicDef.ownfunctions[functionName](...parameters)
            
            // Si la función retorna algo, enviar respuesta a todos los peers
            if (resultado !== undefined) {
              console.log(`📤 Enviando resultado: ${resultado}`)
              const responseMessage = {
                return: resultado
              }
              MagicDef.sendMessage(JSON.stringify(responseMessage))
            }
          } catch (error) {
            console.log(`❌ Error ejecutando función: ${error.message}`)
          }
        } else {
          console.log(`❌ Función '${functionName}' no encontrada en funciones propias`)
        }
      }
      
      //si recibe un mensaje de tipo {return:resultado} procesar respuesta
      if (parsedMessage.return !== undefined) {
        console.log(`📨 Respuesta recibida: ${parsedMessage.return}`)
        
        // Si hay una respuesta pendiente, resolverla
        if (MagicDef._pendingResponse) {
          clearTimeout(MagicDef._pendingResponse.timeout)
          MagicDef._pendingResponse.resolve(parsedMessage.return)
          MagicDef._pendingResponse = null
        }
      }
    } catch (error) {
      // Si no es JSON, es mensaje de texto normal
      console.log(`📨 <${peerName}>: ${message}`)
    }
  }

  // Método estático privado para mostrar todas las funciones disponibles
  static #showAllFunctions() {
    console.log(`\n📋 FUNCIONES DISPONIBLES:`)
    
    const totalFunctions = Object.values(MagicDef.nodesFunctions).flat().length
    console.log(`📊 Total: ${totalFunctions} funciones de ${Object.keys(MagicDef.nodesFunctions).length} peers`)
    
    if (totalFunctions === 0) {
      console.log(`   No hay funciones disponibles`)
    } else {
      Object.entries(MagicDef.nodesFunctions).forEach(([peerId, ownfunctions]) => {
        console.log(`   Peer ${peerId}:`)
        ownfunctions.forEach((func, index) => {
          console.log(`     ${index + 1}. ${func.functionName}`)
          console.log(`        Parámetros: ${func.parameters.join(', ')}`)
        })
      })
    }
    console.log('')
  }

  // Método estático privado para remover funciones de un peer desconectado
  static #removePeerFunctions(peerName) {
    if (MagicDef.nodesFunctions[peerName]) {
      delete MagicDef.nodesFunctions[peerName]
    }
  }

  // Método estático privado para configurar detección de peers
  static #setupPeerDetection() {
    // Cuando se conecta un peer
    swarm.on('connection', (peer) => {
      const peerId = b4a.toString(peer.remotePublicKey, 'hex')
      const peerName = peerId.substr(0, 6)
      console.log(`🔗 Peer conectado: ${peerName}`)
      
      // Enviar funciones al peer que se acaba de conectar
      if (Object.keys(MagicDef.ownfunctions).length > 0) {
        const functionsMetadata = MagicDef.getFunctionsMetadata()
        const message = {
          ownfunctions: functionsMetadata
        }
        console.log(`📤 Enviando funciones al nuevo peer ${peerName}`)
        peer.write(JSON.stringify(message))
      }
      
      // Cuando recibimos datos
      peer.on('data', (data) => {
        const message = data.toString()
        MagicDef.#handleMessage(message, peerName)
      })
      
      // Si hay error
      peer.on('error', e => {
        console.log(`❌ Error con ${peerName}: ${e}`)
      })
      
      // Cuando se desconecta
      peer.on('close', () => {
        console.log(`🔌 Peer desconectado: ${peerName}`)
        // Remover las funciones del peer desconectado
        MagicDef.#removePeerFunctions(peerName)
      })
    })
    
    // Escuchar actualizaciones del swarm
    swarm.on('update', () => {
      // Silencioso
    })
  }

  // Método estático público para exportar funciones (uso externo)
  static export(...funcs) {
    // Limpiar funciones anteriores
    MagicDef.ownfunctions = {}
    
    // Analizar y almacenar las funciones
    const functionsMetadata = MagicDef.#analyzer(...funcs)
    
    // Enviar funciones a todos los peers ya conectados
    console.log(`📊 Peers conectados: ${swarm.connections.size}`)
    if (swarm.connections.size > 0) {
      const message = {
        ownfunctions: functionsMetadata
      }
      MagicDef.#sendMessage(JSON.stringify(message))
    }
  }

  // Método para listar todas las funciones disponibles
  static listFunctions() {
    return {
      own: Object.keys(MagicDef.ownfunctions),
      peers: MagicDef.nodesFunctions
    }
  }

  // Método para obtener metadata de todas las funciones
  static getFunctionsMetadata() {
    return MagicDef.#analyzer(...Object.values(MagicDef.ownfunctions))
  }

  // Método para ejecutar una función por nombre
  static callFunction(functionName, ...args) {
    if (MagicDef.ownfunctions[functionName]) {
      return MagicDef.ownfunctions[functionName](...args)
    } else {
      throw new Error(`Función '${functionName}' no encontrada`)
    }
  }

  // Método para enviar mensaje personalizado
  static sendMessage(message) {
    MagicDef.#sendMessage(message)
  }

  // Método para reenviar funciones a todos los peers conectados
  static resendFunctions() {
    if (Object.keys(MagicDef.ownfunctions).length > 0) {
      const functionsMetadata = MagicDef.getFunctionsMetadata()
      const message = {
        ownfunctions: functionsMetadata
      }
      MagicDef.#sendMessage(JSON.stringify(message))
    }
  }
  
  // Método para conectar a un topic
  static async connect(topic) {
    // Configurar detección de peers (solo una vez)
    if (!MagicDef.peerDetectionSetup) {
      MagicDef.#setupPeerDetection()
      MagicDef.peerDetectionSetup = true
    }
    
    // Convertir topic a buffer
    let topicBuffer
    
    // Si el topic es un hash hexadecimal válido, usarlo directamente
    if (/^[0-9a-fA-F]{64}$/.test(topic)) {
      topicBuffer = b4a.from(topic, 'hex')
    } else {
      // Si es texto, generar un hash SHA-256 del topic
      const crypto = await import('crypto')
      const hash = crypto.createHash('sha256').update(topic).digest('hex')
      topicBuffer = b4a.from(hash, 'hex')
    }
    
    // Unirse a la sala
    const discovery = swarm.join(topicBuffer, { client: true, server: true })
    
    await discovery.flushed()
    
    return topic
  }
}

// ========================================
// PROXY PARA MÉTODOS DINÁMICOS
// ========================================
const MagicDefProxy = new Proxy(MagicDef, {
  get(target, prop) {
    // Si la propiedad existe en MagicDef, usarla
    if (prop in target) {
      return target[prop]
    }
    
    // Si no existe, crear función dinámica
    return (...args) => {
      // Caso 1: No hay peers conectados
      if (swarm.connections.size === 0) {
        console.log(`❌ No hay peers conectados`)
        return Promise.resolve(undefined)
      }
      
      // Caso 2: Hay peers pero no hay funciones
      const peerFunctions = Object.values(MagicDef.nodesFunctions).flat()
      if (peerFunctions.length === 0) {
        console.log(`❌ No hay peer functions`)
        return Promise.resolve(undefined)
      }
      
      // Caso 3: Hay peer functions, buscar la función específica
      const functionExists = peerFunctions.some(func => func.functionName === prop)
      if (functionExists) {
        console.log(`✅ Función '${prop}' ejecutada con parámetros: [${args.join(', ')}]`)
        
        // Enviar mensaje a todos los peers
        const message = {
          callFunction: {
            functionName: prop,
            parameters: args
          }
        }
        MagicDef.sendMessage(JSON.stringify(message))
        
        // Retornar Promise que se resuelve automáticamente
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.log(`⏰ Timeout: No se recibió respuesta para ${prop}`)
            resolve(undefined)
          }, 5000)
          
          // Guardar callback temporal para recibir respuesta
          MagicDef._pendingResponse = { resolve, timeout, functionName: prop }
        })
      } else {
        console.log(`❌ Función '${prop}' no encontrada en peer functions`)
        return Promise.resolve(undefined)
      }
    }
  }
})

// ========================================
// EXPORTAR
// ========================================
export default MagicDefProxy
