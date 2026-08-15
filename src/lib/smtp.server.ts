/**
 * Minimal SMTP client that works both on Node (vite dev) and on the
 * Cloudflare Workers runtime (published app) via `cloudflare:sockets`.
 */

export interface SmtpConfig {
  host: string;
  port: number;
  tls: boolean;
  username: string;
  password: string;
  verify_cert: boolean;
}

export interface MailMessage {
  from: string;
  fromName?: string | null;
  to: string[];
  cc?: string[];
  bcc?: string[];
  raw: string;
}

interface Conn {
  write(data: string | Uint8Array): Promise<void>;
  readLine(): Promise<string>;
  startTls(): Promise<void>;
  close(): Promise<void>;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

class StreamConn implements Conn {
  private buffer = "";
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private writer: WritableStreamDefaultWriter<Uint8Array>;

  constructor(
    private socket: {
      readable: ReadableStream<Uint8Array>;
      writable: WritableStream<Uint8Array>;
      close(): Promise<void>;
      startTls?: () => {
        readable: ReadableStream<Uint8Array>;
        writable: WritableStream<Uint8Array>;
        close(): Promise<void>;
      };
    },
  ) {
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
  }

  async write(data: string | Uint8Array) {
    await this.writer.write(typeof data === "string" ? encoder.encode(data) : data);
  }

  async readLine(): Promise<string> {
    while (!this.buffer.includes("\r\n")) {
      const { value, done } = await this.reader.read();
      if (done) break;
      if (value) this.buffer += decoder.decode(value, { stream: true });
    }
    const idx = this.buffer.indexOf("\r\n");
    if (idx === -1) {
      const rest = this.buffer;
      this.buffer = "";
      return rest;
    }
    const line = this.buffer.slice(0, idx);
    this.buffer = this.buffer.slice(idx + 2);
    return line;
  }

  async startTls() {
    if (!this.socket.startTls) throw new Error("STARTTLS not supported by runtime");
    this.reader.releaseLock();
    this.writer.releaseLock();
    const secure = this.socket.startTls();
    this.socket = secure as never;
    this.reader = secure.readable.getReader();
    this.writer = secure.writable.getWriter();
    this.buffer = "";
  }

  async close() {
    try {
      await this.socket.close();
    } catch {
      /* ignore */
    }
  }
}

class NodeConn implements Conn {
  private buffer = "";
  private chunks: Buffer[] = [];
  private waiter: (() => void) | null = null;
  private closed = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private socket: any) {
    this.bind();
  }

  private bind() {
    this.socket.on("data", (chunk: Buffer) => {
      this.chunks.push(chunk);
      this.waiter?.();
    });
    this.socket.on("close", () => {
      this.closed = true;
      this.waiter?.();
    });
    this.socket.on("error", () => {
      this.closed = true;
      this.waiter?.();
    });
  }

  async write(data: string | Uint8Array) {
    await new Promise<void>((resolve, reject) => {
      this.socket.write(data, (err?: Error) => (err ? reject(err) : resolve()));
    });
  }

  async readLine(): Promise<string> {
    while (!this.buffer.includes("\r\n")) {
      if (this.chunks.length) {
        this.buffer += this.chunks.shift()!.toString("utf8");
        continue;
      }
      if (this.closed) break;
      await new Promise<void>((resolve) => {
        this.waiter = () => {
          this.waiter = null;
          resolve();
        };
      });
    }
    const idx = this.buffer.indexOf("\r\n");
    if (idx === -1) {
      const rest = this.buffer;
      this.buffer = "";
      return rest;
    }
    const line = this.buffer.slice(0, idx);
    this.buffer = this.buffer.slice(idx + 2);
    return line;
  }

  async startTls() {
    const tls = await import("node:tls");
    const plain = this.socket;
    plain.removeAllListeners("data");
    plain.removeAllListeners("close");
    plain.removeAllListeners("error");
    this.socket = await new Promise((resolve, reject) => {
      const secure = tls.connect(
        { socket: plain, rejectUnauthorized: this.rejectUnauthorized, servername: this.servername },
        () => resolve(secure),
      );
      secure.on("error", reject);
    });
    this.chunks = [];
    this.buffer = "";
    this.bind();
  }

  rejectUnauthorized = false;
  servername = "";

  async close() {
    try {
      this.socket.destroy();
    } catch {
      /* ignore */
    }
  }
}

