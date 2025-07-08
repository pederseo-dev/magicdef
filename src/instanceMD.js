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

// Función externa para manejar mensajes recibidos
function handleMessage(message, peerName, nodesFunctions, ownfunctions, swarm) {
  // Intentar parsear como JSON
  try {
    const parsedMessage = JSON.parse(message)
    
    // Manejar carga de funciones de peers
    loadPeerFunctions(parsedMessage, peerName, nodesFunctions)
    
    // Manejar llamadas de función
    executeFunctionCall(parsedMessage, ownfunctions, swarm)
    
  } catch (error) {
    console.error('Error al manejar el mensaje:', error)
  }
}

// Función externa para enviar mensaje a todos los peers
function sendMessage(message, swarm) {
  const peers = [...swarm.connections]
  
  for (const peer of peers) {
    peer.write(message)
  }
}

// Función externa para cargar funciones de peers
function loadPeerFunctions(parsedMessage, peerName, nodesFunctions) {
  if (!parsedMessage.ownfunctions) return
  
  const peerId = peerName // Usar el peerName como ID
  
  // Verificar si ya tenemos funciones de este peer
  if (nodesFunctions[peerId]) {
    return
  }
  
  // Inicializar array de funciones para este peer
  nodesFunctions[peerId] = []
  
  // Agregar cada función del mensaje
  parsedMessage.ownfunctions.forEach(func => {
    nodesFunctions[peerId].push(func)
  })
  
  // Silencioso - funciones cargadas automáticamente
}

// Función externa para ejecutar llamadas de función
function executeFunctionCall(parsedMessage, ownfunctions, swarm) {
  if (!parsedMessage.callFunction) return
  
  const { functionName, parameters } = parsedMessage.callFunction
  
  // si el nombre esta dentro de ownFunctions ejecutar la funcion
  if (ownfunctions[functionName]) {
    try {
      // Ejecutar la función
      const resultado = ownfunctions[functionName](...parameters)
      
      // Si la función retorna algo, enviar respuesta a todos los peers
      if (resultado !== undefined) {
        const responseMessage = {
          return: resultado
        }
        sendMessage(JSON.stringify(responseMessage), swarm)
      }
    } catch (error) {
      // Solo mostrar errores si la función los lanza
      throw error
    }
  } else {
    // Silencioso - función no encontrada
  }
}

class MagicDef {
  constructor() {
    this.swarm = new Hyperswarm()
    this.ownfunctions = {}
    this.nodesFunctions = {}
    this.peerDetectionSetup = false
  }
  connect(){}
  export(){}
  proxy(){}
  status(){}
  
} 

export default MagicDef


// Ejemplo de uso
const md = new MagicDef()


