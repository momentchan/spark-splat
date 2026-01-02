import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { useMotionStore, type ExportedFile } from './useMotionStore';

// Helper functions for degree/radian conversion
const radToDeg = (rad: number): number => (rad * 180) / Math.PI;
const degToRad = (deg: number): number => (deg * Math.PI) / 180;

// NumberInput component to handle negative number input properly
interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: number;
  onChange: (value: number) => void;
  precision?: number; // Number of decimal places to display
}

const NumberInput = ({ value, onChange, precision = 2, ...props }: NumberInputProps) => {
  const [buffer, setBuffer] = useState<string | number>(value ?? '');

  // Sync buffer when external value changes (e.g., switching blocks)
  // Format to specified precision for display
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setBuffer(Number(value.toFixed(precision)));
    } else {
      setBuffer('');
    }
  }, [value, precision]);

  return (
    <input
      {...props}
      type="number"
      className="number-input-no-spinner"
      value={buffer}
      style={{
        boxSizing: 'border-box',
        ...props.style
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setBuffer(raw); // Update UI display immediately, allowing "-" to be displayed

        // Try to parse the number
        const val = parseFloat(raw);
        
        // Only notify parent when it's a valid number
        // Don't trigger onChange for empty string or just "-" to avoid storing NaN
        if (!isNaN(val) && raw !== '' && raw !== '-') {
          onChange(val);
        }
      }}
      // Ensure data consistency on blur - format to precision
      onBlur={() => {
        if (value !== undefined && value !== null) {
          setBuffer(Number(value.toFixed(precision)));
        } else {
          setBuffer('');
        }
      }}
    />
  );
};

