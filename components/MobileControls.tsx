import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, Hand } from 'lucide-react';

interface JoystickProps {
  side: 'left' | 'right';
  onMove: (x: number, y: number) => void;
}

const Joystick: React.FC<JoystickProps> = ({ side, onMove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  
  // Ref to track touch ID to avoid multi-touch conflict on same stick
  const touchIdRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleStart = (e: TouchEvent) => {
      e.preventDefault();
      // Only take the first touch that hits this container
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touchIdRef.current === null) {
          touchIdRef.current = touch.identifier;
          setActive(true);
          updatePos(touch.clientX, touch.clientY);
        }
      }
    };

    const handleMove = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          updatePos(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        }
      }
    };

    const handleEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          touchIdRef.current = null;
          setPos({ x: 0, y: 0 });
          setActive(false);
          onMove(0, 0);
        }
      }
    };

    const updatePos = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const maxDist = rect.width / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Normalize output -1 to 1
      let nx = dx;
      let ny = dy;

      if (dist > maxDist) {
        nx = (dx / dist) * maxDist;
        ny = (dy / dist) * maxDist;
      }
      
      setPos({ x: nx, y: ny });
      onMove(nx / maxDist, ny / maxDist);
    };

    container.addEventListener('touchstart', handleStart, { passive: false });
    container.addEventListener('touchmove', handleMove, { passive: false });
    container.addEventListener('touchend', handleEnd, { passive: false });
    container.addEventListener('touchcancel', handleEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleStart);
      container.removeEventListener('touchmove', handleMove);
      container.removeEventListener('touchend', handleEnd);
      container.removeEventListener('touchcancel', handleEnd);
    };
  }, [onMove]);

  return (
    <div 
      ref={containerRef}
      className={`absolute bottom-8 w-32 h-32 rounded-full border-2 border-white/20 bg-black/20 backdrop-blur-sm flex items-center justify-center ${side === 'left' ? 'left-8' : 'right-24'}`} // Right joystick moved left slightly to make room for buttons if needed, but aiming is usually right edge.
      style={{ touchAction: 'none' }}
    >
      <div 
        className={`w-12 h-12 rounded-full bg-white/50 shadow-lg transition-transform duration-75 ${active ? 'scale-110 bg-yellow-500/80' : ''}`}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      />
    </div>
  );
};

const MobileControls: React.FC = () => {
  // We only show controls if it's a touch device or always for this "mobile version" request
  // Ideally detect touch, but let's always show for the purpose of the prompt "adapt to mobile buttons"
  
  const emitMove = (x: number, y: number) => {
    window.dispatchEvent(new CustomEvent('mobile-move', { detail: { x, y } }));
  };

  const emitAim = (x: number, y: number) => {
    window.dispatchEvent(new CustomEvent('mobile-aim', { detail: { x, y } }));
  };

  const handleFire = (pressed: boolean) => {
    window.dispatchEvent(new CustomEvent('mobile-fire', { detail: { pressed } }));
  };

  const handleInteract = () => {
    window.dispatchEvent(new CustomEvent('mobile-interact'));
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {/* Container ensures pointer events work on children */}
      <div className="relative w-full h-full pointer-events-auto">
        
        {/* Left Stick - Move */}
        <Joystick side="left" onMove={emitMove} />

        {/* Right Stick - Aim */}
        <Joystick side="right" onMove={emitAim} />

        {/* Action Buttons */}
        <div className="absolute bottom-40 right-6 flex flex-col gap-4">
          
          {/* Interact Button */}
          <button
            className="w-16 h-16 bg-blue-600/80 rounded-full border-2 border-white/30 active:bg-blue-500 flex items-center justify-center text-white shadow-lg backdrop-blur-sm"
            onTouchStart={(e) => { e.preventDefault(); handleInteract(); }}
            onMouseDown={(e) => { e.preventDefault(); handleInteract(); }} // For testing on desktop
          >
            <Hand size={32} />
          </button>

          {/* Fire Button */}
          <button
            className="w-20 h-20 bg-red-600/80 rounded-full border-4 border-white/30 active:bg-red-500 flex items-center justify-center text-white shadow-lg backdrop-blur-sm"
            onTouchStart={(e) => { e.preventDefault(); handleFire(true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleFire(false); }}
            onMouseDown={(e) => { e.preventDefault(); handleFire(true); }} // Desktop test
            onMouseUp={(e) => { e.preventDefault(); handleFire(false); }}
            onMouseLeave={(e) => { e.preventDefault(); handleFire(false); }}
          >
            <Crosshair size={40} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default MobileControls;