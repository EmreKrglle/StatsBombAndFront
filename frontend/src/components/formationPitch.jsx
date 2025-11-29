// FormationPitch.jsx - Pass animasyonu destekli versiyon
import React, { useState, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Text, Line, Arrow } from 'react-konva';
import { getPositionCoordinates } from '../utils/formationMap';

const ABSTRACT_WIDTH = 120;
const ABSTRACT_HEIGHT = 80;

const PlayerMarker = ({ 
  player, 
  teamType, 
  onPlayerClick, 
  pitchWidth, 
  pitchHeight, 
  formationName, 
  isActive,
  animatedPosition // Animasyon için dışarıdan gelen pozisyon
}) => {
  const posName = player.positions[0]?.position;
  let abstractPos = getPositionCoordinates(formationName, posName);
  
  const initialX = teamType === 'home'
    ? (abstractPos.x / ABSTRACT_WIDTH) * pitchWidth
    : ((ABSTRACT_WIDTH - abstractPos.x) / ABSTRACT_WIDTH) * pitchWidth;

  const initialY = ((ABSTRACT_HEIGHT - abstractPos.y) / ABSTRACT_HEIGHT) * pitchHeight;
  
  const [pixel, setpixel] = useState({ pixelX: initialX, pixelY: initialY });
  const nodeRef = React.useRef();

  // Animasyonlu pozisyon güncellemesi
  useEffect(() => {
    if (animatedPosition) {
      const newX = teamType === 'home'
        ? (animatedPosition.x / ABSTRACT_WIDTH) * pitchWidth
        : ((ABSTRACT_WIDTH - animatedPosition.x) / ABSTRACT_WIDTH) * pitchWidth;
      
      const newY = ((ABSTRACT_HEIGHT - animatedPosition.y) / ABSTRACT_HEIGHT) * pitchHeight;
      
      setpixel({ pixelX: newX, pixelY: newY });
    }
  }, [animatedPosition, pitchWidth, pitchHeight, teamType]);

  const handleDragEnd = (e) => {
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

  return (
    <React.Fragment>
      <Circle
        ref={nodeRef}
        x={pixel.pixelX}
        y={pixel.pixelY}
        radius={isActive ? 22 : 20}
        fill={teamType === 'home' ? "#e74c3c" : '#3498db'}
        stroke={isActive ? '#05d26fda' : 'white'}
        strokeWidth={isActive ? 3 : 2}
        shadowBlur={isActive ? 8 : 5}
        onClick={() => onPlayerClick(player.player_id, player.player_name)}
        onTap={() => onPlayerClick(player.player_id, player.player_name)}
        draggable={true}
        onDragMove={handleDragEnd}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
      />
      
      <Text
        text={player.jersey_number.toString()}
        x={pixel.pixelX - 6}
        y={pixel.pixelY - 7}
        fontSize={12}
        fill="white"
        fontStyle="bold"
        listening={false}
        perfectDrawEnabled={false}
      />
      
      <Text
        text={getShortName(player.player_name)}
        x={pixel.pixelX}
        y={pixel.pixelY - 32}
        fontSize={11}
        fill="white"
        fontStyle="bold"
        align="center"
        offsetX={getShortName(player.player_name).length * 3}
        listening={false}
        perfectDrawEnabled={false}
        shadowColor="black"
        shadowBlur={3}
        shadowOpacity={0.7}
        shadowOffsetX={1}
        shadowOffsetY={1}
      />
    </React.Fragment>
  );
};

// Pass ok çizgisi componenti
const PassArrow = ({ from, to, color = '#f1c40f', opacity = 0.8 }) => {
  return (
    <Arrow
      points={[from.x, from.y, to.x, to.y]}
      stroke={color}
      strokeWidth={3}
      fill={color}
      pointerLength={10}
      pointerWidth={10}
      opacity={opacity}
      shadowColor="black"
      shadowBlur={5}
      shadowOpacity={0.5}
      listening={false}
      perfectDrawEnabled={false}
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
  animatedPositions = {}, // { freeze_0: {x, y}, freeze_1: {x, y}, ... } veya { playerId: {x, y} }
  passArrows = [] // [{ from: {x, y}, to: {x, y} }]
}) => {
  const containerRef = React.useRef(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  // Freeze frame pozisyonları var mı kontrol et
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

// Pozisyonları pixel koordinatlarına çevir
  const convertToPixels = (abstractPos) => {
    const x = (abstractPos.x / ABSTRACT_WIDTH) * size.width;
    const y = ((ABSTRACT_HEIGHT - abstractPos.y) / ABSTRACT_HEIGHT) * size.height;
    return { x, y };
  };

  const ABSTRACT_WIDTH = 120;
  const ABSTRACT_HEIGHT = 80;

  if (size.width === 0 || size.height === 0) {
    return (
      <div ref={containerRef} className="pitch-container">
        <div style={{ 
          width: '100%', 
          paddingBottom: '66.67%', 
          background: '#1a7d3e',
          position: 'relative',
          borderRadius: '8px',
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'rgba(255,255,255,0.3)',
            fontSize: '14px'
          }}>
            Saha yükleniyor...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="pitch-container">
      <Stage width={size.width} height={size.height}>
        <Layer listening={true}>
          {/* Saha zemini */}
          <Rect width={size.width} height={size.height} fill="#1a7d3e" />
          
          {/* Orta çizgi */}
          <Line 
            points={[size.width / 2, 0, size.width / 2, size.height]} 
            stroke="white" 
            strokeWidth={2} 
            opacity={0.6} 
          />
          
          {/* Üst ve alt çizgiler */}
          <Line 
            points={[0, 2, size.width, 2]} 
            stroke="white" 
            strokeWidth={2} 
            opacity={0.6} 
          />
          <Line 
            points={[0, size.height - 2, size.width, size.height - 2]} 
            stroke="white" 
            strokeWidth={2} 
            opacity={0.6} 
          />
          
          {/* Orta daire */}
          <Circle 
            x={size.width / 2} 
            y={size.height / 2} 
            radius={size.width * 0.08} 
            stroke="white" 
            strokeWidth={2} 
            opacity={0.6} 
          />
          
          {/* Sol ceza sahası (Home) */}
          <Rect 
            x={0} 
            y={size.height * 0.225} 
            width={size.width * 0.15} 
            height={size.height * 0.55} 
            stroke="white" 
            strokeWidth={2} 
            opacity={0.6} 
          />
          
          {/* Sağ ceza sahası (Away) */}
          <Rect 
            x={size.width * 0.85} 
            y={size.height * 0.225} 
            width={size.width * 0.15} 
            height={size.height * 0.55} 
            stroke="white" 
            strokeWidth={2} 
            opacity={0.6} 
          />
          
          {/* Pass okları - Oyuncuların altında */}
          {passArrows.map((arrow, idx) => {
            const fromPixel = convertToPixels(arrow.from);
            const toPixel = convertToPixels(arrow.to);
            
            return (
              <PassArrow 
                key={`pass-${idx}`}
                from={fromPixel}
                to={toPixel}
              />
            );
          })}
          
          {/* EĞER FREEZE FRAME VARSA: Sadece freeze frame pozisyonlarını göster */}
          {hasFreezeFramePositions ? (
            Object.entries(animatedPositions).map(([key, pos]) => {
              if (!key.startsWith('freeze_')) return null;
              
              const pixelX = (pos.x / ABSTRACT_WIDTH) * size.width;
              const pixelY = ((ABSTRACT_HEIGHT - pos.y) / ABSTRACT_HEIGHT) * size.height;
              
              // Takım rengini belirle
              const color = pos.teammate ? '#e74c3c' : '#3498db'; // Kırmızı: takım, Mavi: rakip
              const borderColor = pos.actor ? '#05d26fda' : 'white';
              const borderWidth = pos.actor ? 3 : 2;
              
              return (
                <React.Fragment key={key}>
                  <Circle
                    x={pixelX}
                    y={pixelY}
                    radius={pos.keeper ? 12 : 10}
                    fill={color}
                    stroke={borderColor}
                    strokeWidth={borderWidth}
                    shadowBlur={5}
                    listening={false}
                    perfectDrawEnabled={false}
                    shadowForStrokeEnabled={false}
                  />
                  {pos.keeper && (
                    <Text
                      text="GK"
                      x={pixelX - 10}
                      y={pixelY - 6}
                      fontSize={10}
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
            /* NORMAL MOD: Lineup oyuncularını göster */
            <>
              {/* Home takımı oyuncuları */}
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
              
              {/* Away takımı oyuncuları */}
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