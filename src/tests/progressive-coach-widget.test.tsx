import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ProgressiveCoachWidget } from '../renderer/components/ProgressiveCoachWidget';
import { SimulationToolbar } from '../renderer/components/SimulationToolbar';

describe('ProgressiveCoachWidget Component Tests', () => {
  it('renders Palier 1 badge when enabled and currentLevel is 1', () => {
    const onAdvance = vi.fn();
    const onToggle = vi.fn();

    render(
      <ProgressiveCoachWidget
        enabled={true}
        currentLevel={1}
        status="ATTACK"
        issueType="MATERIAL"
        issueDelta={3}
        issueLabelFr="Gain de matériel (+3 pts)"
        targetPiece={{ type: 'n', square: 'f6', nameFr: 'Cavalier en f6' }}
        targetDescriptionFr="Cavalier f6 ciblé"
        hasSimulationMoves={true}
        isLoading={false}
        simulationActive={false}
        onToggleEnabled={onToggle}
        onAdvanceLevel={onAdvance}
        onSetLevel={vi.fn()}
        onStartSimulation={vi.fn()}
      />
    );

    const attackBadge = screen.getByText('ATTAQUE');
    expect(attackBadge).toBeDefined();

    fireEvent.click(attackBadge);
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('renders Palier 2 enjeu when currentLevel is 2', () => {
    const onAdvance = vi.fn();

    render(
      <ProgressiveCoachWidget
        enabled={true}
        currentLevel={2}
        status="DEFENSE"
        issueType="MATERIAL"
        issueDelta={-3}
        issueLabelFr="Perte de matériel (-3 pts)"
        targetPiece={{ type: 'p', square: 'd4', nameFr: 'Pion en d4' }}
        targetDescriptionFr="Pion d4 vulnérable"
        hasSimulationMoves={true}
        isLoading={false}
        simulationActive={false}
        onToggleEnabled={vi.fn()}
        onAdvanceLevel={onAdvance}
        onSetLevel={vi.fn()}
        onStartSimulation={vi.fn()}
      />
    );

    expect(screen.getByText('DÉFENSE')).toBeDefined();
    expect(screen.getByText('Perte de matériel (-3 pts)')).toBeDefined();

    const enjeuCard = screen.getByText('Perte de matériel (-3 pts)');
    fireEvent.click(enjeuCard);
    expect(onAdvance).toHaveBeenCalled();
  });

  it('renders Palier 3 target detail and simulation button when currentLevel is 3', () => {
    const onStartSim = vi.fn();

    render(
      <ProgressiveCoachWidget
        enabled={true}
        currentLevel={3}
        status="ATTACK"
        issueType="MATERIAL"
        issueDelta={3}
        issueLabelFr="Gain de matériel (+3 pts)"
        targetPiece={{ type: 'n', square: 'f6', nameFr: 'Cavalier en f6' }}
        targetDescriptionFr="Cavalier f6 ciblé"
        hasSimulationMoves={true}
        isLoading={false}
        simulationActive={false}
        onToggleEnabled={vi.fn()}
        onAdvanceLevel={vi.fn()}
        onSetLevel={vi.fn()}
        onStartSimulation={onStartSim}
      />
    );

    expect(screen.getByText('Cavalier f6 ciblé')).toBeDefined();
    const simButton = screen.getByText('Visualiser la variante');
    expect(simButton).toBeDefined();

    fireEvent.click(simButton);
    expect(onStartSim).toHaveBeenCalledTimes(1);
  });
});

describe('SimulationToolbar Component Tests', () => {
  it('renders simulation banner and step controls when active', () => {
    const onExit = vi.fn();
    const onStep = vi.fn();

    render(
      <SimulationToolbar
        active={true}
        stepIndex={0}
        totalSteps={3}
        currentMove={{
          uci: 'e2e4',
          san: 'e4',
          fen: 'fen1',
          from: 'e2',
          to: 'e4',
          color: 'w',
        }}
        playerColor="white"
        onExit={onExit}
        onStep={onStep}
      />
    );

    expect(screen.getByText('Visualisation du futur')).toBeDefined();
    expect(screen.getByText('1/3')).toBeDefined();
    expect(screen.getByText('e4')).toBeDefined();

    const quitBtn = screen.getByText('Quitter');
    fireEvent.click(quitBtn);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when active is false', () => {
    const { container } = render(
      <SimulationToolbar
        active={false}
        stepIndex={0}
        totalSteps={3}
        playerColor="white"
        onExit={vi.fn()}
        onStep={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
