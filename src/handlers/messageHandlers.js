import { analyzer } from '../utils/analyzer.js'

export function sendMessage(magicDef, message) {
  const peers = [...magicDef.swarm.connections]
  
  for (const peer of peers) {
    peer.write(message)
  }
}

export function loadFunctions(magicDef, peerName, parsedMessage){
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

export function callFunction(magicDef, parsedMessage){
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

export function returnMessage(magicDef, parsedMessage){
  // Si hay una respuesta pendiente, resolverla
  if (magicDef._pendingResponse) {
    clearTimeout(magicDef._pendingResponse.timeout)
    magicDef._pendingResponse.resolve(parsedMessage.return)
    magicDef._pendingResponse = null
  }
}

export function removePeerFunctions(magicDef, peerName) {
  if (magicDef.nodesFunctions[peerName]) {
    delete magicDef.nodesFunctions[peerName]
  }
}

export function handleMessage(magicDef, message, peerName) {
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