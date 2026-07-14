#!/usr/bin/env python3
"""Serve the test dir statically, and a mock 'call' page for /chamada/*.

The mock page speaks the SAME postMessage protocol as videochamada-call's
IframeBridgeService, so it exercises the real @videochamada/embed SDK end to
end (URL building, command dispatch, state/event round-trip, origin check)
WITHOUT a live WebRTC backend.
"""
import http.server, socketserver, os

PORT = 8792
ROOT = os.path.dirname(os.path.abspath(__file__))

MOCK_CALL_PAGE = """<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>mock call</title>
<style>
  html,body{margin:0;height:100%;background:#101014;color:#8ab;font-family:system-ui}
  .stage{height:100%;display:grid;place-items:center;text-align:center}
  .tiles{display:flex;gap:10px}
  .tile{width:160px;height:110px;border-radius:10px;background:#1c2030;display:grid;place-items:center;color:#9fb}
</style></head>
<body>
  <div class="stage">
    <div>
      <div class="tiles" id="tiles"><div class="tile">Atendente</div></div>
      <p id="hint">sala mock — protocolo videocall-*</p>
    </div>
  </div>
<script>
  // Mirror of videochamada-call IframeBridgeService (the real protocol).
  var state = { audioEnabled:true, videoEnabled:true, screenShareEnabled:false,
    chatOpen:false, handRaised:false, layoutMode:'mosaic', participantCount:1,
    isRecording:false, connectionStatusVisible:false };

  function sendStatus(){ parent.postMessage({type:'videocall-status', status:state, timestamp:Date.now()}, '*'); }
  function sendEvent(ev,data){ parent.postMessage({type:'videocall-event', event:ev, data:data, timestamp:Date.now()}, '*'); }

  window.addEventListener('message', function(e){
    var d = e.data; if(!d || d.type !== 'videocall-command') return;
    switch(d.action){
      case 'toggleAudio': state.audioEnabled=!state.audioEnabled; sendEvent('audioToggled',{enabled:state.audioEnabled}); break;
      case 'toggleVideo': state.videoEnabled=!state.videoEnabled; sendEvent('videoToggled',{enabled:state.videoEnabled}); break;
      case 'toggleScreenShare': state.screenShareEnabled=!state.screenShareEnabled; sendEvent('screenShareToggled',{enabled:state.screenShareEnabled}); break;
      case 'openChat': state.chatOpen=true; break;
      case 'closeChat': state.chatOpen=false; break;
      case 'toggleRaiseHand': state.handRaised=!state.handRaised; break;
      case 'changeLayout': if(d.data&&d.data.layout){state.layoutMode=d.data.layout;} break;
      case 'endCall': sendEvent('callEnded',{reason:'user'}); break;
      case 'getStatus': break;
    }
    sendStatus();
  });

  // announce initial state once loaded
  sendStatus();
  // simulate a remote participant joining shortly after
  setTimeout(function(){
    state.participantCount = 2;
    var t=document.createElement('div'); t.className='tile'; t.textContent='Convidado';
    document.getElementById('tiles').appendChild(t);
    sendEvent('participantJoined',{participantId:'p2', name:'Convidado'});
    sendStatus();
  }, 1200);
</script>
</body></html>"""

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)
    def do_GET(self):
        if self.path.startswith('/chamada/'):
            body = MOCK_CALL_PAGE.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()
    def log_message(self, *a):
        pass

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", PORT), H) as httpd:
    print(f"mock server on http://127.0.0.1:{PORT}")
    httpd.serve_forever()
