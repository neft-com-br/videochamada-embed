# Demo local (sem backend)

Roda o SDK end-to-end **sem precisar de uma chamada real**. Um servidor Python
serve uma "sala mock" em `/chamada/*` que fala o mesmo protocolo `postMessage`
do app de verdade — assim dá pra ver o SDK montando o iframe, enviando comandos
e recebendo eventos.

```bash
python3 mock_server.py
# abra http://127.0.0.1:8792/host.html
# ou o modo auto-demo:  http://127.0.0.1:8792/host.html?auto=1
```

- `host.html` — uma UI de exemplo **com a cara de uma clínica** (cabeçalho, cores e
  botões próprios) usando o SDK; à direita, um log ao vivo dos eventos.
- `mock_server.py` — servidor estático + "sala mock" que implementa o contrato
  `videocall-command` / `videocall-status` / `videocall-event`.

Para conectar numa chamada real, troque `baseUrl`/`callId` por valores do seu
projeto (o `callId` vem de `POST /api/calls`).
