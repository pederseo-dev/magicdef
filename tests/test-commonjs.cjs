const MagicDef = require('../dist/magicdef.cjs')

console.log('🧪 Testing CommonJS...')

// Test 1: Basic function export
console.log('\n📝 Test 1: Function export')
const add = (a, b) => a + b
MagicDef.export(add)

// Test 2: Local function execution
console.log('\n📝 Test 2: Local function execution')
MagicDef.add(5, 3).then(result => {
  console.log('Result:', result) // Should be 8
})

// Test 3: List functions
console.log('\n📝 Test 3: List functions')
const functions = MagicDef.listFunctions()
console.log('Own functions:', functions.own)

console.log('\n✅ CommonJS test completed!') 