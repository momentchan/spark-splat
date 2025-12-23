import { create } from 'zustand';
import { CameraControls } from '@react-three/drei';
import { BlockConfig } from './MotionSequencer';
import { MotionBlockOptions } from './motionBlocks';
import * as THREE from 'three';
import { getAllFiles, saveFile, getFile, deleteFile, migrateFromLocalStorage, type ExportedFile } from './fileStorage';

export interface SavedSequence {
  id: string;
  name: string;
  blocks: BlockConfig[];
  createdAt: number;
  updatedAt: number;
}

// ExportedFile is now imported from fileStorage.ts

interface MotionState {
  blocks: BlockConfig[];
  activeBlockId: string | null; // Currently editing Block ID
  controlsRef: CameraControls | null; // Store CameraControls instance

  setControls: (controls: CameraControls) => void;
  addBlock: (type: string) => void;
  updateBlock: (id: string, data: Partial<MotionBlockOptions>) => void;
  removeBlock: (id: string) => void;
  setActiveBlock: (id: string | null) => void;
  setBlocks: (blocks: BlockConfig[]) => void;
  moveBlockUp: (id: string) => void;
  moveBlockDown: (id: string) => void;
  
  // Core feature: Capture current camera state to current Block
  captureCameraToBlock: (field: 'startState' | 'endState' | 'targetPosition' | 'cameraPosition') => void;
  
  // Save/Load sequences
  saveSequence: (name: string) => string; // Returns sequence ID
  loadSequence: (id: string) => void;
  deleteSequence: (id: string) => void;
  getSavedSequences: () => SavedSequence[];
  clearBlocks: () => void;
  
  // Export/Import to/from file system (managed in IndexedDB)
  exportSequenceToFiles: (name: string) => Promise<string>; // Returns file ID
  loadSequenceFromFiles: (id: string) => Promise<void>;
  deleteExportedFile: (id: string) => Promise<void>;
  getExportedFiles: () => Promise<ExportedFile[]>;
  downloadExportedFile: (id: string) => Promise<void>; // Download as JSON file
  importFileToStorage: (fileContent: string, name?: string) => Promise<boolean>; // Import and add to storage
}

// Re-export ExportedFile type
export type { ExportedFile } from './fileStorage';

// Helper function: Get default options for different block types
const getDefaultOptions = (type: string): Partial<BlockConfig> => {
  const base = { duration: 2, ease: 'power2.inOut' };
  
  if (type === 'moveTo') {
    return { ...base, id: type };
  }
  if (type === 'composite') {
    return { ...base, duration: 3, id: type };
  }
  if (type === 'dolly') {
    return { ...base, distanceDelta: 1, id: type };
  }
  if (type === 'arc') {
    return { ...base, duration: 3, arcAngle: Math.PI / 2, id: type };
  }
  if (type === 'pan') {
    return { ...base, angleDelta: Math.PI / 4, id: type }; // Default: 45 degrees
  }
  if (type === 'tilt') {
    return { ...base, angleDelta: Math.PI / 6, id: type }; // Default: 30 degrees
  }
  if (type === 'pedestal') {
    return { ...base, truckY: 1, id: type };
  }
  if (type === 'roll') {
    return { ...base, angleDelta: Math.PI / 6, id: type }; // Default: 30 degrees
  }
  if (type === 'zoom') {
    return { ...base, zoomFov: 20, id: type }; // Default: zoom in to 20
  }
  if (type === 'dollyZoom') {
    return { ...base, duration: 3, zoomFov: 10, id: type }; // Default: 3s, zoom to 10
  }
  if (type === 'truck') {
    return { ...base, truckAmount: 0.5, id: type };
  }
  
  return { ...base, id: type };
};

