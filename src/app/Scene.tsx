import { useThree } from "@react-three/fiber";
import { SplatMesh } from "../components/spark/SplatMesh";
import { SparkRenderer } from "../components/spark/SparkRenderer";
import { CameraControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { SplatMesh as SparkSplatMesh } from "@sparkjsdev/spark";

/**
 * Separate `Scene` component to be used in the React Three Fiber `Canvas` component so that we can use React Three Fiber hooks like `useThree`
 */
export const Scene = () => {
  const renderer = useThree((state) => state.gl);
  const meshRef = useRef<SparkSplatMesh>(null);

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
      <SparkRenderer args={[sparkRendererArgs]}>
        {/* This particular splat mesh is upside down */}
        <group rotation={[Math.PI, 0, 0]}>
          <SplatMesh ref={meshRef} args={[splatMeshArgs]} />
        </group>
      </SparkRenderer>
    </>
  );
};

