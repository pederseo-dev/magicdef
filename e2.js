import MagicDef from './magicdef.js'

MagicDef.connect('topic123')

function resta(a, b) {
  return a - b
}

MagicDef.export(resta)


// Primera llamada - fallará inmediatamente
MagicDef.resta(1,2)


// Segunda llamada - esperará 10 segundos
setTimeout(async () => {
  const res = await MagicDef.resta(1,2)
  console.log('respuesta del peer',res)
}, 20000) // Esperar 2 segundos para que se carguen las funciones 