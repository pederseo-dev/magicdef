import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'

// CONFIGURACIÓN INICIAL
const swarm = new Hyperswarm()

/**
 * MagicDef - Librería para compartir y ejecutar funciones en red peer-to-peer
 * 
 * Esta clase proporciona funcionalidad para:
 * - Exportar funciones a la red P2P
 * - Ejecutar funciones remotas automáticamente
 * - Descubrir funciones de otros peers
 * - Comunicación en tiempo real entre nodos
 * 
 * @class MagicDef
 * @example
 * import MagicDef from 'magicdef'
 * 
 * // Conectar a la red
 * await MagicDef.connect('mi-sala')
 * 
 * // Exportar funciones
 * function suma(a, b) { return a + b }
 * MagicDef.export(suma)
 * 
 * // Ejecutar función remota
 * const resultado = await MagicDef.suma(5, 3)
 */
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
        
        // Silencioso - funciones cargadas automáticamente
        
      }
      
      //si recibe un mensaje de tipo {callFunction:{functionName,parameters}} llamar a la funcion
      if (parsedMessage.callFunction) {
        const { functionName, parameters } = parsedMessage.callFunction
        
        // si el nombre esta dentro de ownFunctions ejecutar la funcion
        if (MagicDef.ownfunctions[functionName]) {
          try {
            // Ejecutar la función
            const resultado = MagicDef.ownfunctions[functionName](...parameters)
            
            // Si la función retorna algo, enviar respuesta a todos los peers
            if (resultado !== undefined) {
              const responseMessage = {
                return: resultado
              }
              MagicDef.sendMessage(JSON.stringify(responseMessage))
            }
          } catch (error) {
            // Solo mostrar errores si la función los lanza
            throw error
          }
        } else {
          // Silencioso - función no encontrada
        }
      }
      
      //si recibe un mensaje de tipo {return:resultado} procesar respuesta
      if (parsedMessage.return !== undefined) {
        // Si hay una respuesta pendiente, resolverla
        if (MagicDef._pendingResponse) {
          clearTimeout(MagicDef._pendingResponse.timeout)
          MagicDef._pendingResponse.resolve(parsedMessage.return)
          MagicDef._pendingResponse = null
        }
      }
    } catch (error) {
      // Silencioso - ignorar mensajes no JSON
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
      
      // Enviar funciones al peer que se acaba de conectar
      if (Object.keys(MagicDef.ownfunctions).length > 0) {
        const functionsMetadata = MagicDef.getFunctionsMetadata()
        const message = {
          ownfunctions: functionsMetadata
        }
        peer.write(JSON.stringify(message))
      }
      
      // Cuando recibimos datos
      peer.on('data', (data) => {
        const message = data.toString()
        MagicDef.#handleMessage(message, peerName)
      })
      
      // Si hay error
      peer.on('error', e => {
        // Silencioso - manejar errores internamente
      })
      
      // Cuando se desconecta
      peer.on('close', () => {
        // Remover las funciones del peer desconectado
        MagicDef.#removePeerFunctions(peerName)
      })
    })
    
    // Escuchar actualizaciones del swarm
    swarm.on('update', () => {
      // Silencioso
    })
  }

  /**
   * Exporta funciones a la red P2P para que otros peers puedan usarlas
   * 
   * @param {...Function} funcs - Funciones a exportar
   * @example
   * function suma(a, b) { return a + b }
   * function multiplicar(x, y) { return x * y }
   * 
   * MagicDef.export(suma, multiplicar)
   */
  static export(...funcs) {
    // Limpiar funciones anteriores
    MagicDef.ownfunctions = {}
    
    // Analizar y almacenar las funciones
    const functionsMetadata = MagicDef.#analyzer(...funcs)
    
    // Enviar funciones a todos los peers ya conectados
    if (swarm.connections.size > 0) {
      const message = {
        ownfunctions: functionsMetadata
      }
      MagicDef.#sendMessage(JSON.stringify(message))
    }
  }

  /**
   * Lista todas las funciones disponibles (propias y de peers)
   * 
   * @returns {Object} Objeto con funciones propias y de peers
   * @returns {string[]} returns.own - Nombres de funciones propias
   * @returns {Object} returns.peers - Funciones de otros peers organizadas por peer ID
   * @example
   * const funciones = MagicDef.listFunctions()
   * console.log(funciones.own) // ['suma', 'multiplicar']
   * console.log(funciones.peers) // { 'peer1': [{ functionName: 'resta', parameters: ['a', 'b'] }] }
   */
  static listFunctions() {
    return {
      own: Object.keys(MagicDef.ownfunctions),
      peers: MagicDef.nodesFunctions
    }
  }

  /**
   * Obtiene metadata de todas las funciones exportadas
   * 
   * @returns {Array} Array con metadata de funciones (nombre, parámetros)
   * @example
   * const metadata = MagicDef.getFunctionsMetadata()
   * // [{ functionName: 'suma', parameters: ['a', 'b'] }]
   */
  static getFunctionsMetadata() {
    return MagicDef.#analyzer(...Object.values(MagicDef.ownfunctions))
  }



  /**
   * Envía un mensaje personalizado a todos los peers conectados
   * 
   * @param {string} message - Mensaje a enviar
   * @example
   * MagicDef.sendMessage('Hola a todos los peers!')
   */
  static sendMessage(message) {
    MagicDef.#sendMessage(message)
  }

  /**
   * Reenvía las funciones exportadas a todos los peers conectados
   * Útil cuando nuevos peers se conectan después de exportar funciones
   * 
   * @example
   * MagicDef.export(suma, multiplicar)
   * // ... más tarde ...
   * MagicDef.resendFunctions() // Reenvía a nuevos peers
   */
  static resendFunctions() {
    if (Object.keys(MagicDef.ownfunctions).length > 0) {
      const functionsMetadata = MagicDef.getFunctionsMetadata()
      const message = {
        ownfunctions: functionsMetadata
      }
      MagicDef.sendMessage(JSON.stringify(message))
    }
  }
  
  /**
   * Conecta a una sala específica en la red P2P
   * 
   * @param {string} topic - Nombre o hash de la sala a la que conectarse
   * @returns {Promise<string>} El topic al que se conectó
   * @example
   * await MagicDef.connect('mi-aplicacion')
   * await MagicDef.connect('a1b2c3d4e5f6...') // Hash hexadecimal
   */
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
      // Caso 0: Verificar si la función existe localmente primero
      if (MagicDef.ownfunctions[prop]) {
        try {
          const resultado = MagicDef.ownfunctions[prop](...args)
          return Promise.resolve(resultado)
        } catch (error) {
          return Promise.resolve({
            error: true,
            type: 'LOCAL_ERROR',
            message: error.message,
            function: prop,
            args
          })
        }
      }
      
      // Caso 1: No hay peers conectados
      if (swarm.connections.size === 0) {
        return Promise.resolve({
          error: true,
          type: 'NO_PEERS',
          message: 'No hay peers conectados',
          function: prop,
          args
        })
      }
      
      // Caso 2: Hay peers pero no hay funciones
      const peerFunctions = Object.values(MagicDef.nodesFunctions).flat()
      if (peerFunctions.length === 0) {
        return Promise.resolve({
          error: true,
          type: 'NO_FUNCTIONS',
          message: 'No hay funciones disponibles en la red',
          function: prop,
          args
        })
      }
      
      // Caso 3: Hay peer functions, buscar la función específica
      const functionExists = peerFunctions.some(func => func.functionName === prop)
      if (functionExists) {
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
            resolve({
              error: true,
              type: 'TIMEOUT',
              message: `Timeout: No se recibió respuesta para ${prop}`,
              function: prop,
              args
            })
          }, 5000)
          
          // Guardar callback temporal para recibir respuesta
          MagicDef._pendingResponse = { resolve, timeout, functionName: prop }
        })
      } else {
        return Promise.resolve({
          error: true,
          type: 'FUNCTION_NOT_FOUND',
          message: `Función '${prop}' no encontrada en la red`,
          function: prop,
          args,
          availableFunctions: peerFunctions.map(f => f.functionName)
        })
      }
    }
  }
})

// ========================================
// EXPORTAR
// ========================================
export default MagicDefProxy
