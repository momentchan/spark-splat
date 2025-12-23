import { useThree } from "@react-three/fiber";
import { SplatMesh } from "../components/spark/SplatMesh";
import { SparkRenderer } from "../components/spark/SparkRenderer";
import { CameraControls } from "@react-three/drei";
import { useMemo, useRef, useState, useEffect } from "react";
import type { SplatMesh as SparkSplatMesh } from "@sparkjsdev/spark";
import { MotionSequencer, BlockConfig } from "../components/motion/MotionSequencer";

/**
 * Separate `Scene` component to be used in the React Three Fiber `Canvas` component so that we can use React Three Fiber hooks like `useThree`
 */
export const Scene = () => {
  const renderer = useThree((state) => state.gl);
  const meshRef = useRef<SparkSplatMesh>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [replayKey, setReplayKey] = useState(0); // Key to force re-render of MotionSequencer

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
  }, []); // Empty dependency array - only set up once
  
  // Define sequence using the new unified MotionBlockOptions system
  // Showcasing: custom easing, startState, and absolute positioning
  const sequenceIds: BlockConfig[] = [
    // Example 1: Dolly with custom easing and startState (instant cut to position, then animate)
    { 
      id: "dolly", 
      duration: 2.5, 
      ease: "power3.out",
      distanceDelta: -1.5,
      startState: {
        azimuth: 0,
        polar: Math.PI / 3,
        distance: 4
      }
    },
    // Example 2: Pan with smooth easing
    { 
      id: "pan", 
      duration: 2, 
      ease: "power2.inOut",
      panAmount: 0.8 
    },
    // Example 3: Arc motion with custom easing
    { 
      id: "arc", 
      duration: 3, 
      ease: "expo.inOut",
      arcAngle: Math.PI / 2, 
      distanceDelta: 0.5 
    },
    // Example 3.5: Composite block - simultaneous dolly, rotate, and truck
    // This demonstrates the power of composite: all movements happen together smoothly
    {
      id: "composite",
      duration: 3,
      ease: "expo.out",
      rotate: { azimuth: Math.PI / 2 }, // Rotate 90 degrees
      dolly: 2,                         // Pull back 2 units simultaneously
      truck: { y: 0.5 }                 // Move camera up 0.5 units simultaneously
    },
    // Example 4: Absolute positioning - move to specific camera and target positions
    {
      id: "moveTo",
      duration: 2.5,
      ease: "power2.inOut",
      cameraPosition: [3, 2, 3],
      targetPosition: [0, 0, 0]
    },
    // Example 5: Truck back with elastic easing
    { 
      id: "truck", 
      duration: 2, 
      ease: "elastic.out",
      truckAmount: -0.6 
    },
  ];

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
      <CameraControls />
      <MotionSequencer 
        key={replayKey} // Force re-mount when replayKey changes
        isPlaying={isPlaying}
        sequenceIds={sequenceIds}
        modelRadius={2}
        onComplete={() => {
          console.log("Motion sequence completed");
          setIsPlaying(false);
        }}
      />
      <SparkRenderer args={[sparkRendererArgs]}>
        {/* This particular splat mesh is upside down */}
        <group rotation={[Math.PI, Math.PI * 0.5, 0]}>
          <SplatMesh ref={meshRef} args={[splatMeshArgs]} />
        </group>
      </SparkRenderer>
    </>
  );
};

