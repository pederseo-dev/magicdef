import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import { analyzer } from '../utils/analyzer.js'
import { handleLocalFunction, handleNoPeers, handleNoFunctions, handleRemoteFunction } from '../handlers/functionHandlers.js'
import { sendMessage } from '../handlers/messageHandlers.js'
import { setupPeerDetection } from '../handlers/swarmHandlers.js'

class MagicDef {
  constructor() {
    this.swarm = new Hyperswarm()
    this.ownfunctions = {}
    this.nodesFunctions = {}
    this.peerDetectionSetup = false
    
    // Configurar detección de peers inmediatamente
    setupPeerDetection(this)
    
    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) {
          return target[prop]
        }
        
        return (...args) => {
          const localResult = handleLocalFunction(target, prop, args)
          if (localResult) return localResult
          
          const noPeersResult = handleNoPeers(target, prop, args)
          if (noPeersResult) return noPeersResult
          
          const peerFunctions = handleNoFunctions(target, prop, args)
          if (typeof peerFunctions === 'object' && peerFunctions.error) return peerFunctions
          
          return handleRemoteFunction(target, prop, args, peerFunctions)
        }
      }
    })  
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