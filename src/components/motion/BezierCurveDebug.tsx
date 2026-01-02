import { useMemo } from 'react';
import { useMotionStore } from './useMotionStore';
import * as THREE from 'three';
import { Line, Sphere, Text } from '@react-three/drei';

/**
 * Debug visualization for Bezier Curve blocks
 * Shows control points, control lines, and the curve path
 */
export const BezierCurveDebug = () => {
  const { blocks, activeBlockId, showBezierDebug } = useMotionStore();
  
  // Find all bezier curve blocks and generate visualization data
  const bezierVisualizations = useMemo(() => {
    return blocks
      .filter(block => block.id.startsWith('bezierCurve') && block.bezierCurve)
      .map((block) => {
        const bezierConfig = block.bezierCurve;
        if (!bezierConfig) return null;
        
        // Get control points (can be null if not set)
        const p0 = bezierConfig.p0 ? new THREE.Vector3(...bezierConfig.p0) : null;
        const p1 = bezierConfig.p1 ? new THREE.Vector3(...bezierConfig.p1) : null;
        const p2 = bezierConfig.p2 ? new THREE.Vector3(...bezierConfig.p2) : null;
        const p3 = bezierConfig.p3 ? new THREE.Vector3(...bezierConfig.p3) : null;
        
        // Generate curve points only if all 4 points are set
        let curvePoints: THREE.Vector3[] | null = null;
        if (p0 && p1 && p2 && p3) {
          const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
          curvePoints = [];
          const divisions = 100;
          for (let i = 0; i <= divisions; i++) {
            const t = i / divisions;
            curvePoints.push(curve.getPoint(t));
          }
        }
        
        return {
          blockId: block.id,
          p0,
          p1,
          p2,
          p3,
          curvePoints,
          lookAtTarget: bezierConfig.lookAtTarget ? new THREE.Vector3(...bezierConfig.lookAtTarget) : null,
          isActive: block.id === activeBlockId
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  }, [blocks, activeBlockId]);
  
  // Don't render if debug is disabled (check after hooks)
  if (!showBezierDebug) return null;
  
  return (
    <>
      {bezierVisualizations.map((viz) => (
        <group key={viz.blockId}>
          {/* Control Points - Show each point if it's set */}
          {viz.p0 && (
            <>
              <Sphere position={viz.p0} args={[0.1, 16, 16]}>
                <meshStandardMaterial color={viz.isActive ? "#00ff00" : "#ff0000"} />
              </Sphere>
              <Text
                position={[viz.p0.x, viz.p0.y + 0.15, viz.p0.z]}
                fontSize={0.15}
                color={viz.isActive ? "#00ff00" : "#ff0000"}
                anchorX="center"
                anchorY="middle"
              >
                0
              </Text>
            </>
          )}
          
          {viz.p1 && (
            <>
              <Sphere position={viz.p1} args={[0.08, 16, 16]}>
                <meshStandardMaterial color={viz.isActive ? "#00ffff" : "#ff8800"} />
              </Sphere>
              <Text
                position={[viz.p1.x, viz.p1.y + 0.15, viz.p1.z]}
                fontSize={0.15}
                color={viz.isActive ? "#00ffff" : "#ff8800"}
                anchorX="center"
                anchorY="middle"
              >
                1
              </Text>
            </>
          )}
          
          {viz.p2 && (
            <>
              <Sphere position={viz.p2} args={[0.08, 16, 16]}>
                <meshStandardMaterial color={viz.isActive ? "#00ffff" : "#ff8800"} />
              </Sphere>
              <Text
                position={[viz.p2.x, viz.p2.y + 0.15, viz.p2.z]}
                fontSize={0.15}
                color={viz.isActive ? "#00ffff" : "#ff8800"}
                anchorX="center"
                anchorY="middle"
              >
                2
              </Text>
            </>
          )}
          
          {viz.p3 && (
            <>
              <Sphere position={viz.p3} args={[0.1, 16, 16]}>
                <meshStandardMaterial color={viz.isActive ? "#0000ff" : "#ff00ff"} />
              </Sphere>
              <Text
                position={[viz.p3.x, viz.p3.y + 0.15, viz.p3.z]}
                fontSize={0.15}
                color={viz.isActive ? "#0000ff" : "#ff00ff"}
                anchorX="center"
                anchorY="middle"
              >
                3
              </Text>
            </>
          )}
          
          {/* Control Lines - Only show lines between consecutive points that are both set */}
          {viz.p0 && viz.p1 && (
            <Line
              points={[viz.p0, viz.p1]}
              color={viz.isActive ? "#888888" : "#666666"}
              lineWidth={viz.isActive ? 2 : 1}
              dashed
            />
          )}
          {viz.p1 && viz.p2 && (
            <Line
              points={[viz.p1, viz.p2]}
              color={viz.isActive ? "#888888" : "#666666"}
              lineWidth={viz.isActive ? 2 : 1}
              dashed
            />
          )}
          {viz.p2 && viz.p3 && (
            <Line
              points={[viz.p2, viz.p3]}
              color={viz.isActive ? "#888888" : "#666666"}
              lineWidth={viz.isActive ? 2 : 1}
              dashed
            />
          )}
          
          {/* Bezier Curve Path - Only show if all 4 points are set */}
          {viz.curvePoints && (
            <Line
              points={viz.curvePoints}
              color={viz.isActive ? "#ffff00" : "#ffffff"}
              lineWidth={viz.isActive ? 3 : 2}
            />
          )}
          
          {/* Look At Target (if set) */}
          {viz.lookAtTarget && viz.p3 && (
            <>
              <Sphere position={viz.lookAtTarget} args={[0.12, 16, 16]}>
                <meshStandardMaterial color="#ffff00" />
              </Sphere>
              {/* Line from last point to target */}
              <Line
                points={[viz.p3, viz.lookAtTarget]}
                color="#ffff00"
                lineWidth={1}
                dashed
              />
            </>
          )}
        </group>
      ))}
    </>
  );
};
