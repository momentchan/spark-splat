import { create } from 'zustand';
import { CameraControls } from '@react-three/drei';
import { BlockConfig } from './MotionSequencer';
import { MotionBlockOptions } from './motionBlocks';
import * as THREE from 'three';

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
  captureCameraToBlock: (field: 'startState' | 'targetPosition' | 'cameraPosition') => void;
}

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
    return { ...base, panAmount: 0.5, id: type };
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
      // Calculate Polar/Azimuth from current state
      updateBlock(activeBlockId, {
        startState: {
          azimuth: controlsRef.azimuthAngle,
          polar: controlsRef.polarAngle,
          distance: controlsRef.distance,
          center: [target.x, target.y, target.z]
        }
      });
    }
  }
}));

