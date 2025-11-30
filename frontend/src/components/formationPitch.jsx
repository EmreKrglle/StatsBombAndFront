// FormationPitch.jsx - Smooth animations with improved design
import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Circle, Text, Line, Arrow } from 'react-konva';
import { getPositionCoordinates } from '../utils/formationMap';
import Konva from 'konva';

const ABSTRACT_WIDTH = 120;
const ABSTRACT_HEIGHT = 80;

// Smooth transition ile oyuncu componenti
const AnimatedPlayer = ({ targetX, targetY, color, isActor, isKeeper, label, jerseyNumber }) => {
  const circleRef = useRef();
  const textRef = useRef();
  const numberRef = useRef();
  
  // İlk pozisyonu kaydet
  const [isFirstRender, setIsFirstRender] = useState(true);

  useEffect(() => {
    if (!circleRef.current) return;

    // İlk render'da direkt konumla
    if (isFirstRender) {
      circleRef.current.x(targetX);
      circleRef.current.y(targetY);
      if (textRef.current) {
        textRef.current.x(targetX - 10);
        textRef.current.y(targetY - 6);
      }
      if (numberRef.current) {
        numberRef.current.x(targetX - 6);
        numberRef.current.y(targetY - 7);
      }
      setIsFirstRender(false);
      return;
    }

    // Sonraki render'larda smooth transition
    const tween = new Konva.Tween({
      node: circleRef.current,
      duration: 0.8,
      x: targetX,
      y: targetY,
      easing: Konva.Easings.EaseInOut,
    });
    tween.play();

    // GK text animasyonu
    if (textRef.current && isKeeper) {
      new Konva.Tween({
        node: textRef.current,
        duration: 0.8,
        x: targetX - 10,
        y: targetY - 6,
        easing: Konva.Easings.EaseInOut,
      }).play();
    }

    // Jersey number animasyonu
    if (numberRef.current && !isKeeper) {
      new Konva.Tween({
        node: numberRef.current,
        duration: 0.8,
        x: targetX - 6,
        y: targetY - 7,
        easing: Konva.Easings.EaseInOut,
      }).play();
    }

    return () => tween.destroy();
  }, [targetX, targetY]);

  return (
    <>
      <Circle
        ref={circleRef}
        x={0}
        y={0}
        radius={isKeeper ? 24 : (isActor ? 22 : 20)}
        fill={color}
        stroke={isActor ? '#ABD0C6' : 'white'}
        strokeWidth={isActor ? 3 : 2}
        shadowBlur={isActor ? 10 : 5}
        shadowColor={isActor ? '#ABD0C6' : 'black'}
        listening={false}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
      />
      {isKeeper && (
        <Text
          ref={textRef}
          text="GK"
          x={0}
          y={0}
          fontSize={10}
          fill="white"
          fontStyle="bold"
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
      {!isKeeper && jerseyNumber && (
        <Text
          ref={numberRef}
          text={jerseyNumber.toString()}
          x={0}
          y={0}
          fontSize={12}
          fill="white"
          fontStyle="bold"
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
      {isActor && (
        <Circle
          x={targetX}
          y={targetY}
          radius={30}
          stroke="#ABD0C6"
          strokeWidth={2}
          opacity={0.5}
          listening={false}
          perfectDrawEnabled={false}
          dash={[5, 5]}
        />
      )}
    </>
  );
};

// Geliştirilmiş pass oku
const PassArrow = ({ from, to }) => {
  return (
    <Arrow
      points={[from.x, from.y, to.x, to.y]}
      stroke="#ABD0C6"
      strokeWidth={3}
      fill="#ABD0C6"
      pointerLength={10}
      pointerWidth={10}
      opacity={0.8}
      shadowColor="black"
      shadowBlur={5}
      shadowOpacity={0.5}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
};

// Carry (taşıma) animasyonu için trail effect
const CarryTrail = ({ path }) => {
  if (!path || path.length < 2) return null;
  
  return (
    <Line
      points={path.flatMap(p => [p.x, p.y])}
      stroke="#ABD0C6"
      strokeWidth={2}
      opacity={0.4}
      dash={[5, 5]}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
};

// Normal oyuncu marker (freeze frame olmadığında)
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
  const nodeRef = useRef();

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
    return `${parts[0].charAt(0)}. ${parts[parts.length - 1]}`;
  };

  return (
    <React.Fragment>
      <Circle
        ref={nodeRef}
        x={pixel.pixelX}
        y={pixel.pixelY}
        radius={isActive ? 22 : 20}
        fill={teamType === 'home' ? "#e74c3c" : '#3498db'}
        stroke={isActive ? '#ABD0C6' : 'white'}
        strokeWidth={isActive ? 3 : 2}
        shadowBlur={isActive ? 8 : 5}
        onClick={() => onPlayerClick(player.player_id, player.player_name)}
        onTap={() => onPlayerClick(player.player_id, player.player_name)}
        draggable={true}
        onDragEnd={handleDragEnd}
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

// Ana component
const FormationPitch = ({ 
  homePlayers, 
  awayPlayers, 
  homeFormation, 
  awayFormation, 
  onPlayerClick, 
  activePlayer,
  animatedPositions = {},
  passArrows = [],
  carryPaths = [] // Yeni: carry trail'leri için
}) => {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Freeze frame pozisyonları var mı kontrol et
  const hasFreezeFramePositions = Object.keys(animatedPositions).some(key => key.startsWith('freeze_'));

  useEffect(() => {
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

  if (size.width === 0 || size.height === 0) {
    return (
      <div ref={containerRef} className="pitch-container">
        <div style={{ 
          width: '100%', 
          paddingBottom: '66.67%', 
          background: '#302F2B',
          position: 'relative',
          borderRadius: '8px',
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#ABD0C6',
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
          <Rect width={size.width} height={size.height} fill="#302F2B" />
          
          {/* Orta çizgi */}
          <Line 
            points={[size.width / 2, 0, size.width / 2, size.height]} 
            stroke="#ABD0C6" 
            strokeWidth={2} 
            opacity={0.6} 
          />
          
          {/* Üst ve alt çizgiler */}
          <Line 
            points={[0, 2, size.width, 2]} 
            stroke="#ABD0C6" 
            strokeWidth={2} 
            opacity={0.6} 
          />
          <Line 
            points={[0, size.height - 2, size.width, size.height - 2]} 
            stroke="#ABD0C6" 
            strokeWidth={2} 
            opacity={0.6} 
          />
          
          {/* Orta daire */}
          <Circle 
            x={size.width / 2} 
            y={size.height / 2} 
            radius={size.width * 0.08} 
            stroke="#ABD0C6" 
            strokeWidth={2} 
            opacity={0.6} 
          />
          
          {/* Sol ceza sahası (Home) */}
          <Rect 
            x={0} 
            y={size.height * 0.225} 
            width={size.width * 0.15} 
            height={size.height * 0.55} 
            stroke="#ABD0C6" 
            strokeWidth={2} 
            opacity={0.6} 
          />
          
          {/* Sağ ceza sahası (Away) */}
          <Rect 
            x={size.width * 0.85} 
            y={size.height * 0.225} 
            width={size.width * 0.15} 
            height={size.height * 0.55} 
            stroke="#ABD0C6" 
            strokeWidth={2} 
            opacity={0.6} 
          />
          
          {/* Carry trail'leri */}
          {carryPaths.map((path, idx) => (
            <CarryTrail key={`carry-${idx}`} path={path.map(convertToPixels)} />
          ))}
          
          {/* Pass okları */}
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
              const color = pos.teammate ? '#e74c3c' : '#3498db';
              
              return (
                <AnimatedPlayer
                  key={key}
                  targetX={pixelX}
                  targetY={pixelY}
                  color={color}
                  isActor={pos.actor}
                  isKeeper={pos.keeper}
                  jerseyNumber={null}
                />
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