import MagicDef from '../src/index.js'

const md = new MagicDef()
md.connect('topic123')

function resta(a, b) {
  return a - b
}

md.export(resta)


// Primera llamada - fallará inmediatamente
md.resta(1,2)


// Segunda llamada - esperará 10 segundos
setTimeout(async () => {
  const res = await md.multiplicacion(1,2)
  console.log('respuesta del desde peer 2',res)
}, 10000) // Esperar 2 segundos para que se carguen las funciones 