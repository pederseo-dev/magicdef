import MagicDef from '../src/index.js'

const md = new MagicDef()
md.connect('topic123')


function multiplicacion(a, b) {
  console.log('hola desde peer 1')
  return a * b
}

function resta(a, b) {
  return a - b
}

md.export(multiplicacion, resta)

async function test() {
  const res = await md.resta(1,2)
  console.log('respuesta del peer',res)
}
test()


