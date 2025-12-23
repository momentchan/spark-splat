import { AdaptiveDpr, Backdrop, CameraControls } from "@react-three/drei";
import { CanvasCapture } from "@packages/r3f-gist/components/utility";
import { LevaWrapper } from "@packages/r3f-gist/components";
import { Canvas } from "@react-three/fiber";
import { Scene } from "./Scene";
import Effects from "../components/Effects";

export default function App() {
    return <>
        <LevaWrapper />

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
            <Scene />

            <CameraControls makeDefault />
            <CanvasCapture />
        </Canvas>
    </>
}