interface MotionEditorProps {
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

export const MotionEditor = ({ isPlaying, setIsPlaying }: MotionEditorProps) => {
  const { 
    blocks, 
    addBlock, 
    updateBlock, 
    activeBlockId, 
    setActiveBlock, 
    captureCameraToBlock, 
    removeBlock,
    moveBlockUp,
    moveBlockDown,
    clearBlocks,
    exportSequenceToFiles,
    loadSequenceFromFiles,
    deleteExportedFile,
    getExportedFiles,
    downloadExportedFile,
    importFileToStorage,
    showBezierDebug,
    toggleBezierDebug
  } = useMotionStore();

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [exportFileName, setExportFileName] = useState('');
  const [exportedFiles, setExportedFiles] = useState<ExportedFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Load files on mount and when import dialog opens
  useEffect(() => {
    if (showImportDialog) {
      loadFiles();
    }
  }, [showImportDialog]);

  const loadFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const files = await getExportedFiles();
      setExportedFiles(files);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const activeBlock = blocks.find(b => b.id === activeBlockId);

  const blockTypes = ['moveTo', 'composite', 'dolly', 'pan', 'truck', 'tilt', 'pedestal', 'roll', 'zoom', 'dollyZoom', 'arc', 'bezierCurve'];

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
    <>
      <style>{`
        .motion-editor-scroll::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
        .motion-editor-scroll {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
        .number-input-no-spinner::-webkit-inner-spin-button,
        .number-input-no-spinner::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .number-input-no-spinner {
          -moz-appearance: textfield;
        }
      `}</style>
      <div 
        className="motion-editor-scroll"
        style={{ 
          position: 'fixed', 
          top: 20, 
          left: 20, 
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
        }}
      >
      <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: '18px' }}>
        Motion Sequence Editor
      </h3>
      
      {/* Save/Load Controls */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              if (blocks.length === 0) {
                alert('No blocks to export');
                return;
              }
              setExportFileName('');
              setShowExportDialog(true);
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: '#8e44ad',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold'
            }}
          >
            💾 Save
          </button>
          <button
            onClick={async () => {
              setShowImportDialog(true);
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: '#2980b9',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold'
            }}
          >
            📂 Load
          </button>
        </div>
        {/* Play/Pause Button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={blocks.length === 0}
          style={{
            width: '100%',
            marginTop: 8,
            padding: '8px 12px',
            background: blocks.length === 0 ? '#444' : (isPlaying ? '#d32f2f' : '#27ae60'),
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: blocks.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>

      {/* Save Dialog (Export File) */}
      {showExportDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20000
        }}>
          <div style={{
            background: '#1a1a1a',
            padding: 20,
            borderRadius: 8,
            width: 400,
            border: '1px solid #444'
          }}>
            <h4 style={{ marginTop: 0, marginBottom: 15 }}>Save Sequence</h4>
            <input
              type="text"
              placeholder="File name..."
              value={exportFileName}
              onChange={(e) => setExportFileName(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && exportFileName.trim()) {
                  await exportSequenceToFiles(exportFileName.trim());
                  setShowExportDialog(false);
                  setExportFileName('');
                }
              }}
              style={{
                width: '100%',
                padding: '8px',
                background: '#222',
                border: '1px solid #444',
                borderRadius: 4,
                color: '#fff',
                fontSize: '14px',
                marginBottom: 15
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={async () => {
                  if (exportFileName.trim()) {
                    await exportSequenceToFiles(exportFileName.trim());
                    setShowExportDialog(false);
                    setExportFileName('');
                  }
                }}
                disabled={!exportFileName.trim()}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: exportFileName.trim() ? '#8e44ad' : '#555',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: exportFileName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '13px'
                }}
              >
                Export
              </button>
              <button
                onClick={() => {
                  setShowExportDialog(false);
                  setExportFileName('');
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#555',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Dialog (Import File) */}
      {showImportDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20000
        }}>
          <div style={{
            background: '#1a1a1a',
            padding: 20,
            borderRadius: 8,
            width: 500,
            maxHeight: '80vh',
            overflowY: 'auto',
            border: '1px solid #444'
          }}>
            <h4 style={{ marginTop: 0, marginBottom: 15 }}>Load Sequence</h4>
            
            {/* File Upload */}
            <div style={{ marginBottom: 20, padding: 15, background: '#222', borderRadius: 4, border: '1px solid #444' }}>
              <label
                style={{
                  display: 'block',
                  padding: '10px',
                  background: '#e67e22',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}
              >
                📁 Choose File to Import
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      const content = event.target?.result as string;
                      if (content) {
                        const fileName = file.name.replace('.json', '');
                        if (await importFileToStorage(content, fileName)) {
                          await loadFiles();
                        }
                      }
                    };
                    reader.onerror = () => {
                      alert('Failed to read file');
                    };
                    reader.readAsText(file);
                    
                    // Reset input so same file can be selected again
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            {/* Saved Files List */}
            <div style={{ marginBottom: 15 }}>
              <div style={{ fontSize: '12px', color: '#aaa', marginBottom: 10 }}>
                Saved Files ({exportedFiles.length})
              </div>
              {isLoadingFiles ? (
                <div style={{ color: '#888', fontSize: '12px', fontStyle: 'italic', marginBottom: 15 }}>
                  Loading files...
                </div>
              ) : exportedFiles.length === 0 ? (
                <div style={{ color: '#888', fontSize: '12px', fontStyle: 'italic', marginBottom: 15 }}>
                  No saved files found.
                </div>
              ) : (
                <div>
                  {exportedFiles.map((file) => (
                    <div
                      key={file.id}
                      style={{
                        padding: 12,
                        background: '#222',
                        borderRadius: 4,
                        marginBottom: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: '1px solid #444'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{file.name}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>
                          {file.blocks.length} block{file.blocks.length !== 1 ? 's' : ''} • 
                          Exported {new Date(file.exportedAt).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={async () => {
                            await loadSequenceFromFiles(file.id);
                            setShowImportDialog(false);
                          }}
                          style={{
                            padding: '6px 12px',
                            background: '#2980b9',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Load
                        </button>
                        <button
                          onClick={async () => {
                            await downloadExportedFile(file.id);
                          }}
                          style={{
                            padding: '6px 12px',
                            background: '#8e44ad',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Download
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete "${file.name}"?`)) {
                              await deleteExportedFile(file.id);
                              await loadFiles();
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            background: '#c0392b',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowImportDialog(false)}
              style={{
                width: '100%',
                padding: '8px',
                background: '#555',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

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
      
      {/* Block List */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: '12px', color: '#aaa' }}>
            Blocks ({blocks.length})
          </div>
          {blocks.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all blocks? This cannot be undone.')) {
                  clearBlocks();
                }
              }}
              style={{
                padding: '4px 8px',
                background: '#c0392b',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              🗑️ Clear All
            </button>
          )}
        </div>
        {blocks.length === 0 ? (
          <div style={{ color: '#888', fontSize: '12px', fontStyle: 'italic' }}>
            No blocks yet. Add one above.
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

      <hr style={{ borderColor: '#444', margin: '20px 0' }}/>

      {/* Detail Editor (Inspector) */}
      {activeBlock ? (
        <div>
          <h4 style={{ marginTop: 0, marginBottom: 15, fontSize: '16px' }}>
            Editing: {activeBlock.id.split('-')[0]}
          </h4>
          
          {/* For moveTo block: Start State -> End State -> Duration -> Easing */}
          {activeBlock.id.startsWith('moveTo') ? (
            <>
              {/* Start State Section */}
              <div style={{ marginBottom: 15 }}>
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
                      {activeBlock.startState.azimuth !== undefined && (
                        <div>Azimuth: {radToDeg(activeBlock.startState.azimuth).toFixed(1)}°</div>
                      )}
                      {activeBlock.startState.polar !== undefined && (
                        <div>Polar: {radToDeg(activeBlock.startState.polar).toFixed(1)}°</div>
                      )}
                      {activeBlock.startState.distance !== undefined && (
                        <div>Distance: {activeBlock.startState.distance.toFixed(2)}</div>
                      )}
                      {activeBlock.startState.roll !== undefined && (
                        <div>Roll: {radToDeg(activeBlock.startState.roll).toFixed(1)}°</div>
                      )}
                      {activeBlock.startState.fov !== undefined && (
                        <div>FOV: {activeBlock.startState.fov.toFixed(1)}°</div>
                      )}
                      {activeBlock.startState.center && (
                        <div>Center: [{activeBlock.startState.center.map(n => n.toFixed(2)).join(', ')}]</div>
                      )}
                    </div>
                  ) : null}

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

              {/* End State Section */}
              <div style={{ marginBottom: 15 }}>
                <div style={{ 
                  background: activeBlock.endState ? '#1a3a1a' : '#222', 
                  padding: 15, 
                  borderRadius: 5,
                  border: activeBlock.endState ? '1px solid #27ae60' : '1px solid #444'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ fontSize: '12px', color: '#aaa', margin: 0, fontWeight: 'bold' }}>
                      End State {activeBlock.endState ? '(Set)' : '(Not Set)'}
                    </p>
                    {activeBlock.endState && (
                      <button
                        onClick={() => updateBlock(activeBlock.id, { endState: undefined })}
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

                  {activeBlock.endState ? (
                    <div style={{ fontSize: '11px', color: '#aaa', lineHeight: '1.6' }}>
                      {activeBlock.endState.azimuth !== undefined && (
                        <div>Azimuth: {radToDeg(activeBlock.endState.azimuth).toFixed(1)}°</div>
                      )}
                      {activeBlock.endState.polar !== undefined && (
                        <div>Polar: {radToDeg(activeBlock.endState.polar).toFixed(1)}°</div>
                      )}
                      {activeBlock.endState.distance !== undefined && (
                        <div>Distance: {activeBlock.endState.distance.toFixed(2)}</div>
                      )}
                      {activeBlock.endState.fov !== undefined && (
                        <div>FOV: {activeBlock.endState.fov.toFixed(1)}°</div>
                      )}
                      {activeBlock.endState.roll !== undefined && (
                        <div>Roll: {radToDeg(activeBlock.endState.roll).toFixed(1)}°</div>
                      )}
                      {activeBlock.endState.center && (
                        <div>Center: [{activeBlock.endState.center.map(n => n.toFixed(2)).join(', ')}]</div>
                      )}
                    </div>
                  ) : null}

                  <button 
                    onClick={() => captureCameraToBlock('endState')}
                    style={{ 
                      width: '100%', 
                      background: activeBlock.endState ? '#2980b9' : '#27ae60', 
                      color: 'white', 
                      border: 'none',
                      borderRadius: 4,
                      padding: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      marginTop: 10
                    }}
                  >
                    {activeBlock.endState ? '🔄 Update End State' : '📍 Capture End State'}
                  </button>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: 5 }}>
                    {activeBlock.endState 
                      ? 'Updates the target camera position for animation'
                      : 'Sets target camera position - camera will move here'}
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontSize: '12px', color: '#aaa' }}>
                  Duration (seconds)
                </label>
                <NumberInput
                  step="0.1"
                  min="0.1"
                  precision={1}
                  value={activeBlock.duration ?? 2} 
                  onChange={(val) => updateBlock(activeBlock.id, { duration: val })}
                  style={{ 
                    width: '100%', 
                    padding: '6px',
                    background: '#1a1a1a',
                    border: '1px solid #444',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Easing */}
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
            </>
          ) : (
            <>
              {/* For other blocks: Start State -> Duration -> Easing -> Block-specific params */}
              {/* Start State Section */}
              <div style={{ marginBottom: 15 }}>
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
                      {activeBlock.startState.azimuth !== undefined && (
                        <div>Azimuth: {radToDeg(activeBlock.startState.azimuth).toFixed(1)}°</div>
                      )}
                      {activeBlock.startState.polar !== undefined && (
                        <div>Polar: {radToDeg(activeBlock.startState.polar).toFixed(1)}°</div>
                      )}
                      {activeBlock.startState.distance !== undefined && (
                        <div>Distance: {activeBlock.startState.distance.toFixed(2)}</div>
                      )}
                      {activeBlock.startState.roll !== undefined && (
                        <div>Roll: {radToDeg(activeBlock.startState.roll).toFixed(1)}°</div>
                      )}
                      {activeBlock.startState.fov !== undefined && (
                        <div>FOV: {activeBlock.startState.fov.toFixed(1)}°</div>
                      )}
                      {activeBlock.startState.center && (
                        <div>Center: [{activeBlock.startState.center.map(n => n.toFixed(2)).join(', ')}]</div>
                      )}
                    </div>
                  ) : null}

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

              {/* Duration */}
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontSize: '12px', color: '#aaa' }}>
                  Duration (seconds)
                </label>
                <NumberInput
                  step="0.1"
                  min="0.1"
                  precision={1}
                  value={activeBlock.duration ?? 2} 
                  onChange={(val) => updateBlock(activeBlock.id, { duration: val })}
                  style={{ 
                    width: '100%', 
                    padding: '6px',
                    background: '#1a1a1a',
                    border: '1px solid #444',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Easing */}
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
            </>
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
                <NumberInput
                  step="0.1"
                  value={activeBlock.dolly ?? 0}
                  onChange={(val) => updateBlock(activeBlock.id, { dolly: val })}
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
                <NumberInput
                  step="1"
                  value={activeBlock.rotate?.azimuth !== undefined ? radToDeg(activeBlock.rotate.azimuth) : 0}
                  onChange={(val) => updateBlock(activeBlock.id, { 
                    rotate: { ...activeBlock.rotate, azimuth: degToRad(val) } 
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
                <NumberInput
                  step="1"
                  value={activeBlock.rotate?.polar !== undefined ? radToDeg(activeBlock.rotate.polar) : 0}
                  onChange={(val) => updateBlock(activeBlock.id, { 
                    rotate: { ...activeBlock.rotate, polar: degToRad(val) } 
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
                  <NumberInput
                    step="0.1"
                    value={activeBlock.truck?.x ?? 0}
                    onChange={(val) => updateBlock(activeBlock.id, { 
                      truck: { ...activeBlock.truck, x: val } 
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
                  <NumberInput
                    step="0.1"
                    value={activeBlock.truck?.y ?? 0}
                    onChange={(val) => updateBlock(activeBlock.id, { 
                      truck: { ...activeBlock.truck, y: val } 
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
              <NumberInput
                step="0.1"
                value={activeBlock.distanceDelta ?? 0}
                onChange={(val) => updateBlock(activeBlock.id, { distanceDelta: val })}
                style={{ 
                  width: '100%', 
                  padding: '6px',
                  background: '#1a1a1a',
                  border: '1px solid #444',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {activeBlock.id.startsWith('pan') && (
            <div style={{ marginTop: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontSize: '12px', color: '#aaa' }}>
                Look Angle (degrees)
              </label>
              <NumberInput
                step="1"
                value={activeBlock.angleDelta !== undefined ? radToDeg(activeBlock.angleDelta) : 45}
                onChange={(val) => updateBlock(activeBlock.id, { angleDelta: degToRad(val) })}
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
              <div style={{ fontSize: '11px', color: '#888', marginTop: 5 }}>
                Camera stays fixed, only viewing direction changes (like turning your head)
              </div>
            </div>
          )}

          {activeBlock.id.startsWith('tilt') && (
            <div style={{ marginTop: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontSize: '12px', color: '#aaa' }}>
                Tilt Angle (degrees)
              </label>
              <NumberInput
                step="1"
                value={activeBlock.angleDelta !== undefined ? radToDeg(activeBlock.angleDelta) : 30}
                onChange={(val) => updateBlock(activeBlock.id, { angleDelta: degToRad(val) })}
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

          {activeBlock.id.startsWith('pedestal') && (
            <div style={{ marginTop: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontSize: '12px', color: '#aaa' }}>
                Vertical Amount
              </label>
              <NumberInput
                step="0.1"
                value={activeBlock.truckY ?? 0}
                onChange={(val) => updateBlock(activeBlock.id, { truckY: val })}
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

          {activeBlock.id.startsWith('roll') && (
            <div style={{ marginTop: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontSize: '12px', color: '#aaa' }}>
                Roll Angle (degrees)
              </label>
              <NumberInput
                step="1"
                value={activeBlock.angleDelta !== undefined ? radToDeg(activeBlock.angleDelta) : 30}
                onChange={(val) => updateBlock(activeBlock.id, { angleDelta: degToRad(val) })}
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

          {activeBlock.id.startsWith('zoom') && (
            <div style={{ marginTop: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontSize: '12px', color: '#aaa' }}>
                Target FOV
              </label>
              <NumberInput
                step="1"
                min="1"
                max="180"
                value={activeBlock.zoomFov ?? 20}
                onChange={(val) => updateBlock(activeBlock.id, { zoomFov: val })}
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
              <div style={{ fontSize: '11px', color: '#888', marginTop: 5 }}>
                Lower values = zoom in (telephoto), Higher values = zoom out (wide angle)
              </div>
            </div>
          )}

          {activeBlock.id.startsWith('dollyZoom') && (
            <div style={{ marginTop: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontSize: '12px', color: '#aaa' }}>
                Target FOV
              </label>
              <NumberInput
                step="1"
                min="1"
                max="180"
                value={activeBlock.zoomFov ?? 10}
                onChange={(val) => updateBlock(activeBlock.id, { zoomFov: val })}
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
              <div style={{ fontSize: '11px', color: '#888', marginTop: 5 }}>
                Hitchcock zoom effect: camera moves while FOV changes to keep subject size constant
              </div>
            </div>
          )}

          {activeBlock.id.startsWith('truck') && (
            <div style={{ marginTop: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontSize: '12px', color: '#aaa' }}>
                Horizontal Amount
              </label>
              <NumberInput
                step="0.1"
                value={activeBlock.truckX ?? activeBlock.truckAmount ?? 0}
                onChange={(val) => updateBlock(activeBlock.id, { 
                  truckX: val,
                  truckAmount: val // Keep for backward compatibility
                })}
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
                <NumberInput
                  step="1"
                  value={activeBlock.arcAngle !== undefined ? radToDeg(activeBlock.arcAngle) : 0}
                  onChange={(val) => updateBlock(activeBlock.id, { arcAngle: degToRad(val) })}
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
                <NumberInput
                  step="0.1"
                  value={activeBlock.distanceDelta ?? 0}
                  onChange={(val) => updateBlock(activeBlock.id, { distanceDelta: val })}
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

          {/* Special UI for Bezier Curve Block */}
          {activeBlock.id.startsWith('bezierCurve') && (
            <>
              {/* Duration */}
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontSize: '12px', color: '#aaa' }}>
                  Duration (seconds)
                </label>
                <NumberInput
                  step="0.1"
                  min="0.1"
                  precision={1}
                  value={activeBlock.duration ?? 3} 
                  onChange={(val) => updateBlock(activeBlock.id, { duration: val })}
                  style={{ 
                    width: '100%', 
                    padding: '6px',
                    background: '#1a1a1a',
                    border: '1px solid #444',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Easing */}
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

              {/* Bezier Curve Control Points */}
              <div style={{ background: '#222', padding: 15, borderRadius: 5, marginTop: 15 }}>
                <p style={{ fontSize: '12px', color: '#aaa', marginTop: 0, marginBottom: 10 }}>
                  Bezier Curve Control Points
                </p>
                
                {/* P0 - Start Point */}
                <div style={{ marginBottom: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <label style={{ fontSize: '12px', color: '#aaa', fontWeight: 'bold' }}>
                      P0 (Start Point)
                    </label>
                    <button
                      onClick={() => {
                        const controls = useMotionStore.getState().controlsRef;
                        if (controls) {
                          const pos = new THREE.Vector3();
                          controls.getPosition(pos);
                          const currentBezier = activeBlock.bezierCurve ?? {};
                          updateBlock(activeBlock.id, {
                            bezierCurve: {
                              ...currentBezier,
                              p0: [pos.x, pos.y, pos.z]
                            }
                          });
                        }
                      }}
                      style={{
                        background: '#27ae60',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Set
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <NumberInput
                      step="0.1"
                      value={activeBlock.bezierCurve?.p0?.[0] ?? 0}
                      onChange={(val) => {
                        const currentBezier = activeBlock.bezierCurve ?? {};
                        const currentP0 = currentBezier.p0 ?? [0, 0, 0];
                        updateBlock(activeBlock.id, {
                          bezierCurve: {
                            ...currentBezier,
                            p0: [val, currentP0[1], currentP0[2]]
                          }
                        });
                      }}
                      placeholder="X"
                      style={{ 
                        width: '100%', 
                        padding: '6px',
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <NumberInput
                      step="0.1"
                      value={activeBlock.bezierCurve?.p0?.[1] ?? 0}
                      onChange={(val) => {
                        const currentBezier = activeBlock.bezierCurve ?? {};
                        const currentP0 = currentBezier.p0 ?? [0, 0, 0];
                        updateBlock(activeBlock.id, {
                          bezierCurve: {
                            ...currentBezier,
                            p0: [currentP0[0], val, currentP0[2]]
                          }
                        });
                      }}
                      placeholder="Y"
                      style={{ 
                        width: '100%', 
                        padding: '6px',
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <NumberInput
                      step="0.1"
                      value={activeBlock.bezierCurve?.p0?.[2] ?? 0}
                      onChange={(val) => {
                        const currentBezier = activeBlock.bezierCurve ?? {};
                        const currentP0 = currentBezier.p0 ?? [0, 0, 0];
                        updateBlock(activeBlock.id, {
                          bezierCurve: {
                            ...currentBezier,
                            p0: [currentP0[0], currentP0[1], val]
                          }
                        });
                      }}
                      placeholder="Z"
                      style={{ 
                        width: '100%', 
                        padding: '6px',
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* P1 - Control Point 1 */}
                <div style={{ marginBottom: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <label style={{ fontSize: '12px', color: '#aaa', fontWeight: 'bold' }}>
                      P1 (Control Point 1)
                    </label>
                    <button
                      onClick={() => {
                        const controls = useMotionStore.getState().controlsRef;
                        if (controls) {
                          const pos = new THREE.Vector3();
                          controls.getPosition(pos);
                          const currentBezier = activeBlock.bezierCurve ?? {};
                          updateBlock(activeBlock.id, {
                            bezierCurve: {
                              ...currentBezier,
                              p1: [pos.x, pos.y, pos.z]
                            }
                          });
                        }
                      }}
                      style={{
                        background: '#27ae60',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Set
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <NumberInput
                      step="0.1"
                      value={activeBlock.bezierCurve?.p1?.[0] ?? 0}
                      onChange={(val) => {
                        const currentBezier = activeBlock.bezierCurve ?? {};
                        const currentP1 = currentBezier.p1 ?? [0, 0, 0];
                        updateBlock(activeBlock.id, {
                          bezierCurve: {
                            ...currentBezier,
                            p1: [val, currentP1[1], currentP1[2]]
                          }
                        });
                      }}
                      placeholder="X"
                      style={{ 
                        width: '100%', 
                        padding: '6px',
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <NumberInput
                      step="0.1"
                      value={activeBlock.bezierCurve?.p1?.[1] ?? 0}
                      onChange={(val) => {
                        const currentBezier = activeBlock.bezierCurve ?? {};
                        const currentP1 = currentBezier.p1 ?? [0, 0, 0];
                        updateBlock(activeBlock.id, {
                          bezierCurve: {
                            ...currentBezier,
                            p1: [currentP1[0], val, currentP1[2]]
                          }
                        });
                      }}
                      placeholder="Y"
                      style={{ 
                        width: '100%', 
                        padding: '6px',
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <NumberInput
                      step="0.1"
                      value={activeBlock.bezierCurve?.p1?.[2] ?? 0}
                      onChange={(val) => {
                        const currentBezier = activeBlock.bezierCurve ?? {};
                        const currentP1 = currentBezier.p1 ?? [0, 0, 0];
                        updateBlock(activeBlock.id, {
                          bezierCurve: {
                            ...currentBezier,
                            p1: [currentP1[0], currentP1[1], val]
                          }
                        });
                      }}
                      placeholder="Z"
                      style={{ 
                        width: '100%', 
                        padding: '6px',
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* P2 - Control Point 2 */}
                <div style={{ marginBottom: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <label style={{ fontSize: '12px', color: '#aaa', fontWeight: 'bold' }}>
                      P2 (Control Point 2)
                    </label>
                    <button
                      onClick={() => {
                        const controls = useMotionStore.getState().controlsRef;
                        if (controls) {
                          const pos = new THREE.Vector3();
                          controls.getPosition(pos);
                          const currentBezier = activeBlock.bezierCurve ?? {};
                          updateBlock(activeBlock.id, {
                            bezierCurve: {
                              ...currentBezier,
                              p2: [pos.x, pos.y, pos.z]
                            }
                          });
                        }
                      }}
                      style={{
                        background: '#27ae60',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Set
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <NumberInput
                      step="0.1"
                      value={activeBlock.bezierCurve?.p2?.[0] ?? 0}
                      onChange={(val) => {
                        const currentBezier = activeBlock.bezierCurve ?? {};
                        const currentP2 = currentBezier.p2 ?? [0, 0, 0];
                        updateBlock(activeBlock.id, {
                          bezierCurve: {
                            ...currentBezier,
                            p2: [val, currentP2[1], currentP2[2]]
                          }
                        });
                      }}
                      placeholder="X"
                      style={{ 
                        width: '100%', 
                        padding: '6px',
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <NumberInput
                      step="0.1"
                      value={activeBlock.bezierCurve?.p2?.[1] ?? 0}
                      onChange={(val) => {
                        const currentBezier = activeBlock.bezierCurve ?? {};
                        const currentP2 = currentBezier.p2 ?? [0, 0, 0];
                        updateBlock(activeBlock.id, {
                          bezierCurve: {
                            ...currentBezier,
                            p2: [currentP2[0], val, currentP2[2]]
                          }
                        });
                      }}
                      placeholder="Y"
                      style={{ 
                        width: '100%', 
                        padding: '6px',
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <NumberInput
                      step="0.1"
                      value={activeBlock.bezierCurve?.p2?.[2] ?? 0}
                      onChange={(val) => {
                        const currentBezier = activeBlock.bezierCurve ?? {};
                        const currentP2 = currentBezier.p2 ?? [0, 0, 0];
                        updateBlock(activeBlock.id, {
                          bezierCurve: {
                            ...currentBezier,
                            p2: [currentP2[0], currentP2[1], val]
                          }
                        });
                      }}
                      placeholder="Z"
                      style={{ 
                        width: '100%', 
                        padding: '6px',
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* P3 - End Point */}
                <div style={{ marginBottom: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <label style={{ fontSize: '12px', color: '#aaa', fontWeight: 'bold' }}>
                      P3 (End Point)
                    </label>
                    <button
                      onClick={() => {
                        const controls = useMotionStore.getState().controlsRef;
                        if (controls) {
                          const pos = new THREE.Vector3();
                          controls.getPosition(pos);
                          const currentBezier = activeBlock.bezierCurve ?? {};
                          updateBlock(activeBlock.id, {
                            bezierCurve: {
                              ...currentBezier,
                              p3: [pos.x, pos.y, pos.z]
                            }
                          });
                        }
                      }}
                      style={{
                        background: '#27ae60',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Set
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <NumberInput
                      step="0.1"
                      value={activeBlock.bezierCurve?.p3?.[0] ?? 0}
                      onChange={(val) => {
                        const currentBezier = activeBlock.bezierCurve ?? {};
                        const currentP3 = currentBezier.p3 ?? [0, 0, 0];
                        updateBlock(activeBlock.id, {
                          bezierCurve: {
                            ...currentBezier,
                            p3: [val, currentP3[1], currentP3[2]]
                          }
                        });
                      }}
                      placeholder="X"
                      style={{ 
                        width: '100%', 
                        padding: '6px',
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <NumberInput
                      step="0.1"
                      value={activeBlock.bezierCurve?.p3?.[1] ?? 0}
                      onChange={(val) => {
                        const currentBezier = activeBlock.bezierCurve ?? {};
                        const currentP3 = currentBezier.p3 ?? [0, 0, 0];
                        updateBlock(activeBlock.id, {
                          bezierCurve: {
                            ...currentBezier,
                            p3: [currentP3[0], val, currentP3[2]]
                          }
                        });
                      }}
                      placeholder="Y"
                      style={{ 
                        width: '100%', 
                        padding: '6px',
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <NumberInput
                      step="0.1"
                      value={activeBlock.bezierCurve?.p3?.[2] ?? 0}
                      onChange={(val) => {
                        const currentBezier = activeBlock.bezierCurve ?? {};
                        const currentP3 = currentBezier.p3 ?? [0, 0, 0];
                        updateBlock(activeBlock.id, {
                          bezierCurve: {
                            ...currentBezier,
                            p3: [currentP3[0], currentP3[1], val]
                          }
                        });
                      }}
                      placeholder="Z"
                      style={{ 
                        width: '100%', 
                        padding: '6px',
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Look At Target (Optional) */}
                <div style={{ marginBottom: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <label style={{ fontSize: '12px', color: '#aaa', fontWeight: 'bold' }}>
                      Look At Target (Optional)
                    </label>
                    <button
                      onClick={() => {
                        const controls = useMotionStore.getState().controlsRef;
                        if (controls) {
                          const pos = new THREE.Vector3();
                          controls.getPosition(pos);
                          const currentBezier = activeBlock.bezierCurve ?? {};
                          updateBlock(activeBlock.id, {
                            bezierCurve: {
                              ...currentBezier,
                              lookAtTarget: [pos.x, pos.y, pos.z]
                            }
                          });
                        }
                      }}
                      style={{
                        background: '#27ae60',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Set
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <NumberInput
                      step="0.1"
                      value={activeBlock.bezierCurve?.lookAtTarget?.[0] ?? 0}
                      onChange={(val) => {
                        const currentBezier = activeBlock.bezierCurve ?? {};
                        const currentTarget = currentBezier.lookAtTarget ?? [0, 0, 0];
                        updateBlock(activeBlock.id, {
                          bezierCurve: {
                            ...currentBezier,
                            lookAtTarget: [val, currentTarget[1], currentTarget[2]]
                          }
                        });
                      }}
                      placeholder="X"
                      style={{ 
                        width: '100%', 
                        padding: '6px',
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <NumberInput
                      step="0.1"
                      value={activeBlock.bezierCurve?.lookAtTarget?.[1] ?? 0}
                      onChange={(val) => {
                        const currentBezier = activeBlock.bezierCurve ?? {};
                        const currentTarget = currentBezier.lookAtTarget ?? [0, 0, 0];
                        updateBlock(activeBlock.id, {
                          bezierCurve: {
                            ...currentBezier,
                            lookAtTarget: [currentTarget[0], val, currentTarget[2]]
                          }
                        });
                      }}
                      placeholder="Y"
                      style={{ 
                        width: '100%', 
                        padding: '6px',
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <NumberInput
                      step="0.1"
                      value={activeBlock.bezierCurve?.lookAtTarget?.[2] ?? 0}
                      onChange={(val) => {
                        const currentBezier = activeBlock.bezierCurve ?? {};
                        const currentTarget = currentBezier.lookAtTarget ?? [0, 0, 0];
                        updateBlock(activeBlock.id, {
                          bezierCurve: {
                            ...currentBezier,
                            lookAtTarget: [currentTarget[0], currentTarget[1], val]
                          }
                        });
                      }}
                      placeholder="Z"
                      style={{ 
                        width: '100%', 
                        padding: '6px',
                        background: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Maintain Orientation and Debug Toggle */}
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: '#aaa', cursor: 'pointer', marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={activeBlock.bezierCurve?.maintainOrientation ?? false}
                      onChange={(e) => updateBlock(activeBlock.id, {
                        bezierCurve: {
                          ...activeBlock.bezierCurve,
                          maintainOrientation: e.target.checked
                        }
                      })}
                      style={{ marginRight: 8 }}
                    />
                    Maintain Camera Orientation
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: '#aaa', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showBezierDebug}
                      onChange={toggleBezierDebug}
                      style={{ marginRight: 8 }}
                    />
                    Show Bezier Curve Debug
                  </label>
                </div>
              </div>
            </>
          )}


        </div>
      ) : (
        <p style={{ color: '#888', fontSize: '12px', fontStyle: 'italic' }}>
          Select a block to edit
        </p>
      )}
      </div>
    </>
  );
};

