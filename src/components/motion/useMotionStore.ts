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
  captureCameraToBlock: (field: 'startState' | 'endState' | 'targetPosition' | 'cameraPosition') => void;
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
  }
}));

