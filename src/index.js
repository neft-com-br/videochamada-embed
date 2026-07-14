// @videochamada/embed
// Official embed SDK for videochamada.com.br.
//
// Wraps the iframe + postMessage protocol exposed by the call app so you can
// mount a call inside your own page, hide our controls, and build the interface
// with your own look ("com a minha cara") while driving everything from JS.
//
// Zero dependencies. Ships as an ES module.

/**
 * Query-param aliases understood by the call app (disable-only; DB-disabled always wins).
 * Keep in sync with videochamada-call `src/app/helpers/feature-toggle-parser.ts`.
 * @type {Record<string, string>}
 */
export const FEATURE_ALIASES = {
  chat: 'chat',
  clock: 'clock',
  controlBar: 'controlBar',
  closeButton: 'closeButton',
  raiseHand: 'raiseHand',
  screenShare: 'screenShare',
  recording: 'recording',
  transcription: 'transcription',
  virtualBackground: 'virtualBackground',
  hardwareTest: 'hardwareTest',
  pendingCallCard: 'pendingCallCard',
  nameInput: 'nameInput',
  waitingRoom: 'waitingRoom',
  summary: 'summary',
};

const DEFAULT_ALLOW = 'camera; microphone; display-capture; autoplay; fullscreen';

/**
 * Build the call URL with username and feature toggles applied.
 * Pure function — safe to unit-test without a DOM.
 * @param {import('./index').CallUrlOptions} opts
 * @returns {string}
 */
export function buildCallUrl(opts) {
  const { baseUrl, callId } = opts;
  if (!baseUrl) throw new Error('[videochamada] "baseUrl" is required (e.g. https://sua-org.videochamada.com.br)');
  if (!callId) throw new Error('[videochamada] "callId" is required');

  const root = String(baseUrl).replace(/\/+$/, '');
  const url = new URL(`${root}/chamada/${encodeURIComponent(callId)}`);

  if (opts.username) url.searchParams.set('username', opts.username);
  if (opts.userId) url.searchParams.set('userid', opts.userId);

  const features = { ...(opts.features || {}) };
  // `hideControls` is a shortcut for disabling the built-in control bar so you
  // can render your own buttons around the iframe.
  if (opts.hideControls && features.controlBar === undefined) features.controlBar = false;

  for (const [key, enabled] of Object.entries(features)) {
    const alias = FEATURE_ALIASES[key];
    if (!alias) continue;
    // Only `false` has an effect — the app treats these as disable-only.
    if (enabled === false) url.searchParams.set(alias, '0');
  }

  return url.toString();
}

/** @param {string} baseUrl */
function originOf(baseUrl) {
  try {
    return new URL(String(baseUrl).replace(/\/+$/, '')).origin;
  } catch (_e) {
    return '*';
  }
}

/**
 * Controls a videochamada.com.br call embedded in an iframe.
 *
 * @example
 * const call = new VideochamadaCall({
 *   container: '#call',
 *   baseUrl: 'https://acme.videochamada.com.br',
 *   callId: 'abc-123',
 *   username: 'Maria',
 *   hideControls: true, // build your own UI
 * });
 * call.on('participantJoined', (p) => renderTile(p));
 * myMuteButton.onclick = () => call.toggleAudio();
 */
