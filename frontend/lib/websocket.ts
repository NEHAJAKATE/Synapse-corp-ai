/**
 * WebSocket client for real-time agent status updates from the backend.
 */

type WSEventHandler = (event: any) => void;

export class SynapseWebSocket {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private onEvent: WSEventHandler;
  private onConnect?: () => void;
  private onDisconnect?: () => void;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    sessionId: string,
    onEvent: WSEventHandler,
    onConnect?: () => void,
    onDisconnect?: () => void
  ) {
    this.sessionId = sessionId;
    this.onEvent = onEvent;
    this.onConnect = onConnect;
    this.onDisconnect = onDisconnect;
  }

  connect(): void {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    this.ws = new WebSocket(`${wsUrl}/ws/session/${this.sessionId}`);

    this.ws.onopen = () => {
      this.onConnect?.();
      // Keep-alive ping every 25s
      this.pingInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send("ping");
        }
      }, 25000);
    };

    this.ws.onmessage = (event) => {
      if (event.data === "pong") return;
      try {
        const data = JSON.parse(event.data);
        this.onEvent(data);
      } catch {}
    };

    this.ws.onclose = () => {
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.onDisconnect?.();
    };

    this.ws.onerror = () => {
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.onDisconnect?.();
    };
  }

  disconnect(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.ws?.close();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
