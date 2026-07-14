# @videochamada/embed

SDK oficial de embed do [videochamada.com.br](https://videochamada.com.br). Incorpore uma
videochamada dentro da sua própria página, **esconda os nossos controles e monte a interface
com a sua cara** — dirigindo tudo (microfone, câmera, tela, chat, layout, encerrar) por JavaScript.

- Zero dependências. Distribuído como ES module.
- Wrapper tipado (TypeScript) sobre o protocolo `iframe` + `postMessage` da plataforma.
- Funciona junto com o **white-label** (cor + logo por projeto) e o **domínio personalizado**.

> Precisa de uma conta no videochamada.com.br e uma **API Key** para criar as chamadas.
> A criação da chamada acontece no **seu backend** (`POST /api/calls`); o SDK só cuida da
> interface no navegador.

## Instalação

```bash
npm install @videochamada/embed
```

Ou via `<script type="module">` a partir de um CDN de ESM (esm.sh, jsdelivr, unpkg).

## Uso

```js
import { VideochamadaCall } from '@videochamada/embed';

const call = new VideochamadaCall({
  container: '#video',                              // seletor ou elemento
  baseUrl: 'https://sua-org.videochamada.com.br',   // subdomínio da org OU domínio próprio
  callId: 'abc-123',                                // vindo de POST /api/calls
  username: 'Maria',
  hideControls: true,                               // esconde nossos controles: você desenha os seus
});

// eventos vindos da chamada
call.on('ready', () => console.log('carregou'));
call.on('participantJoined', (p) => console.log('entrou', p));
call.on('participantLeft', (p) => console.log('saiu', p));
call.on('callEnded', (info) => console.log('encerrou', info));
call.on('status', (s) => console.log('status', s)); // audioEnabled, videoEnabled, participantCount...

// seus botões
btnMic.onclick    = () => call.toggleAudio();
btnCam.onclick    = () => call.toggleVideo();
btnTela.onclick   = () => call.toggleScreenShare();
btnLayout.onclick = () => call.setLayout('mosaic');
btnSair.onclick   = () => call.endCall();
```

## Fluxo completo (backend + frontend)

```
1. Seu backend: POST https://api.videochamada.com.br/api/calls
   Authorization: Bearer SUA_API_KEY   ->  { id: "abc-123", ... }
2. Seu backend devolve o callId para o navegador.
3. Frontend: new VideochamadaCall({ callId, baseUrl, container, hideControls: true })
4. Você renderiza a sua UI e comanda a chamada pelos métodos abaixo.
```

## API

### `new VideochamadaCall(options)`

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `container` | `string \| HTMLElement` | — | Onde montar o iframe. **Obrigatório.** |
| `baseUrl` | `string` | — | Origem do seu projeto (subdomínio da org ou domínio próprio). **Obrigatório.** |
| `callId` | `string` | — | Id da chamada (de `POST /api/calls`). **Obrigatório.** |
| `username` | `string` | — | Pré-preenche o nome do participante. |
| `userId` | `string` | — | Id estável do participante. |
| `hideControls` | `boolean` | `false` | Atalho para `features.controlBar = false`. |
| `features` | `CallFeatures` | `{}` | Desliga recursos individualmente (só `false` tem efeito). |
| `width` / `height` | `number \| string` | `100%` | Tamanho do iframe (número = px). |
| `allow` | `string` | `camera; microphone; display-capture; autoplay; fullscreen` | Atributo `allow`. |

`features` aceita: `chat`, `clock`, `controlBar`, `closeButton`, `raiseHand`, `screenShare`,
`recording`, `transcription`, `virtualBackground`, `hardwareTest`, `pendingCallCard`,
`nameInput`, `waitingRoom`, `summary`. São **disable-only**: se o recurso já estiver
desligado no painel, a URL não consegue religar (o banco vence).

### Métodos

`toggleAudio()` · `mute()` · `unmute()` · `toggleVideo()` · `enableCamera()` · `disableCamera()`
· `toggleScreenShare()` · `startScreenShare()` · `stopScreenShare()` · `openChat()` · `closeChat()`
· `toggleChat()` · `toggleRaiseHand()` · `setLayout('mosaic' | 'sidebar')` · `openLayoutDialog()`
· `openSettings()` · `toggleConnectionStatus()` · `endCall()` · `destroy()`

`getStatus(timeoutMs?)` → `Promise<CallStatus>` — pede o status atual e resolve no próximo push.

`send(action, data?)` — envia um comando cru (fallback; normalmente use os métodos nomeados).

### Eventos — `call.on(evento, handler)` → retorna uma função para cancelar

| Evento | Payload |
|--------|---------|
| `ready` | — (iframe carregou) |
| `status` | `CallStatus` |
| `audioToggled` | `{ enabled }` |
| `videoToggled` | `{ enabled }` |
| `screenShareToggled` | `{ enabled }` |
| `participantJoined` | `{ participantId, name }` |
| `participantLeft` | `{ participantId }` |
| `callEnded` | `{ reason }` |

`CallStatus`: `{ audioEnabled, videoEnabled, screenShareEnabled, chatOpen, handRaised, layoutMode, participantCount, isRecording, connectionStatusVisible }`.

## Tema / white-label (deixar com a sua cara)

Passe um `theme` para restilizar a chamada por dentro (fundo, barra de controles,
botões, tiles de vídeo, cantos, fonte) — sem mexer na nossa marcação interna.

```js
const call = new VideochamadaCall({
  container: '#video', baseUrl, callId, hideControls: true,
  theme: {
    background: '#0b1220',
    controlBarBackground: '#111a2e',
    buttonBackground: '#0ea5a4',
    buttonText: '#04121a',
    accent: '#0ea5a4',            // também aplica na paleta primária (chat, sala de espera)
    endCallBackground: '#e11d48',
    tileBackground: '#0f172a',
    tileRadius: '18px',
    textColor: '#e6edf7',
    font: 'Inter, sans-serif',
  },
});

// também dá pra trocar em tempo real:
call.setTheme({ accent: '#9333ea', controlBarBackground: '#1e1b4b' });
```

Todos os campos são opcionais; o que você não passar mantém o padrão. Só valores
CSS seguros são aceitos (o app rejeita `url()`, `@import` e caracteres que quebram
a regra). Requer o app da chamada com suporte a tema (setTheme).

## Exemplo com React

```jsx
import { useEffect, useRef, useState } from 'react';
import { VideochamadaCall } from '@videochamada/embed';

export function Call({ baseUrl, callId, username }) {
  const box = useRef(null);
  const call = useRef(null);
  const [status, setStatus] = useState({});

  useEffect(() => {
    const c = new VideochamadaCall({ container: box.current, baseUrl, callId, username, hideControls: true });
    c.on('status', setStatus);
    call.current = c;
    return () => c.destroy();
  }, [baseUrl, callId, username]);

  return (
    <div>
      <div ref={box} style={{ aspectRatio: '16 / 9' }} />
      <button onClick={() => call.current.toggleAudio()}>{status.audioEnabled === false ? 'Ativar mic' : 'Mutar'}</button>
      <button onClick={() => call.current.toggleVideo()}>Câmera</button>
      <button onClick={() => call.current.endCall()}>Encerrar</button>
    </div>
  );
}
```

## Rodar sem backend (demo local)

Dá pra ver o SDK funcionando end-to-end sem uma chamada real — veja
[`examples/local-demo`](examples/local-demo) (um servidor mock que fala o mesmo
protocolo do app de verdade).

## Segurança

O SDK só aceita mensagens vindas da origem de `baseUrl` e envia comandos para essa mesma origem.
Mantenha a sua **API Key no backend** — nunca a exponha no código do navegador.

## Licença

MIT
