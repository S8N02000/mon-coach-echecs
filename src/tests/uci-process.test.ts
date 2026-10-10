import { describe, it, expect, vi } from 'vitest';
import { UciProcess } from '../main/uci/uci-process';
import { getResourcesBinDir } from '../main/utils/paths';
import path from 'node:path';

describe('UciProcess Unit & Integration', () => {
  const isWindows = process.platform === 'win32';
  const binaryName = isWindows ? 'stockfish.exe' : 'stockfish';
  const binPath = path.join(getResourcesBinDir(), binaryName);

  it('initializes with default options and getReadyStatus false', () => {
    const uci = new UciProcess({ binaryPath: binPath });
    expect(uci.getReadyStatus()).toBe(false);
  });

  it('starts real Stockfish, performs UCI handshake, executes commands and stops', async () => {
    const uci = new UciProcess({
      binaryPath: binPath,
      name: 'Test-Stockfish',
      timeoutMs: 4000,
    });

    await uci.start();
    expect(uci.getReadyStatus()).toBe(true);

    // setPosition
    await uci.setPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

    // sendCommand
    const lines = await uci.sendCommand('go depth 1', /^bestmove/);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some((l) => l.startsWith('bestmove'))).toBe(true);

    // writeLine
    uci.writeLine('isready');

    await uci.stop();
    expect(uci.getReadyStatus()).toBe(false);
  });

  it('restarts engine cleanly when restart() is called', async () => {
    const uci = new UciProcess({
      binaryPath: binPath,
      name: 'Test-Restart',
      timeoutMs: 4000,
    });

    await uci.start();
    expect(uci.getReadyStatus()).toBe(true);

    await uci.restart();
    expect(uci.getReadyStatus()).toBe(true);

    await uci.stop();
  });

  describe('Error handling & mock process edge cases', () => {
    it('handles process spawn error and rejects start', async () => {
      const uci = new UciProcess({
        binaryPath: '/non/existent/path/to/binary',
        name: 'Invalid-Binary',
      });

      await expect(uci.start()).rejects.toThrow();
      expect(uci.getReadyStatus()).toBe(false);
    });

    it('handles process crash and rejects queued commands', async () => {
      const uci = new UciProcess({
        binaryPath: binPath,
        name: 'Kill-Crash-Test',
        timeoutMs: 4000,
      });

      await uci.start();
      expect(uci.getReadyStatus()).toBe(true);

      // Queue a long running command
      const cmdPromise = uci.sendCommand('go depth 25', /^bestmove/);

      // Abruptly kill the underlying process
      const proc = (uci as any).process;
      proc.kill('SIGKILL');

      await expect(cmdPromise).rejects.toThrow();
      expect(uci.getReadyStatus()).toBe(false);

      await uci.stop();
    });

    it('handles command timeout and triggers restart attempt', async () => {
      const uci = new UciProcess({
        binaryPath: binPath,
        name: 'Timeout-Test',
        timeoutMs: 5000,
      });

      await uci.start();

      // Send a command expecting an impossible stop pattern with very short timeout
      await expect(uci.sendCommand('go depth 25', /^nonexistent_token_xyz/, 150)).rejects.toThrow(
        /timed out/
      );

      await uci.stop();
    }, 10000);

    it('handles stopping when already stopped', async () => {
      const uci = new UciProcess({ binaryPath: binPath });
      await expect(uci.stop()).resolves.toBeUndefined();
    });
  });
});
