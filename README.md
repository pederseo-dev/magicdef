# MagicDef 🪄

> Crear y ejecutar funciones remotas en una red peer-to-peer

[![npm version](https://badge.fury.io/js/magicdef.svg)](https://badge.fury.io/js/magicdef)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MagicDef es una librería JavaScript que permite compartir y ejecutar funciones de forma distribuida en una red peer-to-peer usando Hyperswarm. Con MagicDef, puedes crear aplicaciones donde múltiples nodos pueden compartir sus funciones y ejecutarlas remotamente sin necesidad de un servidor central.

## ✨ Características

- 🔗 **Peer-to-Peer**: Comunicación directa entre nodos sin servidor central
- 🚀 **Ejecución Remota**: Ejecuta funciones en otros peers de la red
- 🔍 **Descubrimiento Automático**: Encuentra automáticamente funciones disponibles
- ⚡ **Tiempo Real**: Comunicación instantánea entre peers
- 🛡️ **Sin Dependencias Externas**: Solo requiere Hyperswarm para networking
- 📦 **Fácil de Usar**: API simple e intuitiva

## 🚀 Instalación

```bash
npm install magicdef
```

## 📖 Uso Básico

### 1. Importar y Conectar

**ES Modules (Recomendado):**
```javascript
import MagicDef from 'magicdef'

// Conectar a la red P2P
await MagicDef.connect('mi-sala-de-funciones')
```

**CommonJS:**
```javascript
const MagicDef = require('magicdef')

// Conectar a la red P2P
await MagicDef.connect('mi-sala-de-funciones')
```

### 2. Exportar Funciones

```javascript
// Definir funciones para compartir
function suma(a, b) {
  return a + b
}

function saludar(nombre) {
  return `¡Hola, ${nombre}!`
}

// Exportar funciones a la red
MagicDef.export(suma, saludar)
```

### 3. Ejecutar Funciones

```javascript
// Ejecutar función local o remota (automático)
const resultado = await MagicDef.suma(5, 3)
console.log(resultado) // 8

const saludo = await MagicDef.saludar('Mundo')
console.log(saludo) // "¡Hola, Mundo!"

// Manejar errores de ejecución
const resultado = await MagicDef.funcionInexistente(1, 2)
if (resultado.error) {
  console.log('Error:', resultado.message)
  console.log('Tipo:', resultado.type)
  console.log('Funciones disponibles:', resultado.availableFunctions)
}
```

## 🔧 API Completa

### `MagicDef.connect(topic)`
Conecta a una sala específica en la red P2P.

```javascript
await MagicDef.connect('mi-aplicacion')
```

### `MagicDef.export(...funciones)`
Exporta funciones a la red para que otros peers puedan usarlas.

```javascript
function multiplicar(x, y) { return x * y }
function dividir(a, b) { return a / b }

MagicDef.export(multiplicar, dividir)
```



### `MagicDef.listFunctions()`
Lista todas las funciones disponibles (propias y de peers).

```javascript
const funciones = MagicDef.listFunctions()
console.log(funciones)
// {
//   own: ['suma', 'multiplicar'],
//   peers: {
//     'peer1': [{ functionName: 'resta', parameters: ['a', 'b'] }]
//   }
// }
```

### `MagicDef.sendMessage(mensaje)`
Envía un mensaje personalizado a todos los peers conectados.

```javascript
MagicDef.sendMessage('Hola a todos los peers!')
```

### `MagicDef.resendFunctions()`
Reenvía las funciones exportadas a todos los peers conectados.

```javascript
MagicDef.resendFunctions()
```

## 🌐 Ejecución Automática

MagicDef usa un sistema de proxy que permite ejecutar funciones locales o remotas de forma transparente:

```javascript
// Ejecuta local si tienes la función, remota si la tiene otro peer
const area = await MagicDef.calcularArea(5, 10)
console.log(area) // 50

// Siempre usa await para funciones que podrían ser remotas
const resultado = await MagicDef.suma(1, 2)
```

## ⚠️ Manejo de Errores

Cuando una función remota no puede ejecutarse, MagicDef retorna un objeto de error en lugar de lanzar una excepción:

```javascript
const resultado = await MagicDef.funcionInexistente(1, 2)

if (resultado.error) {
  console.log('Error:', resultado.message)
  console.log('Tipo:', resultado.type)
  
  switch (resultado.type) {
    case 'NO_PEERS':
      console.log('No hay peers conectados')
      break
    case 'NO_FUNCTIONS':
      console.log('No hay funciones disponibles')
      break
    case 'FUNCTION_NOT_FOUND':
      console.log('Funciones disponibles:', resultado.availableFunctions)
      break
    case 'TIMEOUT':
      console.log('La función tardó demasiado en responder')
      break
  }
}
```

### Tipos de Error:

- **`NO_PEERS`**: No hay peers conectados a la red
- **`NO_FUNCTIONS`**: Hay peers pero no han compartido funciones
- **`FUNCTION_NOT_FOUND`**: La función no existe en ningún peer
- **`TIMEOUT`**: La función no respondió en 5 segundos

## 📝 Ejemplos

### Ejemplo 1: Calculadora Distribuida

```javascript
import MagicDef from 'magicdef'

// Conectar a la red
await MagicDef.connect('calculadora-p2p')

// Exportar funciones matemáticas
function suma(a, b) { return a + b }
function resta(a, b) { return a - b }
function multiplicar(a, b) { return a * b }
function dividir(a, b) { return a / b }

MagicDef.export(suma, resta, multiplicar, dividir)

// Esperar a que otros peers se conecten
setTimeout(async () => {
  // Ejecutar funciones (locales o remotas automáticamente)
  console.log(await MagicDef.suma(10, 5))      // 15
  console.log(await MagicDef.resta(10, 3))     // 7
  console.log(await MagicDef.multiplicar(4, 6)) // 24
  console.log(await MagicDef.dividir(20, 4))   // 5
}, 3000)
```

### Ejemplo 2: Chat con Funciones

```javascript
import MagicDef from 'magicdef'

await MagicDef.connect('chat-funcional')

// Función para procesar mensajes
function procesarMensaje(mensaje) {
  return `Mensaje procesado: ${mensaje.toUpperCase()}`
}

MagicDef.export(procesarMensaje)

// Los otros peers pueden usar tu función
// const resultado = await MagicDef.procesarMensaje('hola mundo')
```

## 🔍 Monitoreo y Debug

MagicDef proporciona logs detallados para monitorear la actividad:

```
🔗 Peer conectado: a1b2c3
📤 Enviando funciones al nuevo peer a1b2c3
✅ Funciones cargadas del peer a1b2c3: 2 función(es)
   - suma (a, b)
   - multiplicar (x, y)
📨 Recibida llamada a función: suma(5, 3)
✅ Ejecutando función local: suma
📤 Enviando resultado: 8
```

## ⚠️ Consideraciones de Seguridad

- **Ejecución de código**: MagicDef ejecuta código recibido de otros peers
- **Confianza**: Solo ejecuta funciones de peers en los que confíes
- **Validación**: Considera validar parámetros antes de ejecutar funciones
- **Redes privadas**: Usa topics únicos para redes privadas

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🔗 Enlaces Relacionados

- [Hyperswarm](https://github.com/hyperswarm/hyperswarm) - Peer discovery y comunicación
- [Holepunch](https://holepunch.to/) - Herramientas de networking P2P

---

**MagicDef** - Haciendo la programación distribuida más fácil 🚀