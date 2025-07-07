# MagicDef API Documentation

## Índice

- [Clase MagicDef](#clase-magicdef)
- [Métodos Públicos](#métodos-públicos)
- [Ejemplos Avanzados](#ejemplos-avanzados)
- [Troubleshooting](#troubleshooting)

## Clase MagicDef

La clase principal que proporciona toda la funcionalidad de MagicDef.

### Propiedades Estáticas

- `ownfunctions` - Objeto que almacena las funciones exportadas localmente
- `nodesFunctions` - Objeto que almacena las funciones de otros peers
- `peerDetectionSetup` - Flag para evitar configuración múltiple

### Ejecución de Funciones

MagicDef usa un sistema de proxy que permite ejecutar funciones directamente por nombre:

```javascript
// Ejecuta local si tienes la función, remota si la tiene otro peer
const resultado = await MagicDef.suma(5, 3)
const area = await MagicDef.calcularArea(10, 5)
```

## Métodos Públicos

### `MagicDef.connect(topic)`

Conecta a una sala específica en la red P2P.

**Parámetros:**
- `topic` (string) - Nombre o hash de la sala

**Retorna:** Promise<string> - El topic al que se conectó

**Ejemplo:**
```javascript
// Conectar usando nombre
await MagicDef.connect('mi-aplicacion')

// Conectar usando hash hexadecimal
await MagicDef.connect('a1b2c3d4e5f6...')
```

### `MagicDef.export(...funciones)`

Exporta funciones a la red P2P para que otros peers puedan usarlas.

**Parámetros:**
- `...funciones` (Function) - Funciones a exportar

**Ejemplo:**
```javascript
function suma(a, b) { return a + b }
function multiplicar(x, y) { return x * y }
function saludar(nombre) { return `Hola, ${nombre}!` }

MagicDef.export(suma, multiplicar, saludar)
```



### `MagicDef.listFunctions()`

Lista todas las funciones disponibles.

**Retorna:** Object - Objeto con funciones propias y de peers

**Ejemplo:**
```javascript
const funciones = MagicDef.listFunctions()
console.log(funciones.own) // ['suma', 'multiplicar']
console.log(funciones.peers) // { 'peer1': [{ functionName: 'resta', parameters: ['a', 'b'] }] }
```

### `MagicDef.getFunctionsMetadata()`

Obtiene metadata de todas las funciones exportadas.

**Retorna:** Array - Array con metadata de funciones

**Ejemplo:**
```javascript
const metadata = MagicDef.getFunctionsMetadata()
// [{ functionName: 'suma', parameters: ['a', 'b'] }]
```

### `MagicDef.sendMessage(mensaje)`

Envía un mensaje personalizado a todos los peers.

**Parámetros:**
- `mensaje` (string) - Mensaje a enviar

**Ejemplo:**
```javascript
MagicDef.sendMessage('Hola a todos los peers!')
```

### `MagicDef.resendFunctions()`

Reenvía las funciones exportadas a todos los peers conectados.

**Ejemplo:**
```javascript
MagicDef.export(suma, multiplicar)
// ... más tarde ...
MagicDef.resendFunctions() // Reenvía a nuevos peers
```

## Ejemplos Avanzados

### Ejemplo 1: Sistema de Chat Distribuido

```javascript
import MagicDef from 'magicdef'

await MagicDef.connect('chat-sistema')

// Función para procesar mensajes
function procesarMensaje(mensaje, usuario) {
  const timestamp = new Date().toISOString()
  return {
    mensaje: mensaje.toUpperCase(),
    usuario,
    timestamp,
    procesado: true
  }
}

// Función para validar usuarios
function validarUsuario(usuario) {
  const usuariosValidos = ['admin', 'user1', 'user2']
  return usuariosValidos.includes(usuario)
}

MagicDef.export(procesarMensaje, validarUsuario)

// Los otros peers pueden usar estas funciones
// const mensajeProcesado = await MagicDef.procesarMensaje('hola', 'user1')
// const esValido = await MagicDef.validarUsuario('admin')
```

### Ejemplo 2: Calculadora Distribuida con Validación

```javascript
import MagicDef from 'magicdef'

await MagicDef.connect('calculadora-avanzada')

function suma(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Los parámetros deben ser números')
  }
  return a + b
}

function multiplicar(x, y) {
  if (typeof x !== 'number' || typeof y !== 'number') {
    throw new Error('Los parámetros deben ser números')
  }
  return x * y
}

function dividir(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Los parámetros deben ser números')
  }
  if (b === 0) {
    throw new Error('No se puede dividir por cero')
  }
  return a / b
}

MagicDef.export(suma, multiplicar, dividir)
```

### Ejemplo 3: Sistema de Monitoreo

```javascript
import MagicDef from 'magicdef'

await MagicDef.connect('monitoreo-sistema')

function obtenerEstadisticas() {
  return {
    timestamp: Date.now(),
    memoria: process.memoryUsage(),
    uptime: process.uptime(),
    peers: MagicDef.listFunctions().peers
  }
}

function verificarSalud() {
  const stats = obtenerEstadisticas()
  return {
    salud: stats.memoria.heapUsed < 1000000000 ? 'OK' : 'WARNING',
    estadisticas: stats
  }
}

MagicDef.export(obtenerEstadisticas, verificarSalud)
```

## Manejo de Errores

### Estructura de Error

Cuando una función remota no puede ejecutarse, MagicDef retorna un objeto con esta estructura:

```javascript
{
  error: true,
  type: 'ERROR_TYPE',
  message: 'Descripción del error',
  function: 'nombreFuncion',
  args: [arg1, arg2],
  availableFunctions: ['func1', 'func2'] // Solo en FUNCTION_NOT_FOUND
}
```

### Tipos de Error

- **`NO_PEERS`**: No hay peers conectados a la red
- **`NO_FUNCTIONS`**: Hay peers pero no han compartido funciones
- **`FUNCTION_NOT_FOUND`**: La función no existe en ningún peer
- **`TIMEOUT`**: La función no respondió en 5 segundos

### Ejemplo de Manejo

```javascript
const resultado = await MagicDef.miFuncion(1, 2)

if (resultado.error) {
  switch (resultado.type) {
    case 'NO_PEERS':
      console.log('Conectando a la red...')
      await MagicDef.connect('mi-topic')
      break
    case 'NO_FUNCTIONS':
      console.log('Esperando que otros peers compartan funciones...')
      break
    case 'FUNCTION_NOT_FOUND':
      console.log('Funciones disponibles:', resultado.availableFunctions)
      break
    case 'TIMEOUT':
      console.log('Reintentando...')
      break
  }
} else {
  console.log('Resultado:', resultado)
}
```

## Troubleshooting

### Problema: No se conectan peers

**Solución:**
```javascript
// Verificar que el topic sea el mismo en todos los peers
await MagicDef.connect('topic-exacto-mismo')

// Esperar un poco para la conexión
setTimeout(() => {
  console.log('Peers conectados:', Object.keys(MagicDef.listFunctions().peers))
}, 5000)
```

### Problema: Las funciones no se ejecutan remotamente

**Solución:**
```javascript
// Verificar que las funciones estén exportadas
console.log('Funciones propias:', MagicDef.listFunctions().own)

// Reenviar funciones si es necesario
MagicDef.resendFunctions()

// Verificar que el peer tenga la función
const funciones = MagicDef.listFunctions().peers
Object.entries(funciones).forEach(([peerId, funcs]) => {
  console.log(`Peer ${peerId}:`, funcs.map(f => f.functionName))
})
```

### Problema: Timeout en ejecución remota

**Solución:**
```javascript
// Aumentar timeout (por defecto 5 segundos)
// Esto se maneja internamente, pero puedes verificar la conexión

// Verificar peers conectados
const peers = Object.keys(MagicDef.listFunctions().peers)
if (peers.length === 0) {
  console.log('No hay peers conectados')
  return
}

// Reintentar la ejecución
try {
  const resultado = await MagicDef.miFuncion(1, 2)
  console.log('Resultado:', resultado)
} catch (error) {
  console.log('Error:', error.message)
}
```

### Problema: Funciones no se descubren automáticamente

**Solución:**
```javascript
// Forzar reenvío de funciones
MagicDef.resendFunctions()

// Verificar manualmente
setTimeout(() => {
  const funciones = MagicDef.listFunctions()
  console.log('Funciones disponibles:', funciones)
}, 2000)
``` 