import { useThree } from "@react-three/fiber";
import { SplatMesh } from "../components/spark/SplatMesh";
import { SparkRenderer } from "../components/spark/SparkRenderer";
import { useMemo, useRef, useState, useEffect } from "react";
import type { SplatMesh as SparkSplatMesh } from "@sparkjsdev/spark";
import { MotionSequencer } from "../components/motion/MotionSequencer";
import { useMotionStore } from "../components/motion/useMotionStore";
import type { CameraControls } from "@react-three/drei";
import { BezierCurveDebug } from "../components/motion/BezierCurveDebug";

interface SceneProps {
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

/**
 * Separate `Scene` component to be used in the React Three Fiber `Canvas` component so that we can use React Three Fiber hooks like `useThree`
 */
export const Scene = ({ isPlaying, setIsPlaying }: SceneProps) => {
  const renderer = useThree((state) => state.gl);
  const meshRef = useRef<SparkSplatMesh>(null);
  const [replayKey, setReplayKey] = useState(0); // Key to force re-render of MotionSequencer
  
  // Get blocks from store and setControls function
  const { blocks, setControls } = useMotionStore();
  
  // Get CameraControls instance from R3F
  const controls = useThree((state) => state.controls as CameraControls | null);

  // Register controls to store when available
  useEffect(() => {
    if (controls) {
      setControls(controls);
    }
  }, [controls, setControls]);

  // Replay function - resets and restarts the sequence
  const replaySequence = () => {
    setIsPlaying(false);
    // Use a small timeout to ensure the sequence stops before restarting
    setTimeout(() => {
      setReplayKey(prev => prev + 1); // Force re-render
      setIsPlaying(true);
    }, 50);
  };

  // Keyboard event listener for "P" key to replay
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Check if "P" key is pressed (case-insensitive)
      if (event.key.toLowerCase() === 'p') {
        // Prevent default behavior if needed
        event.preventDefault();
        replaySequence();
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyPress);

    // Cleanup: remove event listener on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [setIsPlaying]); // Include setIsPlaying in dependencies

  // Memoize the elements inside the `<SparkRenderer />` `args` prop so that we don't re-create the `<SparkRenderer />` on every render
  const sparkRendererArgs = useMemo(() => {
    return { renderer };
  }, [renderer]);

  // Memoize the `SplatMesh` `args` prop so that we don't re-create the `SplatMesh` on every render
  const splatMeshArgs = useMemo(
    () =>
      ({
        url: "/models/splats/hoodie_msbhv.ply",
      }) as const,
    [],
  );

  return (
    <>
      <MotionSequencer 
        key={replayKey} // Force re-mount when replayKey changes
        isPlaying={isPlaying}
        sequenceIds={blocks.length > 0 ? blocks : []} // Use blocks from store
        modelRadius={2}
        onComplete={() => {
          console.log("Motion sequence completed");
          setIsPlaying(false);
        }}
      />
      {/* Debug visualization for Bezier Curves */}
      <BezierCurveDebug />
      <SparkRenderer args={[sparkRendererArgs]}>
        {/* This particular splat mesh is upside down */}
        <group rotation={[Math.PI, Math.PI * 0.5, 0]}>
          <SplatMesh ref={meshRef} args={[splatMeshArgs]} />
        </group>
      </SparkRenderer>
    </>
  );
};

