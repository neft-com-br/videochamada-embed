// Type definitions for @videochamada/embed

/** Feature flags that can be disabled at embed time (disable-only; DB-disabled always wins). */
export interface CallFeatures {
  chat?: boolean;
  clock?: boolean;
  controlBar?: boolean;
  closeButton?: boolean;
  raiseHand?: boolean;
  screenShare?: boolean;
  recording?: boolean;
  transcription?: boolean;
  virtualBackground?: boolean;
  hardwareTest?: boolean;
  pendingCallCard?: boolean;
  nameInput?: boolean;
  waitingRoom?: boolean;
  summary?: boolean;
}

export interface CallUrlOptions {
  /** Origin of your project — org subdomain or custom domain (e.g. https://acme.videochamada.com.br). */
  baseUrl: string;
  /** Call id returned by POST /api/calls. */
  callId: string;
  /** Pre-fill the participant name. */
  username?: string;
  /** Optional stable participant id. */
  userId?: string;
  /** Shortcut for `features.controlBar = false` so you can render your own controls. */
  hideControls?: boolean;
  /** Per-feature toggles; only `false` has an effect. */
  features?: CallFeatures;
}

/**
 * Theme tokens applied inside the call UI. Every value is a plain CSS value
 * (color, length, or font-family list). Unknown keys are ignored by the app.
 */
export interface CallTheme {
  /** Background of the call/video area. */
  background?: string;
  /** Panels/surfaces (chat, dialogs). */
  surface?: string;
  /** Control bar background. */
  controlBarBackground?: string;
  /** Standard control button background. */
  buttonBackground?: string;
  /** Control button text/icon color. */
  buttonText?: string;
  /** Accent / primary color for highlights. */
  accent?: string;
  /** End-call (hang up) button background. */
  endCallBackground?: string;
  /** Video tile background. */
  tileBackground?: string;
  /** Video tile corner radius (e.g. '14px'). */
  tileRadius?: string;
  /** Main text color. */
  textColor?: string;
  /** Font family list (e.g. 'Inter, sans-serif'). */
  font?: string;
}

export interface VideochamadaCallOptions extends CallUrlOptions {
  /** Where to mount the iframe: a CSS selector or an element. */
  container: string | HTMLElement;
  /** Theme tokens applied to the call UI on load. */
  theme?: CallTheme;
  /** iframe width (number = px). Default '100%'. */
  width?: number | string;
  /** iframe height (number = px). Default '100%'. */
  height?: number | string;
  /** iframe `allow` attribute. Defaults to camera; microphone; display-capture; autoplay; fullscreen. */
  allow?: string;
  /** iframe CSS border. Default '0'. */
  border?: string;
  /** iframe class attribute. */
  className?: string;
  /** iframe title (accessibility). */
  title?: string;
}

export interface CallStatus {
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  screenShareEnabled?: boolean;
  chatOpen?: boolean;
  handRaised?: boolean;
  layoutMode?: 'mosaic' | 'sidebar' | string;
  participantCount?: number;
  isRecording?: boolean;
  connectionStatusVisible?: boolean;
}

export type CallEvent =
  | 'ready'
  | 'status'
  | 'audioToggled'
  | 'videoToggled'
  | 'screenShareToggled'
  | 'participantJoined'
  | 'participantLeft'
  | 'callEnded';

export const FEATURE_ALIASES: Record<string, string>;

export function buildCallUrl(opts: CallUrlOptions): string;

export class VideochamadaCall {
  constructor(options: VideochamadaCallOptions);
  readonly iframe: HTMLIFrameElement | null;
  readonly status: CallStatus;

  send(action: string, data?: unknown): void;

  toggleAudio(): void;
  mute(): void;
  unmute(): void;
  toggleVideo(): void;
  enableCamera(): void;
  disableCamera(): void;
  toggleScreenShare(): void;
  startScreenShare(): void;
  stopScreenShare(): void;

  openChat(): void;
  closeChat(): void;
  toggleChat(): void;
  toggleRaiseHand(): void;
  setLayout(layout: 'mosaic' | 'sidebar'): void;
  openLayoutDialog(): void;
  openSettings(): void;
  setTheme(theme: CallTheme): void;
  theme: CallTheme | null;
  toggleConnectionStatus(): void;
  endCall(): void;

  getStatus(timeoutMs?: number): Promise<CallStatus>;

  on(event: CallEvent, handler: (payload: any) => void): () => void;
  off(event: CallEvent, handler: (payload: any) => void): void;

  destroy(): void;
}

export default VideochamadaCall;
