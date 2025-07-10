export function analyzer(...funcs) {
    const functionsMetadata = []
    
    funcs.forEach(func => {
      // Convertir la función a string para analizarla
      const funcString = func.toString()
      
      // Extraer el nombre de la función (si es una función nombrada)
      let functionName = func.name || 'anonymous'

      // Si es una función anónima asignada a una variable, intentar obtener el nombre
      if (functionName === 'anonymous' && funcString.includes('=')) {
        // Buscar patrones como: const nombre = (params) => o let nombre = function(params)
        const nameMatch = funcString.match(/(?:const|let|var)\s+(\w+)\s*=/)
        if (nameMatch) {
          functionName = nameMatch[1]
        }
      }
      
      // Extraer los parámetros
      let parameters = []
      
      // Buscar parámetros en diferentes formatos de función
      const paramPatterns = [
        /function\s*\w*\s*\(([^)]*)\)/, // function nombre(params)
        /\(([^)]*)\)\s*=>/, // (params) =>
        /^\s*([^=]+)=>\s*{/, // params => {
        /^\s*([^=]+)=>\s*[^{]/, // params => expression
      ]
      
      for (const pattern of paramPatterns) {
        const match = funcString.match(pattern)
        if (match && match[1]) {
          const paramString = match[1].trim()
          if (paramString) {
            // Dividir por comas y limpiar espacios
            parameters = paramString.split(',').map(param => param.trim())
            break
          }
        }
      }
      // Agregar metadata a la lista
      functionsMetadata.push({
        functionName: functionName,
        parameters: parameters
      })
    })
    return functionsMetadata
} 