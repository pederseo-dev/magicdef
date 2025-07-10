import b4a from 'b4a'
import { analyzer } from '../utils/analyzer.js'
import { handleMessage, removePeerFunctions } from './messageHandlers.js'

export function setupPeerDetection(magicDef) {
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