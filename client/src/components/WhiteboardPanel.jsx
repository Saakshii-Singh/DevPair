import React, { useEffect, useRef, useState } from 'react';
import { Palette, Trash2, Square } from 'lucide-react';

const COLORS = [
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Crimson', value: '#ef4444' },
  { name: 'White', value: '#ffffff' }
];

const SIZES = [
  { name: 'S', value: 3 },
  { name: 'M', value: 6 },
  { name: 'L', value: 12 },
  { name: 'XL', value: 24 }
];

function WhiteboardPanel({ socket, roomId }) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#8b5cf6');
  const [brushSize, setBrushSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  
  // Keep local copy of history for redrawing on resize
  const historyRef = useRef([]);

  // Resize handler
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get visual size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Re-setup context settings (lost on resize)
    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;

    // Redraw history
    redrawHistory();
  };

  const redrawHistory = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const W = canvas.width;
    const H = canvas.height;

    historyRef.current.forEach((line) => {
      ctx.beginPath();
      
      // Select composite operation
      if (line.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
      
      ctx.strokeStyle = line.color;
      ctx.lineWidth = (line.size / 1000) * W; // Scale thickness visually

      const startX = (line.start.x / 1000) * W;
      const startY = (line.start.y / 1000) * H;
      const endX = (line.end.x / 1000) * W;
      const endY = (line.end.y / 1000) * H;

      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    });

    // Reset composite operation to default
    ctx.globalCompositeOperation = 'source-over';
  };

  useEffect(() => {
    // 1. Initial setup
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 2. Request current whiteboard state from server
    if (socket && roomId) {
      socket.emit('request-draw-history', { roomId });

      socket.on('draw-history-sync', ({ drawHistory }) => {
        historyRef.current = drawHistory;
        redrawHistory();
      });

      socket.on('draw-line', ({ line }) => {
        historyRef.current.push(line);
        
        // Draw the single line segment in real-time
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (canvas && ctx) {
          const W = canvas.width;
          const H = canvas.height;

          ctx.beginPath();
          if (line.isEraser) {
            ctx.globalCompositeOperation = 'destination-out';
          } else {
            ctx.globalCompositeOperation = 'source-over';
          }

          ctx.strokeStyle = line.color;
          ctx.lineWidth = (line.size / 1000) * W;

          ctx.moveTo((line.start.x / 1000) * W, (line.start.y / 1000) * H);
          ctx.lineTo((line.end.x / 1000) * W, (line.end.y / 1000) * H);
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over'; // reset
        }
      });

      socket.on('draw-clear', () => {
        historyRef.current = [];
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (socket) {
        socket.off('draw-history-sync');
        socket.off('draw-line');
        socket.off('draw-clear');
      }
    };
  }, [socket, roomId]);

  // Coordinates scaled to 1000 x 800 internal grid
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Support mouse or touch events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * 1000;
    const y = ((clientY - rect.top) / rect.height) * 800;

    return { x, y };
  };

  const lastCoords = useRef({ x: 0, y: 0 });

  const startDrawing = (e) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    lastCoords.current = coords;
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const currentCoords = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = contextRef.current;

    if (canvas && ctx) {
      const line = {
        start: lastCoords.current,
        end: currentCoords,
        color: isEraser ? '#000000' : brushColor,
        size: brushSize,
        isEraser
      };

      // Draw locally
      historyRef.current.push(line);
      
      const W = canvas.width;
      const H = canvas.height;

      ctx.beginPath();
      if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.strokeStyle = line.color;
      ctx.lineWidth = (line.size / 1000) * W;

      ctx.moveTo((line.start.x / 1000) * W, (line.start.y / 1000) * H);
      ctx.lineTo((line.end.x / 1000) * W, (line.end.y / 1000) * H);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over'; // reset

      // Emit segment
      if (socket && roomId) {
        socket.emit('draw-line', { roomId, line });
      }

      lastCoords.current = currentCoords;
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (socket && roomId) {
      socket.emit('draw-clear', { roomId });
    }
    historyRef.current = [];
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="whiteboard-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Toolbar */}
      <div className="whiteboard-toolbar">
        {/* Colors */}
        <div className="toolbar-group">
          <Palette size={14} style={{ color: 'var(--text-muted)' }} />
          <div className="color-palette">
            {COLORS.map((c) => (
              <button
                key={c.value}
                className={`color-btn ${brushColor === c.value && !isEraser ? 'active' : ''}`}
                style={{ backgroundColor: c.value }}
                onClick={() => {
                  setBrushColor(c.value);
                  setIsEraser(false);
                }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Eraser */}
        <div className="toolbar-group">
          <button
            className={`tool-btn ${isEraser ? 'active' : ''}`}
            onClick={() => setIsEraser(true)}
            title="Eraser"
            style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            🧹 <span>Eraser</span>
          </button>
        </div>

        {/* Brush Sizes */}
        <div className="toolbar-group">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Size:</span>
          <div className="size-selector">
            {SIZES.map((s) => (
              <button
                key={s.value}
                className={`size-btn ${brushSize === s.value ? 'active' : ''}`}
                onClick={() => setBrushSize(s.value)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <span style={{
                  width: `${Math.max(4, s.value / 2)}px`,
                  height: `${Math.max(4, s.value / 2)}px`,
                  borderRadius: '50%',
                  backgroundColor: 'currentColor'
                }} />
              </button>
            ))}
          </div>
        </div>

        {/* Clear Action */}
        <button className="tool-btn danger-btn" onClick={clearCanvas} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Trash2 size={14} />
          <span>Clear All</span>
        </button>
      </div>

      {/* Grid Canvas Area */}
      <div className="whiteboard-canvas-area" style={{ flexGrow: 1, position: 'relative', overflow: 'hidden', background: '#0e0f16' }}>
        <div className="canvas-grid-bg" />
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            cursor: isEraser ? 'cell' : 'crosshair',
            touchAction: 'none'
          }}
        />
      </div>
    </div>
  );
}

export default WhiteboardPanel;
