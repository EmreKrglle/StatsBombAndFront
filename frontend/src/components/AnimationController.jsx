// PassAnimationController.jsx - Build-up sekanslarını görselleştirme
import React, { useState, useEffect, useRef } from 'react';

const AnimationController = ({ 
  sequences, // API'den gelen sekanslar
  onPositionUpdate, // Oyuncu pozisyonlarını güncelleme callback'i
  onPassDraw // Pass çizgisi çizme callback'i
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);
  const [currentPassIndex, setCurrentPassIndex] = useState(0);
  const [speed, setSpeed] = useState(1); // 0.5x, 1x, 2x gibi hızlar
  
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);

  // Mevcut sekans ve pass
  const currentSequence = sequences?.[currentSequenceIndex];
  const currentPass = currentSequence?.passes?.[currentPassIndex];

  // Animasyonu başlat/durdur
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Bir sonraki pass'a geç
  const nextPass = () => {
    if (!currentSequence) return;

    if (currentPassIndex < currentSequence.passes.length - 1) {
      setCurrentPassIndex(currentPassIndex + 1);
    } else if (currentSequenceIndex < sequences.length - 1) {
      // Sonraki sekansa geç
      setCurrentSequenceIndex(currentSequenceIndex + 1);
      setCurrentPassIndex(0);
    } else {
      // En başa dön
      setCurrentSequenceIndex(0);
      setCurrentPassIndex(0);
    }
  };

  // Bir önceki pass'a geç
  const prevPass = () => {
    if (currentPassIndex > 0) {
      setCurrentPassIndex(currentPassIndex - 1);
    } else if (currentSequenceIndex > 0) {
      // Önceki sekansa geç
      setCurrentSequenceIndex(currentSequenceIndex - 1);
      const prevSeq = sequences[currentSequenceIndex - 1];
      setCurrentPassIndex(prevSeq.passes.length - 1);
    }
  };

  // Başa sar
  const reset = () => {
    setCurrentSequenceIndex(0);
    setCurrentPassIndex(0);
    setIsPlaying(false);
  };

  // Ana animasyon döngüsü
  useEffect(() => {
    if (!isPlaying || !currentPass) return;

    const animate = (timestamp) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      
      // Speed ayarına göre bekleme süresi (1000ms / speed)
      const waitTime = 1000 / speed;

      if (deltaTime >= waitTime) {
        // Oyuncu pozisyonlarını güncelle
        onPositionUpdate({
          playerId: currentPass.from_player_id,
          position: currentPass.from_position
        });
        
        onPositionUpdate({
          playerId: currentPass.to_player_id,
          position: currentPass.to_position
        });

        // Pass çizgisini çiz
        onPassDraw({
          from: currentPass.from_position,
          to: currentPass.to_position,
          fromPlayerId: currentPass.from_player_id,
          toPlayerId: currentPass.to_player_id
        });

        // Bir sonraki pass'a geç
        nextPass();
        lastTimeRef.current = timestamp;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentPass, speed]);

  // UI temizleme (component unmount)
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.infoBar}>
        <span style={styles.infoText}>
          Sekans: {currentSequenceIndex + 1} / {sequences?.length || 0}
        </span>
        <span style={styles.infoText}>
          Pass: {currentPassIndex + 1} / {currentSequence?.passes?.length || 0}
        </span>
      </div>

      <div style={styles.controls}>
        {/* Geri */}
        <button 
          onClick={prevPass} 
          style={styles.button}
          disabled={currentSequenceIndex === 0 && currentPassIndex === 0}
        >
          ⏮ Önceki
        </button>

        {/* Play/Pause */}
        <button 
          onClick={togglePlayPause} 
          style={{...styles.button, ...styles.playButton}}
        >
          {isPlaying ? '⏸ Duraklat' : '▶ Oynat'}
        </button>

        {/* İleri */}
        <button 
          onClick={nextPass} 
          style={styles.button}
          disabled={
            currentSequenceIndex === sequences?.length - 1 && 
            currentPassIndex === currentSequence?.passes?.length - 1
          }
        >
          İleri ⏭
        </button>

        {/* Reset */}
        <button 
          onClick={reset} 
          style={{...styles.button, ...styles.resetButton}}
        >
          🔄 Başa Sar
        </button>
      </div>

      {/* Hız kontrolü */}
      <div style={styles.speedControl}>
        <span style={styles.label}>Hız:</span>
        {[0.5, 1, 1.5, 2].map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            style={{
              ...styles.speedButton,
              ...(speed === s ? styles.speedButtonActive : {})
            }}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div style={styles.progressBar}>
        <div 
          style={{
            ...styles.progressFill,
            width: `${((currentPassIndex + 1) / (currentSequence?.passes?.length || 1)) * 100}%`
          }}
        />
      </div>
    </div>
  );
};

// Basit stiller
const styles = {
  container: {
    background: 'rgba(0, 0, 0, 0.8)',
    borderRadius: '12px',
    padding: '20px',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
    maxWidth: '600px',
    margin: '0 auto',
  },
  infoBar: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '15px',
    fontSize: '14px',
    opacity: 0.8,
  },
  infoText: {
    padding: '5px 10px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
  },
  controls: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    marginBottom: '15px',
  },
  button: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s',
    fontWeight: '500',
  },
  playButton: {
    background: '#3498db',
    fontWeight: 'bold',
  },
  resetButton: {
    background: 'rgba(231, 76, 60, 0.8)',
  },
  speedControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '15px',
    justifyContent: 'center',
  },
  label: {
    fontSize: '14px',
    opacity: 0.8,
  },
  speedButton: {
    padding: '5px 12px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '6px',
    background: 'transparent',
    color: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.3s',
  },
  speedButtonActive: {
    background: '#2ecc71',
    borderColor: '#2ecc71',
    fontWeight: 'bold',
  },
  progressBar: {
    width: '100%',
    height: '6px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #3498db, #2ecc71)',
    transition: 'width 0.3s ease',
  },
};

export default AnimationController;