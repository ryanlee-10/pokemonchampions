import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

export type NetworkMessageType =
  | 'JOIN_ROOM'
  | 'TEAM_SUBMIT'
  | 'GAME_START'
  | 'TURN_ACTION'
  | 'GAME_STATE_UPDATE'
  | 'CHAT_MESSAGE';

export interface NetworkMessage {
  type: NetworkMessageType;
  payload: any;
  senderId: string;
}

export class PeerManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  public myPeerId: string = '';
  public isHost: boolean = false;

  private onMessageCallback?: (msg: NetworkMessage) => void;
  private onConnectCallback?: () => void;
  private onDisconnectCallback?: () => void;

  constructor() {}

  public setMessageCallback(callback?: (msg: NetworkMessage) => void) {
    this.onMessageCallback = callback;
  }

  public setDisconnectCallback(callback?: () => void) {
    this.onDisconnectCallback = callback;
  }

  public isConnected(): boolean {
    return Boolean(this.conn && this.conn.open);
  }

  public init(
    customId?: string,
    onConnect?: () => void,
    onMessage?: (msg: NetworkMessage) => void,
    onDisconnect?: () => void
  ): Promise<string> {
    this.disconnect();

    if (onConnect) this.onConnectCallback = onConnect;
    if (onMessage) this.onMessageCallback = onMessage;
    if (onDisconnect) this.onDisconnectCallback = onDisconnect;

    return new Promise((resolve, reject) => {
      // Use public Google STUN servers for robust zero-config NAT/firewall traversal
      this.peer = new Peer(customId || '', {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        },
        debug: 1
      });

      this.peer.on('open', (id) => {
        this.myPeerId = id;
        resolve(id);
      });

      this.peer.on('connection', (connection) => {
        this.conn = connection;
        this.isHost = true;
        this.setupConnectionHandlers();
        if (this.onConnectCallback) this.onConnectCallback();
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        reject(err);
      });
    });
  }

  public connectToHost(hostId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.peer) {
        reject(new Error('Peer not initialized'));
        return;
      }

      this.conn = this.peer.connect(hostId, { reliable: true });
      this.isHost = false;

      this.conn.on('open', () => {
        this.setupConnectionHandlers();
        if (this.onConnectCallback) this.onConnectCallback();
        resolve();
      });

      this.conn.on('error', (err) => {
        reject(err);
      });
    });
  }

  private setupConnectionHandlers() {
    if (!this.conn) return;

    this.conn.on('data', (data: any) => {
      if (this.onMessageCallback) {
        this.onMessageCallback(data as NetworkMessage);
      }
    });

    this.conn.on('close', () => {
      if (this.onDisconnectCallback) this.onDisconnectCallback();
    });
  }

  public sendMessage(type: NetworkMessageType, payload: any) {
    if (this.conn && this.conn.open) {
      const msg: NetworkMessage = {
        type,
        payload,
        senderId: this.myPeerId
      };
      this.conn.send(msg);
    }
  }

  public disconnect() {
    if (this.conn) {
      try {
        this.conn.close();
      } catch {}
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
  }
}

export const peerManager = new PeerManager();
