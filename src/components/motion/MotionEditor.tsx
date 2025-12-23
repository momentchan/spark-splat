import { useMotionStore } from './useMotionStore';

// Helper functions for degree/radian conversion
const radToDeg = (rad: number): number => (rad * 180) / Math.PI;
const degToRad = (deg: number): number => (deg * Math.PI) / 180;

export const MotionEditor = () => {
  const { 
    blocks, 
    addBlock, 
    updateBlock, 
    activeBlockId, 
    setActiveBlock, 
    captureCameraToBlock, 
    removeBlock,
    moveBlockUp,
    moveBlockDown
  } = useMotionStore();

  const activeBlock = blocks.find(b => b.id === activeBlockId);

  const blockTypes = ['moveTo', 'composite', 'dolly', 'arc', 'pan', 'truck'];

  const easeOptions = [
    'none',
    'power1.inOut',
    'power2.inOut',
    'power3.inOut',
    'power1.out',
    'power2.out',
    'power3.out',
    'power1.in',
    'power2.in',
    'power3.in',
    'expo.inOut',
    'expo.out',
    'expo.in',
    'elastic.out',
    'elastic.inOut',
    'bounce.out',
    'bounce.inOut',
    'back.out',
    'back.inOut',
    'sine.inOut',
    'sine.out',
    'sine.in'
  ];

  return (
    <div style={{ 
      position: 'fixed', 
      top: 20, 
      right: 20, 
      width: 320, 
      background: '#1a1a1a', 
      color: '#fff', 
      padding: 20, 
      borderRadius: 8, 
      maxHeight: '90vh', 
      overflowY: 'auto',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      zIndex: 10001, // Higher than Leva (which is usually 10000)
      pointerEvents: 'auto' // Ensure it can receive mouse events
    }}>
      <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: '18px' }}>
        Motion Sequence Editor
      </h3>
      
      {/* Block List */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: 8 }}>
          Blocks ({blocks.length})
        </div>
        {blocks.length === 0 ? (
          <div style={{ color: '#888', fontSize: '12px', fontStyle: 'italic' }}>
            No blocks yet. Add one below.
          </div>
        ) : (
          blocks.map((block, index) => (
            <div 
              key={block.id} 
              onClick={() => setActiveBlock(block.id)}
              style={{ 
                padding: 10, 
                background: activeBlockId === block.id ? '#2a2a2a' : '#222',
                marginBottom: 5,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: 4,
                border: activeBlockId === block.id ? '1px solid #4a9eff' : '1px solid transparent'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{index + 1}. {block.id.split('-')[0]}</span>
                  {block.startState && (
                    <span 
                      style={{ 
                        fontSize: '10px', 
                        background: '#27ae60', 
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: 3,
                        fontWeight: 'normal'
                      }}
                      title="Has start state"
                    >
                      📍
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: 2 }}>
                  {block.duration ?? 2}s • {block.ease ?? 'power2.inOut'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {/* Move Up Button */}
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    moveBlockUp(block.id);
                  }}
                  disabled={index === 0}
                  style={{ 
                    background: index === 0 ? '#444' : '#2a2a2a',
                    color: 'white',
                    border: '1px solid #444',
                    borderRadius: 4,
                    padding: '4px 8px',
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    opacity: index === 0 ? 0.5 : 1
                  }}
                  title="Move up"
                >
                  ↑
                </button>
                {/* Move Down Button */}
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    moveBlockDown(block.id);
                  }}
                  disabled={index === blocks.length - 1}
                  style={{ 
                    background: index === blocks.length - 1 ? '#444' : '#2a2a2a',
                    color: 'white',
                    border: '1px solid #444',
                    borderRadius: 4,
                    padding: '4px 8px',
                    cursor: index === blocks.length - 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    opacity: index === blocks.length - 1 ? 0.5 : 1
                  }}
                  title="Move down"
                >
                  ↓
                </button>
                {/* Delete Button */}
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    removeBlock(block.id); 
                  }}
                  style={{ 
                    background: '#d32f2f',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Block Buttons */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: 8 }}>
          Add Block
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {blockTypes.map(type => (
            <button 
              key={type} 
              onClick={() => addBlock(type)}
              style={{
                background: '#2a2a2a',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: 4,
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#333';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2a2a2a';
              }}
            >
              + {type}
            </button>
          ))}
        </div>
      </div>

      <hr style={{ borderColor: '#444', margin: '20px 0' }}/>

      {/* Detail Editor (Inspector) */}
      {activeBlock ? (
        <div>
          <h4 style={{ marginTop: 0, marginBottom: 15, fontSize: '16px' }}>
            Editing: {activeBlock.id.split('-')[0]}
          </h4>
          
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', marginBottom: 5, fontSize: '12px', color: '#aaa' }}>
              Duration (seconds)
            </label>
            <input 
              type="number" 
              step="0.1"
              min="0.1"
              value={activeBlock.duration ?? 2} 
              onChange={e => updateBlock(activeBlock.id, { duration: parseFloat(e.target.value) })}
              style={{ 
                width: '100%', 
                padding: '6px',
                background: '#222',
                border: '1px solid #444',
                borderRadius: 4,
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', marginBottom: 5, fontSize: '12px', color: '#aaa' }}>
              Easing
            </label>
            <select 
              value={activeBlock.ease ?? 'power2.inOut'}
              onChange={e => updateBlock(activeBlock.id, { ease: e.target.value })}
              style={{ 
                width: '100%', 
                padding: '6px',
                background: '#222',
                border: '1px solid #444',
                borderRadius: 4,
                color: '#fff',
                fontSize: '14px'
              }}
            >
              {easeOptions.map(ease => (
                <option key={ease} value={ease}>{ease}</option>
              ))}
            </select>
          </div>

          {/* Special UI for MoveTo Block */}
          {activeBlock.id.startsWith('moveTo') && (
            <div style={{ background: '#222', padding: 15, borderRadius: 5, marginTop: 15 }}>
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: 0, marginBottom: 10 }}>
                Absolute Positioning
              </p>
              
              <button 
                onClick={() => captureCameraToBlock('cameraPosition')}
                style={{ 
                  width: '100%', 
                  background: '#d35400', 
                  color: 'white', 
                  marginBottom: 8,
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold'
                }}
              >
                📸 Capture Camera Position
              </button>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: 15 }}>
                {activeBlock.cameraPosition 
                  ? `[${activeBlock.cameraPosition.map(n => n.toFixed(2)).join(', ')}]`
                  : 'Not Set'}
              </div>

              <button 
                onClick={() => captureCameraToBlock('targetPosition')}
                style={{ 
                  width: '100%', 
                  background: '#2980b9', 
                  color: 'white', 
                  marginBottom: 8,
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold'
                }}
              >
                🎯 Capture Target (LookAt)
              </button>
              <div style={{ fontSize: '11px', color: '#888' }}>
                {activeBlock.targetPosition 
                  ? `[${activeBlock.targetPosition.map(n => n.toFixed(2)).join(', ')}]`
                  : 'Not Set'}
              </div>
            </div>
          )}

          {/* Special UI for Composite Block */}
          {activeBlock.id.startsWith('composite') && (
            <div style={{ background: '#222', padding: 15, borderRadius: 5, marginTop: 15 }}>
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: 0, marginBottom: 10 }}>
                Composite Motion Parameters
              </p>
              
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', marginBottom: 5, fontSize: '11px', color: '#aaa' }}>
                  Dolly Amount
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  value={activeBlock.dolly ?? 0}
                  onChange={e => updateBlock(activeBlock.id, { dolly: parseFloat(e.target.value) })}
                  style={{ 
                    width: '100%', 
                    padding: '6px',
                    background: '#1a1a1a',
                    border: '1px solid #444',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', marginBottom: 5, fontSize: '11px', color: '#aaa' }}>
                  Rotate Azimuth (degrees)
                </label>
                <input 
                  type="number" 
                  step="1"
                  value={activeBlock.rotate?.azimuth !== undefined ? radToDeg(activeBlock.rotate.azimuth) : 0}
                  onChange={e => updateBlock(activeBlock.id, { 
                    rotate: { ...activeBlock.rotate, azimuth: degToRad(parseFloat(e.target.value) || 0) } 
                  })}
                  style={{ 
                    width: '100%', 
                    padding: '6px',
                    background: '#1a1a1a',
                    border: '1px solid #444',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', marginBottom: 5, fontSize: '11px', color: '#aaa' }}>
                  Rotate Polar (degrees)
                </label>
                <input 
                  type="number" 
                  step="1"
                  value={activeBlock.rotate?.polar !== undefined ? radToDeg(activeBlock.rotate.polar) : 0}
                  onChange={e => updateBlock(activeBlock.id, { 
                    rotate: { ...activeBlock.rotate, polar: degToRad(parseFloat(e.target.value) || 0) } 
                  })}
                  style={{ 
                    width: '100%', 
                    padding: '6px',
                    background: '#1a1a1a',
                    border: '1px solid #444',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: '11px', color: '#aaa' }}>
                    Truck X
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={activeBlock.truck?.x ?? 0}
                    onChange={e => updateBlock(activeBlock.id, { 
                      truck: { ...activeBlock.truck, x: parseFloat(e.target.value) } 
                    })}
                    style={{ 
                      width: '100%', 
                      padding: '6px',
                      background: '#1a1a1a',
                      border: '1px solid #444',
                      borderRadius: 4,
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: '11px', color: '#aaa' }}>
                    Truck Y
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={activeBlock.truck?.y ?? 0}
                    onChange={e => updateBlock(activeBlock.id, { 
                      truck: { ...activeBlock.truck, y: parseFloat(e.target.value) } 
                    })}
                    style={{ 
                      width: '100%', 
                      padding: '6px',
                      background: '#1a1a1a',
                      border: '1px solid #444',
                      borderRadius: 4,
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Special UI for other block types */}
          {activeBlock.id.startsWith('dolly') && (
            <div style={{ marginTop: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontSize: '12px', color: '#aaa' }}>
                Distance Delta
              </label>
              <input 
                type="number" 
                step="0.1"
                value={activeBlock.distanceDelta ?? 0}
                onChange={e => updateBlock(activeBlock.id, { distanceDelta: parseFloat(e.target.value) })}
                style={{ 
                  width: '100%', 
                  padding: '6px',
                  background: '#222',
                  border: '1px solid #444',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
            </div>
          )}

          {activeBlock.id.startsWith('arc') && (
            <div style={{ marginTop: 15 }}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', marginBottom: 5, fontSize: '12px', color: '#aaa' }}>
                  Arc Angle (degrees)
                </label>
                <input 
                  type="number" 
                  step="1"
                  value={activeBlock.arcAngle !== undefined ? radToDeg(activeBlock.arcAngle) : 0}
                  onChange={e => updateBlock(activeBlock.id, { arcAngle: degToRad(parseFloat(e.target.value) || 0) })}
                  style={{ 
                    width: '100%', 
                    padding: '6px',
                    background: '#222',
                    border: '1px solid #444',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: '12px', color: '#aaa' }}>
                  Distance Delta
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  value={activeBlock.distanceDelta ?? 0}
                  onChange={e => updateBlock(activeBlock.id, { distanceDelta: parseFloat(e.target.value) })}
                  style={{ 
                    width: '100%', 
                    padding: '6px',
                    background: '#222',
                    border: '1px solid #444',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          )}

          {/* Start State Section */}
          <div style={{ marginTop: 15 }}>
            <div style={{ 
              background: activeBlock.startState ? '#1a3a1a' : '#222', 
              padding: 15, 
              borderRadius: 5,
              border: activeBlock.startState ? '1px solid #27ae60' : '1px solid #444'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ fontSize: '12px', color: '#aaa', margin: 0, fontWeight: 'bold' }}>
                  Start State {activeBlock.startState ? '(Set)' : '(Not Set)'}
                </p>
                {activeBlock.startState && (
                  <button
                    onClick={() => updateBlock(activeBlock.id, { startState: undefined })}
                    style={{
                      background: '#d32f2f',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {activeBlock.startState ? (
                <div style={{ fontSize: '11px', color: '#aaa', lineHeight: '1.6' }}>
                  <div>Azimuth: {radToDeg(activeBlock.startState.azimuth ?? 0).toFixed(1)}°</div>
                  <div>Polar: {radToDeg(activeBlock.startState.polar ?? 0).toFixed(1)}°</div>
                  <div>Distance: {(activeBlock.startState.distance ?? 0).toFixed(2)}</div>
                  {activeBlock.startState.center && (
                    <div>Center: [{activeBlock.startState.center.map(n => n.toFixed(2)).join(', ')}]</div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>
                  No start state set. Animation will start from current camera position.
                </div>
              )}

              <button 
                onClick={() => captureCameraToBlock('startState')}
                style={{ 
                  width: '100%', 
                  background: activeBlock.startState ? '#2980b9' : '#27ae60', 
                  color: 'white', 
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  marginTop: 10
                }}
              >
                {activeBlock.startState ? '🔄 Update Start State' : '📍 Capture Start State'}
              </button>
              <div style={{ fontSize: '11px', color: '#888', marginTop: 5 }}>
                {activeBlock.startState 
                  ? 'Updates the initial camera position before animation'
                  : 'Sets initial camera position before animation'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ color: '#888', fontSize: '12px', fontStyle: 'italic' }}>
          Select a block to edit
        </p>
      )}
    </div>
  );
};