async function openConnection(cfg: SmtpConfig): Promise<Conn> {
  const implicitTls = cfg.tls && cfg.port === 465;
  // Cloudflare Workers runtime
  try {
    const cfSockets = "cloudflare:sockets";
    const mod = (await import(/* @vite-ignore */ cfSockets)) as {
      connect: (addr: { hostname: string; port: number }, opts?: Record<string, unknown>) => never;
    };
    const socket = mod.connect(
      { hostname: cfg.host, port: cfg.port },
      { secureTransport: implicitTls ? "on" : cfg.tls ? "starttls" : "off", allowHalfOpen: false },
    );
    return new StreamConn(socket as never);
  } catch {
    /* fall through to node */
  }

  if (implicitTls) {
    const tls = await import("node:tls");
    const socket = await new Promise((resolve, reject) => {
      const s = tls.connect(
        { host: cfg.host, port: cfg.port, rejectUnauthorized: cfg.verify_cert, servername: cfg.host },
        () => resolve(s),
      );
      s.on("error", reject);
      s.setTimeout(20000, () => reject(new Error("Koneksi SMTP timeout")));
    });
    return new NodeConn(socket);
  }

  const net = await import("node:net");
  const socket = await new Promise((resolve, reject) => {
    const s = net.connect({ host: cfg.host, port: cfg.port }, () => resolve(s));
    s.on("error", reject);
    s.setTimeout(20000, () => reject(new Error("Koneksi SMTP timeout")));
  });
  const conn = new NodeConn(socket);
  conn.rejectUnauthorized = cfg.verify_cert;
  conn.servername = cfg.host;
  return conn;
}

async function readReply(conn: Conn): Promise<{ code: number; text: string }> {
  const lines: string[] = [];
  for (;;) {
    const line = await conn.readLine();
    if (!line) break;
    lines.push(line);
    if (line.length < 4 || line[3] !== "-") break;
  }
  const text = lines.join("\n");
  const code = Number.parseInt(text.slice(0, 3), 10);
  return { code: Number.isNaN(code) ? 0 : code, text };
}

async function command(conn: Conn, cmd: string, expect: number[]): Promise<string> {
  await conn.write(cmd + "\r\n");
  const { code, text } = await readReply(conn);
  if (!expect.includes(code)) {
    throw new Error(`SMTP ${cmd.split(" ")[0]} gagal: ${text || "tidak ada balasan"}`);
  }
  return text;
}

function b64(value: string): string {
  const bytes = encoder.encode(value);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function handshake(conn: Conn, cfg: SmtpConfig): Promise<string> {
  const greeting = await readReply(conn);
  if (greeting.code !== 220) throw new Error(`Server menolak koneksi: ${greeting.text}`);

  let ehlo = await command(conn, `EHLO ${cfg.host}`, [250]);

  if (cfg.tls && cfg.port !== 465 && /STARTTLS/i.test(ehlo)) {
    await command(conn, "STARTTLS", [220]);
    await conn.startTls();
    ehlo = await command(conn, `EHLO ${cfg.host}`, [250]);
  }

  if (cfg.username) {
    if (/AUTH[ -=].*PLAIN/i.test(ehlo)) {
      await command(conn, `AUTH PLAIN ${b64(`\u0000${cfg.username}\u0000${cfg.password}`)}`, [235]);
    } else {
      await command(conn, "AUTH LOGIN", [334]);
      await command(conn, b64(cfg.username), [334]);
      await command(conn, b64(cfg.password), [235]);
    }
  }
  return ehlo;
}

export async function testSmtp(cfg: SmtpConfig): Promise<void> {
  const conn = await openConnection(cfg);
  try {
    await handshake(conn, cfg);
    await command(conn, "QUIT", [221, 250]);
  } finally {
    await conn.close();
  }
}

export async function sendMail(cfg: SmtpConfig, msg: MailMessage): Promise<void> {
  const conn = await openConnection(cfg);
  try {
    await handshake(conn, cfg);
    await command(conn, `MAIL FROM:<${msg.from}>`, [250]);
    const rcpts = [...msg.to, ...(msg.cc ?? []), ...(msg.bcc ?? [])].filter(Boolean);
    if (rcpts.length === 0) throw new Error("Tidak ada penerima");
    for (const rcpt of rcpts) {
      await command(conn, `RCPT TO:<${rcpt}>`, [250, 251]);
    }
    await command(conn, "DATA", [354]);
    const body = msg.raw.replace(/\r?\n/g, "\r\n").replace(/\r\n\./g, "\r\n..");
    await conn.write(body + "\r\n.\r\n");
    const done = await readReply(conn);
    if (done.code !== 250) throw new Error(`Pengiriman ditolak: ${done.text}`);
    await command(conn, "QUIT", [221, 250]);
  } finally {
    await conn.close();
  }
}
