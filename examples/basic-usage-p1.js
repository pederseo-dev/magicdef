import MagicDef from '../src/magicdef.js'


MagicDef.connect('topic123')


function multiplicacion(a, b) {
  console.log('hola desde peer 1')
  return a * b
}

function resta(a, b) {
  return a - b
}

MagicDef.export(multiplicacion, resta)

async function test() {
  const res = await MagicDef.resta(1,2)
  console.log('respuesta del peer',res)
}
test()


