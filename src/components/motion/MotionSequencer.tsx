import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { CameraControls } from "@react-three/drei";
import { 
  createDollyBlock,
  createPanBlock,
  createTruckBlock,
  createArcBlock,
  createCompositeBlock,
  createMoveToBlock,
  MotionBlock,
  MotionBlockOptions
} from "./motionBlocks";

// Block configuration interface extends MotionBlockOptions
export interface BlockConfig extends MotionBlockOptions {
  id: string;
}

interface MotionSequencerProps {
  isPlaying: boolean;
  sequenceIds: string[] | BlockConfig[]; // Support both string array and config array
  modelRadius?: number;
  onComplete?: () => void;
}

export const MotionSequencer = ({ 
  isPlaying, 
  sequenceIds, 
  modelRadius = 2, 
  onComplete 
}: MotionSequencerProps) => {
  const controls = useThree((state) => state.controls as CameraControls | null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  // [FIX] Use Ref to ensure original settings persist across render cycles
  const originalDampingRef = useRef<number>(0.05);

  // Motion block factory mapping - all factories now accept unified MotionBlockOptions
  const blockMap: Record<string, (opts: MotionBlockOptions) => MotionBlock> = {
    dolly: createDollyBlock,
    pan: createPanBlock,
    truck: createTruckBlock,
    arc: createArcBlock,
    composite: createCompositeBlock,
    moveTo: createMoveToBlock,
  };

  useEffect(() => {
    if (!controls) return;

    if (isPlaying) {
      // 1. Clear old animation and reset
      timelineRef.current?.kill();
      
      // 2. [FIX] Safely save original damping using ref
      originalDampingRef.current = controls.dampingFactor;
      controls.dampingFactor = 0.05; // Temporarily reduce damping to work with GSAP
      
      const mainTl = gsap.timeline({ 
        onComplete: () => {
          // Restore damping when animation completes
          controls.dampingFactor = originalDampingRef.current;
          onComplete?.();
        }
      });

      // 3. Assemble sequence - blocks run sequentially without overlap
      // Each block captures state when it actually starts (via onStart), ensuring continuity
      sequenceIds.forEach((item) => {
        // Support both string (backward compatibility) and BlockConfig
        const config: BlockConfig = typeof item === 'string' 
          ? { id: item } 
          : item;
        
        const blockFactory = blockMap[config.id];
        if (blockFactory) {
          // No need to manually extract parameters - just pass the config object
          // This makes it extensible: adding ease, delay, startPos, etc. doesn't require code changes here
          const block = blockFactory(config);
          const blockTimeline = block.execute({ controls, radius: modelRadius });
          // Add blocks sequentially without overlap
          mainTl.add(blockTimeline);
        }
      });

      timelineRef.current = mainTl;
    } else {
      // Pause logic
      timelineRef.current?.pause();
    }

    return () => {
      timelineRef.current?.kill();
      // Restore damping on cleanup
      if (controls) {
        controls.dampingFactor = originalDampingRef.current;
      }
    };
  }, [isPlaying, sequenceIds, controls, modelRadius, onComplete]);

  return null; // No rendering needed
};
