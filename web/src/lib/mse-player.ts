/**
 * MSE WebSocket client for go2rtc.
 * Protocol: send {"type":"mse","value":"<codecs>"} on open,
 * receive {"type":"mse","value":"<mime>"} then binary segments.
 * Returns a cleanup function for useEffect.
 */

const CODECS = [
  'avc1.640029',  // H.264 High 4.1
  'avc1.64001f',  // H.264 High 3.1
  'hvc1.1.6.L153.B0', // H.265
  'mp4a.40.2',    // AAC-LC
  'mp4a.40.5',    // HE-AAC
  'flac',
  'opus',
];

function supportedCodecs(): string {
  return CODECS.filter(c =>
    MediaSource.isTypeSupported(`video/mp4; codecs="${c}"`)
  ).join(',');
}

export function connectMSE(
  video: HTMLVideoElement,
  wsUrl: string,
): () => void {
  let ws: WebSocket | null = null;
  let ms: MediaSource | null = null;
  let sb: SourceBuffer | null = null;
  let queue: ArrayBuffer[] = [];
  let destroyed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function cleanup() {
    destroyed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
      ws.onopen = ws.onclose = ws.onmessage = ws.onerror = null;
      ws.close();
      ws = null;
    }
    if (sb && ms && ms.readyState === 'open') {
      try { ms.removeSourceBuffer(sb); } catch {}
    }
    ms = null;
    sb = null;
    queue = [];
  }

  function flushQueue() {
    if (!sb || sb.updating || queue.length === 0) return;
    const buf = queue.shift()!;
    try {
      sb.appendBuffer(buf);
    } catch {
      // SourceBuffer might be full or in bad state — drop this segment
    }
  }

  function connect() {
    if (destroyed) return;

    ms = new MediaSource();
    video.src = URL.createObjectURL(ms);
    queue = [];
    sb = null;

    ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      // Tell go2rtc we want MSE with our supported codecs
      ws!.send(JSON.stringify({ type: 'mse', value: supportedCodecs() }));
    };

    ws.onmessage = (ev: MessageEvent) => {
      if (typeof ev.data === 'string') {
        // JSON message from go2rtc — expect {"type":"mse","value":"<mime>"}
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'mse' && msg.value && ms!.readyState === 'open') {
            sb = ms!.addSourceBuffer(msg.value);
            sb.mode = 'segments';
            sb.addEventListener('updateend', flushQueue);
          }
        } catch {}
      } else if (sb) {
        queue.push(ev.data as ArrayBuffer);
        flushQueue();
      }
    };

    ws.onclose = () => {
      if (!destroyed) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  connect();
  return cleanup;
}
