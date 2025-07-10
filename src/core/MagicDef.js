import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import { analyzer } from '../utils/analyzer.js'
import { handleLocalFunction, handleNoPeers, handleNoFunctions, handleRemoteFunction } from '../handlers/functionHandlers.js'
import { sendMessage } from '../handlers/messageHandlers.js'
import { setupPeerDetection } from '../handlers/swarmHandlers.js'

class MagicDef {
  constructor() {
    // Inicializar swarm P2P para esta instancia
    this.swarm = new Hyperswarm()
    
    // Almacenar funciones propias exportadas
    this.ownfunctions = {}
    
    // Almacenar funciones de otros peers
    this.nodesFunctions = {}
    
    // Flag para evitar configuración múltiple
    this.peerDetectionSetup = false
    
    // Configurar automáticamente la detección de peers
    setupPeerDetection(this)
    
    // Proxy dinámico para interceptar llamadas a funciones
    return new Proxy(this, {
      get(target, prop) {
        // Si la propiedad existe en la instancia, usarla normalmente
        if (prop in target) {
          return target[prop]
        }
        
        // Si no existe, crear función dinámica para llamadas remotas
        return (...args) => {
          // FLUJO DE RESOLUCIÓN DE FUNCIONES:
          
          // 1. Verificar si es función local
          const localResult = handleLocalFunction(target, prop, args)
          if (localResult) return localResult
          
          // 2. Verificar si hay peers conectados
          const noPeersResult = handleNoPeers(target, prop, args)
          if (noPeersResult) return noPeersResult
          
          // 3. Verificar si hay funciones disponibles en la red
          const peerFunctions = handleNoFunctions(target, prop, args)
          if (typeof peerFunctions === 'object' && peerFunctions.error) return peerFunctions
          
          // 4. Intentar ejecutar función remota
          return handleRemoteFunction(target, prop, args, peerFunctions)
        }
      }
    })  
  }

  /**
   * Conecta a una sala específica en la red P2P
   * @param {string} topic - Nombre o hash de la sala
   * @returns {Promise} - Se resuelve cuando se conecta
   */
  async connect(topic){
    // Convertir el topic a un hash SHA-256 para crear el buffer
    const crypto = await import('crypto')
    const hash = crypto.createHash('sha256').update(topic).digest('hex')
    const topicBuffer = b4a.from(hash, 'hex')
    
    // Unirse a la sala P2P
    const discovery = this.swarm.join(topicBuffer, { client: true, server: true })
    
    // Esperar a que se complete la conexión
    await discovery.flushed()
  }

  /**
   * Exporta funciones para que otros peers las puedan usar
   * @param {...Function} funcs - Funciones a exportar
   */
  export(...funcs){
    // Limpiar funciones anteriores (reemplazar completamente)
    this.ownfunctions = {}
    
    // Analizar las funciones para extraer metadata (nombre, parámetros)
    const functionsMetadata = analyzer(...funcs)
    
    // Almacenar las funciones en el objeto ownfunctions
    funcs.forEach((func, index) => {
      this.ownfunctions[functionsMetadata[index].functionName] = func
    })
    
    // Si hay peers conectados, enviarles las nuevas funciones
    if (this.swarm.connections.size > 0) {
      const message = {
        ownfunctions: functionsMetadata
      }
      sendMessage(this, JSON.stringify(message))
    }
  }
} 

export default MagicDef 