export class VideochamadaCall {
  /** @param {import('./index').VideochamadaCallOptions} options */
  constructor(options = {}) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('[videochamada] VideochamadaCall requires a browser environment');
    }

    this.options = options;
    this.baseUrl = options.baseUrl;
    this.expectedOrigin = originOf(options.baseUrl);

    /** @type {import('./index').CallTheme | null} */
    this.theme = options.theme || null;
    this._themeSent = false;

    /** @type {import('./index').CallStatus} */
    this.status = {};
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
    /** @type {Array<(s: import('./index').CallStatus) => void>} */
    this._statusWaiters = [];
    this._destroyed = false;

    const container = resolveContainer(options.container);
    const iframe = document.createElement('iframe');
    iframe.src = buildCallUrl(options);
    iframe.allow = options.allow || DEFAULT_ALLOW;
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.style.border = options.border || '0';
    iframe.style.width = toSize(options.width, '100%');
    iframe.style.height = toSize(options.height, '100%');
    if (options.className) iframe.className = options.className;
    if (options.title) iframe.title = options.title;
    iframe.addEventListener('load', () => this._emit('ready', undefined));

    container.appendChild(iframe);
    this.iframe = iframe;

    this._onMessage = this._handleMessage.bind(this);
    window.addEventListener('message', this._onMessage);
  }

  // ---- messaging ----------------------------------------------------------

  /** @param {MessageEvent} event */
  _handleMessage(event) {
    if (this._destroyed) return;
    // Only react to OUR iframe — otherwise multiple calls on one page cross-talk.
    if (this.iframe && event.source !== this.iframe.contentWindow) return;
    // Only accept messages from the call origin (skip check for wildcard base).
    if (this.expectedOrigin !== '*' && event.origin !== this.expectedOrigin) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'videocall-status' && data.status) {
      // The first status proves the call app's bridge is alive — safe to push
      // the initial theme now (the iframe 'load' event fires too early).
      if (this.theme && !this._themeSent) {
        this._themeSent = true;
        this.send('setTheme', this.theme);
      }
      this.status = data.status;
      this._emit('status', data.status);
      const waiters = this._statusWaiters.splice(0);
      waiters.forEach((resolve) => resolve(data.status));
    } else if (data.type === 'videocall-event' && data.event) {
      this._emit(data.event, data.data);
    }
  }

  /**
   * Send a raw command to the call. You normally use the named methods instead.
   * @param {string} action
   * @param {any} [data]
   */
  send(action, data) {
    if (this._destroyed || !this.iframe || !this.iframe.contentWindow) return;
    this.iframe.contentWindow.postMessage(
      { type: 'videocall-command', action, data },
      this.expectedOrigin,
    );
  }

  // ---- media controls -----------------------------------------------------

  toggleAudio() { this.send('toggleAudio'); }
  /** Mute the mic if currently on (no-op if already muted). */
  mute() { if (this.status.audioEnabled !== false) this.send('toggleAudio'); }
  /** Unmute the mic if currently off. */
  unmute() { if (this.status.audioEnabled === false) this.send('toggleAudio'); }

  toggleVideo() { this.send('toggleVideo'); }
  enableCamera() { if (this.status.videoEnabled === false) this.send('toggleVideo'); }
  disableCamera() { if (this.status.videoEnabled !== false) this.send('toggleVideo'); }

  toggleScreenShare() { this.send('toggleScreenShare'); }
  startScreenShare() { if (!this.status.screenShareEnabled) this.send('toggleScreenShare'); }
  stopScreenShare() { if (this.status.screenShareEnabled) this.send('toggleScreenShare'); }

  // ---- UI controls --------------------------------------------------------

  openChat() { this.send('openChat'); }
  closeChat() { this.send('closeChat'); }
  toggleChat() { this.status.chatOpen ? this.send('closeChat') : this.send('openChat'); }
  toggleRaiseHand() { this.send('toggleRaiseHand'); }
  /** @param {'mosaic' | 'sidebar'} layout */
  setLayout(layout) { this.send('changeLayout', { layout }); }
  openLayoutDialog() { this.send('openLayoutDialog'); }
  openSettings() { this.send('openSettings'); }
  /**
   * Apply theme tokens to the call UI (colors, background, control bar, tiles, font).
   * Only the documented keys are honored; unknown keys are ignored by the app.
   * @param {import('./index').CallTheme} theme
   */
  setTheme(theme) { this.theme = theme; this._themeSent = true; this.send('setTheme', theme); }
  toggleConnectionStatus() { this.send('toggleConnectionStatus'); }
  endCall() { this.send('endCall'); }

  /**
   * Ask the call for its current status. Resolves with the next status push.
   * @param {number} [timeoutMs=3000]
   * @returns {Promise<import('./index').CallStatus>}
   */
  getStatus(timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = this._statusWaiters.indexOf(onStatus);
        if (i >= 0) this._statusWaiters.splice(i, 1);
        reject(new Error('[videochamada] getStatus timed out'));
      }, timeoutMs);
      const onStatus = (s) => { clearTimeout(timer); resolve(s); };
      this._statusWaiters.push(onStatus);
      this.send('getStatus');
    });
  }

  // ---- events -------------------------------------------------------------

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   * @param {import('./index').CallEvent} event
   * @param {(payload: any) => void} handler
   * @returns {() => void}
   */
  on(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * @param {import('./index').CallEvent} event
   * @param {(payload: any) => void} handler
   */
  off(event, handler) {
    const set = this._listeners.get(event);
    if (set) set.delete(handler);
  }

  /** @param {string} event @param {any} payload */
  _emit(event, payload) {
    const set = this._listeners.get(event);
    if (set) set.forEach((fn) => { try { fn(payload); } catch (e) { console.error('[videochamada] listener error', e); } });
  }

  /** Remove the iframe and detach all listeners. */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    window.removeEventListener('message', this._onMessage);
    this._listeners.clear();
    this._statusWaiters.length = 0;
    if (this.iframe && this.iframe.parentNode) this.iframe.parentNode.removeChild(this.iframe);
    this.iframe = null;
  }
}

/** @param {string | HTMLElement} target */
function resolveContainer(target) {
  if (!target) throw new Error('[videochamada] "container" is required (a selector or an element)');
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) throw new Error(`[videochamada] container not found: ${target}`);
  return el;
}

/** @param {number|string|undefined} value @param {string} fallback */
function toSize(value, fallback) {
  if (value === undefined || value === null) return fallback;
  return typeof value === 'number' ? `${value}px` : String(value);
}

export default VideochamadaCall;
