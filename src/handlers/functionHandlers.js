import { sendMessage } from './messageHandlers.js'

export function handleLocalFunction(target, prop, args) {
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
  return null
}

export function handleNoPeers(target, prop, args) {
  if (target.swarm.connections.size === 0) {
    return Promise.resolve({
      error: true,
      type: 'NO_PEERS',
      message: 'No hay peers conectados',
      function: prop,
      args
    })
  }
  return null
}

export function handleNoFunctions(target, prop, args) {
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
  return peerFunctions
}

export function handleRemoteFunction(target, prop, args, peerFunctions) {
  const functionExists = peerFunctions.some(func => func.functionName === prop)
  if (functionExists) {
    const message = {
      callFunction: {
        functionName: prop,
        parameters: args
      }
    }
    sendMessage(target, JSON.stringify(message))
    
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
      
      target._pendingResponse = { resolve, timeout, functionName: prop }
    })
  }
  
  return Promise.resolve({
    error: true,
    type: 'FUNCTION_NOT_FOUND',
    message: `Función '${prop}' no encontrada en la red`,
    function: prop,
    args,
    availableFunctions: peerFunctions.map(f => f.functionName)
  })
} 