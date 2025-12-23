import { AdaptiveDpr, CameraControls } from "@react-three/drei";
import { CanvasCapture } from "@packages/r3f-gist/components/utility";
import { LevaWrapper } from "@packages/r3f-gist/components";
import { Canvas } from "@react-three/fiber";
import { Scene } from "./Scene";
import { MotionEditor } from "../components/motion/MotionEditor";
import { useMotionStore } from "../components/motion/useMotionStore";
import { useState } from "react";

export default function App() {
    const { blocks } = useMotionStore();
    const [isPlaying, setIsPlaying] = useState(false);

    return <>
        {/* LevaWrapper - initially hidden to avoid overlap with MotionEditor */}
        <LevaWrapper initialHidden={true} />

        {/* Motion Editor UI - positioned outside Canvas */}
        <MotionEditor />
        
        {/* Play/Pause Controls */}
        <div style={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            display: 'flex',
            gap: 10,
            zIndex: 10001 // Same as MotionEditor to ensure visibility
        }}>
            <button
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={blocks.length === 0}
                style={{
                    padding: '10px 20px',
                    background: blocks.length === 0 ? '#444' : (isPlaying ? '#d32f2f' : '#27ae60'),
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: blocks.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                }}
            >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <div style={{
                padding: '10px 15px',
                background: '#1a1a1a',
                color: '#fff',
                borderRadius: 6,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center'
            }}>
                Blocks: {blocks.length}
            </div>
        </div>

        <Canvas
            shadows
            camera={{
                fov: 45,
                near: 0.1,
                far: 200,
                position: [0, 0, 5]
            }}
            gl={{ preserveDrawingBuffer: true, antialias: false }}
            dpr={[1, 2]}
            performance={{ min: 0.5, max: 1 }}
        >
            <AdaptiveDpr pixelated />

            <color attach="background" args={["#000000"]} />
            <Scene isPlaying={isPlaying} setIsPlaying={setIsPlaying} />

            <CameraControls makeDefault />
            <CanvasCapture />
        </Canvas>
    </>
}
