# Proto

## Generar archivos proto

Hola esto solo sirve para generar los archivos proto localmente, ya que se tuvo problemas en la fase 1 proyecto 1

usar solamente en `PowerShell`

### Primer comando

Sirve para ver si todo esta bien

```powershell
docker run --rm -v "${PWD}:/workspace" -w /workspace bufbuild/buf:latest lint
```

### Segundo comando

Sirve generar los archivos

```powershell
docker run --rm -v "${PWD}:/workspace" -w /workspace bufbuild/buf:latest generate
```

**Importante**: el directorio `generated` esta ignorado por git