export const useMotionStore = create<MotionState>((set, get) => ({
  blocks: [],
  activeBlockId: null,
  controlsRef: null,

  setControls: (controls) => set({ controlsRef: controls }),

  addBlock: (type) => {
    const timestamp = Date.now();
    const newBlock: BlockConfig = {
      id: `${type}-${timestamp}`,
      ...getDefaultOptions(type)
    } as BlockConfig;
    
    set((state) => ({
      blocks: [...state.blocks, newBlock],
      activeBlockId: newBlock.id
    }));
  },

  updateBlock: (id, data) => set((state) => ({
    blocks: state.blocks.map((b) => 
      b.id === id ? { ...b, ...data } : b
    )
  })),

  removeBlock: (id) => set((state) => {
    const newBlocks = state.blocks.filter((b) => b.id !== id);
    return {
      blocks: newBlocks,
      activeBlockId: state.activeBlockId === id 
        ? (newBlocks.length > 0 ? newBlocks[0].id : null)
        : state.activeBlockId
    };
  }),

  setActiveBlock: (id) => set({ activeBlockId: id }),

  setBlocks: (blocks) => set({ blocks }),

  moveBlockUp: (id) => set((state) => {
    const index = state.blocks.findIndex(b => b.id === id);
    if (index <= 0) return state; // Already at top or not found
    
    const newBlocks = [...state.blocks];
    [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    return { blocks: newBlocks };
  }),

  moveBlockDown: (id) => set((state) => {
    const index = state.blocks.findIndex(b => b.id === id);
    if (index < 0 || index >= state.blocks.length - 1) return state; // Already at bottom or not found
    
    const newBlocks = [...state.blocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    return { blocks: newBlocks };
  }),

  captureCameraToBlock: (field) => {
    const { controlsRef, activeBlockId, updateBlock } = get();
    if (!controlsRef || !activeBlockId) {
      console.warn('Cannot capture: controls or activeBlockId not set');
      return;
    }

    // Get current camera data
    const pos = new THREE.Vector3();
    const target = new THREE.Vector3();
    controlsRef.getPosition(pos);
    controlsRef.getTarget(target);

    // Build camera state object
    const cameraState: any = {
      azimuth: controlsRef.azimuthAngle,
      polar: controlsRef.polarAngle,
      distance: controlsRef.distance,
      center: [target.x, target.y, target.z] as [number, number, number]
    };

    // Add FOV if camera is PerspectiveCamera
    if (controlsRef.camera instanceof THREE.PerspectiveCamera) {
      cameraState.fov = controlsRef.camera.fov;
    }

    // Fill data based on field to set
    if (field === 'cameraPosition') {
      updateBlock(activeBlockId, { 
        cameraPosition: [pos.x, pos.y, pos.z] 
      });
    } else if (field === 'targetPosition') {
      updateBlock(activeBlockId, { 
        targetPosition: [target.x, target.y, target.z] 
      });
    } else if (field === 'startState') {
      updateBlock(activeBlockId, {
        startState: cameraState
      });
    } else if (field === 'endState') {
      updateBlock(activeBlockId, {
        endState: cameraState
      });
    }
  },

  clearBlocks: () => set({ blocks: [], activeBlockId: null }),

  saveSequence: (name: string) => {
    const { blocks } = get();
    const now = Date.now();
    const id = `seq-${now}`;
    
    const sequence: SavedSequence = {
      id,
      name,
      blocks: JSON.parse(JSON.stringify(blocks)), // Deep clone
      createdAt: now,
      updatedAt: now
    };

    // Get existing sequences from localStorage
    const existing = localStorage.getItem('motionSequences');
    const sequences: SavedSequence[] = existing ? JSON.parse(existing) : [];
    
    // Add new sequence
    sequences.push(sequence);
    
    // Save back to localStorage
    localStorage.setItem('motionSequences', JSON.stringify(sequences));
    
    return id;
  },

  loadSequence: (id: string) => {
    const existing = localStorage.getItem('motionSequences');
    if (!existing) return;
    
    const sequences: SavedSequence[] = JSON.parse(existing);
    const sequence = sequences.find(s => s.id === id);
    
    if (sequence) {
      set({ 
        blocks: sequence.blocks,
        activeBlockId: sequence.blocks.length > 0 ? sequence.blocks[0].id : null
      });
    }
  },

  deleteSequence: (id: string) => {
    const existing = localStorage.getItem('motionSequences');
    if (!existing) return;
    
    const sequences: SavedSequence[] = JSON.parse(existing);
    const filtered = sequences.filter(s => s.id !== id);
    localStorage.setItem('motionSequences', JSON.stringify(filtered));
  },

  getSavedSequences: (): SavedSequence[] => {
    const existing = localStorage.getItem('motionSequences');
    if (!existing) return [];
    
    const sequences: SavedSequence[] = JSON.parse(existing);
    // Sort by updatedAt descending (most recent first)
    return sequences.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  // Export sequence to files storage (IndexedDB)
  exportSequenceToFiles: async (name: string) => {
    const { blocks } = get();
    const now = Date.now();
    const id = `file-${now}`;
    
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      blocks: blocks
    };
    
    const fileContent = JSON.stringify(data, null, 2);
    
    const exportedFile: ExportedFile = {
      id,
      name,
      blocks: JSON.parse(JSON.stringify(blocks)), // Deep clone
      exportedAt: now,
      fileContent
    };

    try {
      await saveFile(exportedFile);
      return id;
    } catch (error) {
      console.error('Failed to save file:', error);
      alert('Failed to save file');
      return '';
    }
  },

  // Load sequence from files storage
  loadSequenceFromFiles: async (id: string) => {
    try {
      const file = await getFile(id);
      if (file) {
        set({ 
          blocks: file.blocks,
          activeBlockId: file.blocks.length > 0 ? file.blocks[0].id : null
        });
      }
    } catch (error) {
      console.error('Failed to load file:', error);
      alert('Failed to load file');
    }
  },

  // Delete exported file
  deleteExportedFile: async (id: string) => {
    try {
      await deleteFile(id);
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file');
    }
  },

  // Get all exported files
  getExportedFiles: async (): Promise<ExportedFile[]> => {
    try {
      // Migrate from localStorage on first run
      await migrateFromLocalStorage();
      return await getAllFiles();
    } catch (error) {
      console.error('Failed to get files:', error);
      return [];
    }
  },

  // Download exported file as JSON file
  downloadExportedFile: async (id: string) => {
    try {
      const file = await getFile(id);
      if (!file) return;
      
      const blob = new Blob([file.fileContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.name}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('Failed to download file');
    }
  },

  // Import file and add to storage
  importFileToStorage: async (fileContent: string, name?: string): Promise<boolean> => {
    try {
      const data = JSON.parse(fileContent);
      
      // Support both old format (just blocks array) and new format (with metadata)
      const blocksToImport = data.blocks || data;
      
      if (!Array.isArray(blocksToImport)) {
        throw new Error('Invalid file format: blocks must be an array');
      }
      
      // Validate blocks structure
      for (const block of blocksToImport) {
        if (!block.id || typeof block.id !== 'string') {
          throw new Error('Invalid block format: missing or invalid id');
        }
      }
      
      const now = Date.now();
      const id = `file-${now}`;
      const fileName = name || `imported-${new Date().toLocaleDateString()}`;
      
      const exportedFile: ExportedFile = {
        id,
        name: fileName,
        blocks: blocksToImport,
        exportedAt: now,
        fileContent
      };

      await saveFile(exportedFile);
      return true;
    } catch (error) {
      console.error('Failed to import file:', error);
      alert(`Failed to import file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
}));

