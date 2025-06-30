magicdef es una libreria que utiliza las herrmientas de holepunch
Hyperswarm
'hypercore-crypto'
b4a
para crear funciones magica donde podras definir y llamar en cualquier parte


# flujo

# definir funcion magica
```javascript
from magicdef import pearcall
// crear conexion magicdef
peardef ('keyConnect') {
    //ejemplo de definir funcion
    const suma = 1 + 2
    return suma
}
```


# llamar funcion magica
```javascript
from magicdef import pearcall
    // ejemplo de ejecutar funcion
    const resultado = pearcall('keyConnect')
```