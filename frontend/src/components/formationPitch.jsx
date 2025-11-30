// FormationPitch.jsx - Modern Design with Linear Scrolling
import React, { useState, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Text, Line, Arrow } from 'react-konva';
import { getPositionCoordinates } from '../utils/formationMap';

const ABSTRACT_WIDTH = 120;
const ABSTRACT_HEIGHT = 80;

// Modern color palette
const COLORS = {
  home: {
    primary: '#FF6B6B',
    secondary: '#EE5A6F',
    gradient: ['#FF6B6B', '#EE5A6F']
  },
  away: {
    primary: '#4ECDC4',
    secondary: '#44A08D',
    gradient: ['#4ECDC4', '#44A08D']
  },
  accent: '#FFE66D',
  pitch: {
    main: '#1a5c3e',
    lines: 'rgba(255, 255, 255, 0.75)',
    border: '#0d3d28'
  },
  pass: {
    default: '#FFE66D',
    carry: '#A78BFA'
  }
};

const PlayerMarker = ({
  player,
  teamType,
  onPlayerClick,
  pitchWidth,
  pitchHeight,
  formationName,
  isActive,
  animatedPosition
}) => {
  const posName = player.positions[0]?.position;
  let abstractPos = getPositionCoordinates(formationName, posName);
  
  const initialX = teamType === 'home'
    ? (abstractPos.x / ABSTRACT_WIDTH) * pitchWidth
    : ((ABSTRACT_WIDTH - abstractPos.x) / ABSTRACT_WIDTH) * pitchWidth;

  const initialY = ((ABSTRACT_HEIGHT - abstractPos.y) / ABSTRACT_HEIGHT) * pitchHeight;
  
  const [pixel, setpixel] = useState({ pixelX: initialX, pixelY: initialY });
  const nodeRef = React.useRef();

  // Smooth animated position updates
  useEffect(() => {
    if (animatedPosition) {
      const newX = teamType === 'home'
        ? (animatedPosition.x / ABSTRACT_WIDTH) * pitchWidth
        : ((ABSTRACT_WIDTH - animatedPosition.x) / ABSTRACT_WIDTH) * pitchWidth;
      
      const newY = ((ABSTRACT_HEIGHT - animatedPosition.y) / ABSTRACT_HEIGHT) * pitchHeight;
      
      setpixel({ pixelX: newX, pixelY: newY });
    }
  }, [animatedPosition, pitchWidth, pitchHeight, teamType]);

  // Linear drag - updates in real-time during drag
  const handleDragMove = (e) => {
    setpixel({
      pixelX: e.target.x(),
      pixelY: e.target.y()
    });
  };

  const getShortName = (fullName) => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0];
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    return `${firstName.charAt(0)}. ${lastName}`;
  };

  // Modern gradient fill
  const teamColor = teamType === 'home' ? COLORS.home : COLORS.away;

  return (
    <React.Fragment>
      <Circle
        ref={nodeRef}
        x={pixel.pixelX}
        y={pixel.pixelY}
        radius={isActive ? 15 : 12}
        fill={teamColor.primary}
        stroke={isActive ? COLORS.accent : 'white'}
        strokeWidth={isActive ? 3 : 2}
        shadowBlur={isActive ? 10 : 6}
        shadowColor={teamColor.secondary}
        shadowOpacity={0.6}
        onClick={() => onPlayerClick(player.player_id, player.player_name)}
        onTap={() => onPlayerClick(player.player_id, player.player_name)}
        draggable={true}
        onDragMove={handleDragMove}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
      />
      
      <Text
        text={player.jersey_number.toString()}
        x={pixel.pixelX - 5}
        y={pixel.pixelY - 6}
        fontSize={10}
        fill="white"
        fontStyle="bold"
        listening={false}
        perfectDrawEnabled={false}
      />
      
      <Text
        text={getShortName(player.player_name)}
        x={pixel.pixelX}
        y={pixel.pixelY - 26}
        fontSize={9}
        fill="white"
        fontStyle="bold"
        align="center"
        offsetX={getShortName(player.player_name).length * 2.5}
        listening={false}
        perfectDrawEnabled={false}
        shadowColor="black"
        shadowBlur={4}
        shadowOpacity={0.8}
        shadowOffsetX={1}
        shadowOffsetY={1}
      />
    </React.Fragment>
  );
};

// Modern Pass Arrow with gradient effect
const PassArrow = ({ from, to, color = COLORS.pass.default, opacity = 0.9, isCarry = false }) => {
  const arrowColor = isCarry ? COLORS.pass.carry : color;
  
  return (
    <Arrow
      points={[from.x, from.y, to.x, to.y]}
      stroke={arrowColor}
      strokeWidth={isCarry ? 4 : 3}
      fill={arrowColor}
      pointerLength={12}
      pointerWidth={12}
      opacity={opacity}
      shadowColor="black"
      shadowBlur={8}
      shadowOpacity={0.6}
      listening={false}
      perfectDrawEnabled={false}
      dash={isCarry ? [8, 4] : undefined}
    />
  );
};

