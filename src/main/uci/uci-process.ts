import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import readline from 'node:readline';

export interface UciProcessOptions {
  binaryPath: string;
  args?: string[];
  cwd?: string;
  timeoutMs?: number;
  name?: string;
}

export class UciProcess {
  private process: ChildProcessWithoutNullStreams | null = null;
  private rl: readline.Interface | null = null;
  private isReady = false;
  private commandQueue: {
    command: string;
    stopPattern: RegExp;
    resolve: (lines: string[]) => void;
    reject: (err: Error) => void;
    timeout: NodeJS.Timeout;
    collectedLines: string[];
  }[] = [];
  private activeCommand: (typeof this.commandQueue)[0] | null = null;
  private currentOptions: UciProcessOptions;

  constructor(options: UciProcessOptions) {
    this.currentOptions = {
      timeoutMs: 8000,
      name: 'UCI-Engine',
      ...options,
    };
  }

  public async start(): Promise<void> {
    if (this.process) {
      await this.stop();
    }

    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.currentOptions.binaryPath, this.currentOptions.args || [], {
          cwd: this.currentOptions.cwd,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        const currentProc = this.process;

        currentProc.on('error', (err) => {
          if (this.process !== currentProc) return;
          console.error(`[${this.currentOptions.name}] Process error:`, err);
          this.handleProcessCrash(err);
          reject(err);
        });

        currentProc.on('exit', (code, signal) => {
          if (this.process !== currentProc) return;
          console.log(`[${this.currentOptions.name}] Process exited (code: ${code}, signal: ${signal})`);
          this.handleProcessCrash(new Error(`Process exited with code ${code}`));
        });

        this.rl = readline.createInterface({
          input: this.process.stdout,
          terminal: false,
        });

        this.rl.on('line', (line) => {
          this.handleLine(line);
        });

        // Handshake standard UCI : uci -> uciok, isready -> readyok
        this.sendCommand('uci', /uciok/)
          .then(() => this.sendCommand('isready', /readyok/))
          .then(() => {
            this.isReady = true;
            resolve();
          })
          .catch(reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  private handleLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (this.activeCommand) {
      this.activeCommand.collectedLines.push(trimmed);
      if (this.activeCommand.stopPattern.test(trimmed)) {
        clearTimeout(this.activeCommand.timeout);
        const cmd = this.activeCommand;
        this.activeCommand = null;
        cmd.resolve(cmd.collectedLines);
        this.processNextCommand();
      }
    }
  }

  private handleProcessCrash(error: Error): void {
    this.isReady = false;
    if (this.activeCommand) {
      clearTimeout(this.activeCommand.timeout);
      this.activeCommand.reject(error);
      this.activeCommand = null;
    }
    while (this.commandQueue.length > 0) {
      const cmd = this.commandQueue.shift()!;
      clearTimeout(cmd.timeout);
      cmd.reject(error);
    }
  }

  /**
   * Envoie une commande sans attendre de retour (ex: "position fen ...", "ucinewgame").
   * En protocole UCI, ces instructions ne génèrent aucun texte sur stdout.
   */
  public writeLine(command: string): void {
    if (this.process && this.process.stdin.writable) {
      this.process.stdin.write(command.trim() + '\n');
    }
  }

  /**
   * Envoie une position et valide que le moteur est prêt avec "isready" -> "readyok".
   */
  public async setPosition(fen: string): Promise<void> {
    this.writeLine(`position fen ${fen}`);
    await this.sendCommand('isready', /readyok/, 2000);
  }

  public sendCommand(command: string, stopPattern: RegExp, customTimeout?: number): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const timeoutMs = customTimeout || this.currentOptions.timeoutMs || 8000;
      const timeout = setTimeout(() => {
        console.warn(`[${this.currentOptions.name}] Command "${command}" timed out after ${timeoutMs}ms.`);
        this.handleTimeout(new Error(`UCI command "${command}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.commandQueue.push({
        command,
        stopPattern,
        resolve,
        reject,
        timeout,
        collectedLines: [],
      });

      if (!this.activeCommand) {
        this.processNextCommand();
      }
    });
  }

  private processNextCommand(): void {
    if (this.commandQueue.length === 0) return;
    this.activeCommand = this.commandQueue.shift()!;
    if (this.process && this.process.stdin.writable) {
      this.process.stdin.write(this.activeCommand.command + '\n');
    } else {
      clearTimeout(this.activeCommand.timeout);
      const cmd = this.activeCommand;
      this.activeCommand = null;
      cmd.reject(new Error('UCI process stdin not writable'));
      this.processNextCommand();
    }
  }

  private async handleTimeout(err: Error): Promise<void> {
    if (this.activeCommand) {
      this.activeCommand.reject(err);
      this.activeCommand = null;
    }
    try {
      await this.restart();
    } catch (e) {
      console.error(`[${this.currentOptions.name}] Failed to auto-restart engine after timeout:`, e);
    }
  }

  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  public async stop(): Promise<void> {
    this.isReady = false;
    if (this.activeCommand) {
      clearTimeout(this.activeCommand.timeout);
      this.activeCommand = null;
    }
    this.commandQueue.forEach(cmd => clearTimeout(cmd.timeout));
    this.commandQueue = [];

    if (this.process) {
      try {
        if (this.process.stdin.writable) {
          this.process.stdin.write('quit\n');
        }
      } catch (_) {}

      if (this.rl) {
        this.rl.close();
        this.rl = null;
      }

      const proc = this.process;
      this.process = null;

      setTimeout(() => {
        try {
          if (!proc.killed) {
            proc.kill('SIGKILL');
          }
        } catch (_) {}
      }, 500);
    }
  }

  public getReadyStatus(): boolean {
    return this.isReady;
  }
}
