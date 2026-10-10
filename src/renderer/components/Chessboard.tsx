import React, { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import { Config } from 'chessground/config';
import { Key } from 'chessground/types';
import { DrawShape } from 'chessground/draw';

interface ChessboardProps {
  fen: string;
  orientation: 'white' | 'black';
  turnColor: 'white' | 'black';
  dests: Map<Key, Key[]>;
  isInteractive: boolean;
  shapes?: DrawShape[];
  lastMove?: Key[];
  check?: boolean;
  onMove: (orig: Key, dest: Key) => void;
}

export const Chessboard: React.FC<ChessboardProps> = ({
  fen,
  orientation,
  turnColor,
  dests,
  isInteractive,
  shapes = [],
  lastMove,
  check,
  onMove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<Api | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const config: Config = {
      fen,
      orientation,
      turnColor,
      autoCastle: true,
      movable: {
        free: false,
        color: isInteractive ? turnColor : undefined,
        dests,
        rookCastle: true,
        events: {
          after: (orig, dest) => {
            onMove(orig as Key, dest as Key);
          },
        },
      },
      drawable: {
        enabled: true,
        autoShapes: shapes,
      },
      highlight: {
        lastMove: true,
        check: true,
      },
      animation: {
        enabled: true,
        duration: 220,
      },
      lastMove,
      check,
    };

    if (!groundRef.current) {
      groundRef.current = Chessground(containerRef.current, config);
    } else {
      groundRef.current.set(config);
    }
  }, [fen, orientation, turnColor, dests, isInteractive, shapes, lastMove, check, onMove]);

  useEffect(() => {
    // Redimensionnement automatique lors du resize de la fenêtre
    const handleResize = () => {
      groundRef.current?.redrawAll();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative aspect-square w-auto h-full max-w-[min(650px,calc(100vh-210px))] max-h-[min(650px,calc(100vh-210px))] p-2 bg-zinc-900/80 border border-zinc-800 rounded-2xl shadow-2xl flex items-center justify-center">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