const FormationPitch = ({
  homePlayers,
  awayPlayers,
  homeFormation,
  awayFormation,
  onPlayerClick,
  activePlayer,
  animatedPositions = {},
  passArrows = []
}) => {
  const containerRef = React.useRef(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  const hasFreezeFramePositions = Object.keys(animatedPositions).some(key => key.startsWith('freeze_'));

  console.log('🎨 FormationPitch render:', {
    animatedPositionsCount: Object.keys(animatedPositions).length,
    hasFreezeFrame: hasFreezeFramePositions,
    firstKey: Object.keys(animatedPositions)[0]
  });

  React.useEffect(() => {
    const checkSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = (width / 120) * 80;
        if (width > 0 && height > 0) {
          setSize({ width, height });
        }
      }
    };
    const timer = setTimeout(checkSize, 0);
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => {
      window.removeEventListener("resize", checkSize);
      clearTimeout(timer);
    };
  }, []);

  const convertToPixels = (abstractPos) => {
    const x = (abstractPos.x / ABSTRACT_WIDTH) * size.width;
    const y = ((ABSTRACT_HEIGHT - abstractPos.y) / ABSTRACT_HEIGHT) * size.height;
    return { x, y };
  };

  if (size.width === 0 || size.height === 0) {
    return (
      <div ref={containerRef} className="pitch-container">
        <div style={{
          width: '100%',
          paddingBottom: '66.67%',
          background: COLORS.pitch.main,
          position: 'relative',
          borderRadius: '12px',
          border: `3px solid ${COLORS.pitch.border}`,
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            ⚽ Saha yükleniyor...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="pitch-container">
      <Stage width={size.width} height={size.height}>
        <Layer listening={true}>
          {/* Modern pitch background */}
          <Rect width={size.width} height={size.height} fill={COLORS.pitch.main} />
          
          {/* Pitch markings with modern style */}
          <Line
            points={[size.width / 2, 0, size.width / 2, size.height]}
            stroke={COLORS.pitch.lines}
            strokeWidth={2.5}
            opacity={0.75}
          />
          
          <Line
            points={[0, 2, size.width, 2]}
            stroke={COLORS.pitch.lines}
            strokeWidth={2.5}
            opacity={0.75}
          />
          <Line
            points={[0, size.height - 2, size.width, size.height - 2]}
            stroke={COLORS.pitch.lines}
            strokeWidth={2.5}
            opacity={0.75}
          />
          
          {/* Center circle */}
          <Circle
            x={size.width / 2}
            y={size.height / 2}
            radius={size.width * 0.08}
            stroke={COLORS.pitch.lines}
            strokeWidth={2.5}
            opacity={0.75}
          />
          
          {/* Center spot */}
          <Circle
            x={size.width / 2}
            y={size.height / 2}
            radius={3}
            fill={COLORS.pitch.lines}
            opacity={0.75}
          />
          
          {/* Left penalty area (Home) */}
          <Rect
            x={0}
            y={size.height * 0.225}
            width={size.width * 0.15}
            height={size.height * 0.55}
            stroke={COLORS.pitch.lines}
            strokeWidth={2.5}
            opacity={0.75}
          />
          
          {/* Right penalty area (Away) */}
          <Rect
            x={size.width * 0.85}
            y={size.height * 0.225}
            width={size.width * 0.15}
            height={size.height * 0.55}
            stroke={COLORS.pitch.lines}
            strokeWidth={2.5}
            opacity={0.75}
          />
          
          {/* Pass arrows with carry detection */}
          {passArrows.map((arrow, idx) => {
            const fromPixel = convertToPixels(arrow.from);
            const toPixel = convertToPixels(arrow.to);
            
            return (
              <PassArrow
                key={`pass-${idx}`}
                from={fromPixel}
                to={toPixel}
                isCarry={arrow.isCarry || false}
              />
            );
          })}
          
          {/* Freeze frame mode - smaller, cleaner markers */}
          {hasFreezeFramePositions ? (
            Object.entries(animatedPositions).map(([key, pos]) => {
              if (!key.startsWith('freeze_')) return null;
              
              const pixelX = (pos.x / ABSTRACT_WIDTH) * size.width;
              const pixelY = ((ABSTRACT_HEIGHT - pos.y) / ABSTRACT_HEIGHT) * size.height;
              
              const teamColor = pos.teammate ? COLORS.home : COLORS.away;
              const borderColor = pos.actor ? COLORS.accent : 'white';
              const borderWidth = pos.actor ? 3 : 2;
              
              return (
                <React.Fragment key={key}>
                  <Circle
                    x={pixelX}
                    y={pixelY}
                    radius={pos.keeper ? 10 : 8}
                    fill={teamColor.primary}
                    stroke={borderColor}
                    strokeWidth={borderWidth}
                    shadowBlur={6}
                    shadowColor={teamColor.secondary}
                    shadowOpacity={0.5}
                    listening={false}
                    perfectDrawEnabled={false}
                    shadowForStrokeEnabled={false}
                  />
                  {pos.keeper && (
                    <Text
                      text="GK"
                      x={pixelX - 8}
                      y={pixelY - 5}
                      fontSize={8}
                      fill="white"
                      fontStyle="bold"
                      listening={false}
                      perfectDrawEnabled={false}
                    />
                  )}
                </React.Fragment>
              );
            })
          ) : (
            /* Normal lineup mode */
            <>
              {homePlayers.map(player => (
                <PlayerMarker
                  key={`home_${player.player_id}`}
                  player={player}
                  teamType="home"
                  onPlayerClick={onPlayerClick}
                  pitchWidth={size.width}
                  pitchHeight={size.height}
                  formationName={homeFormation}
                  isActive={activePlayer === player.player_id}
                  animatedPosition={animatedPositions[player.player_id]}
                />
              ))}
              
              {awayPlayers.map(player => (
                <PlayerMarker
                  key={`away_${player.player_id}`}
                  player={player}
                  teamType="away"
                  onPlayerClick={onPlayerClick}
                  pitchWidth={size.width}
                  pitchHeight={size.height}
                  formationName={awayFormation}
                  isActive={activePlayer === player.player_id}
                  animatedPosition={animatedPositions[player.player_id]}
                />
              ))}
            </>
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default FormationPitch;