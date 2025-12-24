import { AdaptiveDpr, CameraControls } from "@react-three/drei";
import { LevaWrapper } from "@packages/r3f-gist/components";
import { Canvas } from "@react-three/fiber";
import { Scene } from "./Scene";
import { MotionEditor } from "../components/motion/MotionEditor";
import { useState } from "react";
import { ProceduralSphere } from "../components/ProceduralSphere";

export default function App() {
    const [isPlaying, setIsPlaying] = useState(false);

    return <>
        {/* LevaWrapper - initially hidden to avoid overlap with MotionEditor */}
        <LevaWrapper initialHidden={false} collapsed />

        {/* Motion Editor UI - positioned outside Canvas */}
        <MotionEditor isPlaying={isPlaying} setIsPlaying={setIsPlaying} />

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
            <ProceduralSphere />

            <CameraControls makeDefault />
        </Canvas>
    </>
}
