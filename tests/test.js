import assert from 'assert'
import MagicDef from '../src/magicdef.js'

console.log('🧪 Running MagicDef tests...')

// Test 1: Basic function export
console.log('\n📝 Test 1: Function export')
const add = (a, b) => a + b
MagicDef.export(add)
assert(MagicDef.ownfunctions.add, 'Function should be stored in ownfunctions')
console.log('✅ Function export test passed')

// Test 2: Function metadata
console.log('\n📝 Test 2: Function metadata')
const metadata = MagicDef.getFunctionsMetadata()
assert(metadata.length > 0, 'Should have metadata for exported functions')
assert(metadata[0].functionName === 'add', 'Function name should be extracted correctly')
assert(metadata[0].parameters.includes('a'), 'Parameters should be extracted correctly')
console.log('✅ Function metadata test passed')

// Test 3: Local function call
console.log('\n📝 Test 3: Local function call')
const result = MagicDef.callFunction('add', 5, 3)
assert(result === 8, 'Function should return correct result')
console.log('✅ Local function call test passed')

// Test 4: List functions
console.log('\n📝 Test 4: List functions')
const functions = MagicDef.listFunctions()
assert(functions.own.includes('add'), 'Own functions should include exported function')
console.log('✅ List functions test passed')

console.log('\n🎉 All tests passed!') 