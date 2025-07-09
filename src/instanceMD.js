import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'

// CONFIGURACIÓN INICIAL

function analyzer(...funcs) {
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
    })
    return functionsMetadata
}

// Función externa para enviar mensaje a todos los peers
function sendMessage(magicDef, message) {
  const peers = [...magicDef.swarm.connections]
  
  for (const peer of peers) {
    peer.write(message)
  }
}

function loadFunctions(magicDef, peerName, parsedMessage){
  const peerId = peerName // Usar el peerName como ID
        
  // Verificar si ya tenemos funciones de este peer
  if (magicDef.nodesFunctions[peerId]) {
    return
  }
  
  // Inicializar array de funciones para este peer
  magicDef.nodesFunctions[peerId] = []
  
  // Agregar cada función del mensaje
  parsedMessage.ownfunctions.forEach(func => {
    magicDef.nodesFunctions[peerId].push(func)
  })
}

function callFunction(magicDef, parsedMessage){
  const { functionName, parameters } = parsedMessage.callFunction
        
  // si el nombre esta dentro de ownFunctions ejecutar la funcion
  if (magicDef.ownfunctions[functionName]) {
    try {
      // Ejecutar la función
      const resultado = magicDef.ownfunctions[functionName](...parameters)
      
      // Si la función retorna algo, enviar respuesta a todos los peers
      if (resultado !== undefined) {
        const responseMessage = {
          return: resultado
        }
        sendMessage(magicDef, JSON.stringify(responseMessage))
      }
    } catch (error) {
      // Solo mostrar errores si la función los lanza
      throw error
    }
  } else {
    // Silencioso - función no encontrada
  }
}

function returnMessage(magicDef, parsedMessage){
  // Si hay una respuesta pendiente, resolverla
  if (magicDef._pendingResponse) {
    clearTimeout(magicDef._pendingResponse.timeout)
    magicDef._pendingResponse.resolve(parsedMessage.return)
    magicDef._pendingResponse = null
  }
}

function removePeerFunctions(magicDef, peerName) {
  if (magicDef.nodesFunctions[peerName]) {
    delete magicDef.nodesFunctions[peerName]
  }
}

function setupPeerDetection(magicDef) {
  // Cuando se conecta un peer
  magicDef.swarm.on('connection', (peer) => {
    const peerId = b4a.toString(peer.remotePublicKey, 'hex')
    const peerName = peerId.substr(0, 6)
    
    // Enviar funciones al peer que se acaba de conectar
    if (Object.keys(magicDef.ownfunctions).length > 0) {
      const functionsMetadata = analyzer(...Object.values(magicDef.ownfunctions))
      const message = {
        ownfunctions: functionsMetadata
      }
      peer.write(JSON.stringify(message))
    }
    
    // Cuando recibimos datos
    peer.on('data', (data) => {
      const message = data.toString()
      handleMessage(magicDef, message, peerName)
    })
    
    // Si hay error
    peer.on('error', e => {
      // Silencioso - manejar errores internamente
    })
    
    // Cuando se desconecta
    peer.on('close', () => {
      // Remover las funciones del peer desconectado
      removePeerFunctions(magicDef, peerName)
    })
  })
  
  // Escuchar actualizaciones del swarm
  magicDef.swarm.on('update', () => {
    // Silencioso
  })
}

// funcion para manejar mensajes recibidos
function handleMessage(magicDef, message, peerName) {
    // Intentar parsear como JSON
    try {
      const parsedMessage = JSON.parse(message)
      
      // si se recibe un mensaje con {ownfunctions:[]} cargar las funciones en nodesFunctions
      if (parsedMessage.ownfunctions) {
        loadFunctions(magicDef, peerName, parsedMessage)
      }
      
      //si recibe un mensaje de tipo {callFunction:{functionName,parameters}} llamar a la funcion
      if (parsedMessage.callFunction) {
        callFunction(magicDef, parsedMessage)
      }
      
      //si recibe un mensaje de tipo {return:resultado} procesar respuesta
      if (parsedMessage.return !== undefined) {
        returnMessage(magicDef, parsedMessage)
      }
    } catch (error) {
      // Silencioso - ignorar mensajes no JSON
    }
  }



class MagicDef {
  constructor() {
    this.swarm = new Hyperswarm()
    this.ownfunctions = {}
    this.nodesFunctions = {}
    this.peerDetectionSetup = false
    
    // Configurar detección de peers inmediatamente
    setupPeerDetection(this)
    
    // proxy para crear metodos dinamicos de cada instancia
    return new Proxy(this, {
        get(target, prop) {
          // Si la propiedad existe en MagicDef, usarla
          if (prop in target) {
            return target[prop]
          }
          
          // Si no existe, crear función dinámica
          return (...args) => {
            // Caso 0: Verificar si la función existe localmente primero
            if (target.ownfunctions[prop]) {
              try {
                const resultado = target.ownfunctions[prop](...args)
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
            if (target.swarm.connections.size === 0) {
              return Promise.resolve({
                error: true,
                type: 'NO_PEERS',
                message: 'No hay peers conectados',
                function: prop,
                args
              })
            }
            
            // Caso 2: Hay peers pero no hay funciones
            const peerFunctions = Object.values(target.nodesFunctions).flat()
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
              sendMessage(target, JSON.stringify(message))
              
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
                target._pendingResponse = { resolve, timeout, functionName: prop }
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
      }
     )  
    }
  async connect(topic){
    // Convertir topic a buffer
    const crypto = await import('crypto')
    const hash = crypto.createHash('sha256').update(topic).digest('hex')
    const topicBuffer = b4a.from(hash, 'hex')
    // Unirse a la sala
    const discovery = this.swarm.join(topicBuffer, { client: true, server: true })
    
    await discovery.flushed()
  }


  export(...funcs){
    // Limpiar funciones anteriores
    this.ownfunctions = {}
    
    // Analizar y almacenar las funciones
    const functionsMetadata = analyzer(...funcs)
    
    // Almacenar funciones
    funcs.forEach((func, index) => {
      this.ownfunctions[functionsMetadata[index].functionName] = func
    })
    
    // Enviar funciones a todos los peers ya conectados
    if (this.swarm.connections.size > 0) {
      const message = {
        ownfunctions: functionsMetadata
      }
      sendMessage(this, JSON.stringify(message))
    }
  }


  

  
  
} 

export default MagicDef


// Ejemplo de uso

