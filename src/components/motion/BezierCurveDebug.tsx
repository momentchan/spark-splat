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
        
        // Get control points from array
        const controlPoints = bezierConfig.controlPoints 
          ? bezierConfig.controlPoints.map(p => new THREE.Vector3(...p))
          : [];
        
        // Generate curve points only if we have at least 2 points
        let curvePoints: THREE.Vector3[] | null = null;
        if (controlPoints.length >= 2) {
          const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'centripetal');
          curvePoints = [];
          const divisions = 100;
          for (let i = 0; i <= divisions; i++) {
            const t = i / divisions;
            curvePoints.push(curve.getPoint(t));
          }
        }
        
        return {
          blockId: block.id,
          controlPoints,
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
          {/* Control Points - Show each point */}
          {viz.controlPoints.map((point, index) => {
            const isStart = index === 0;
            const isEnd = index === viz.controlPoints.length - 1;
            const isMiddle = !isStart && !isEnd;
            
            // Color coding: start = green/red, middle = cyan/orange, end = blue/magenta
            const color = isStart 
              ? (viz.isActive ? "#00ff00" : "#ff0000")
              : isEnd
              ? (viz.isActive ? "#0000ff" : "#ff00ff")
              : (viz.isActive ? "#00ffff" : "#ff8800");
            
            const size = (isStart || isEnd) ? 0.1 : 0.08;
            
            return (
              <group key={index}>
                <Sphere position={point} args={[size, 16, 16]}>
                  <meshStandardMaterial color={color} />
                </Sphere>
                <Text
                  position={[point.x, point.y + 0.15, point.z]}
                  fontSize={0.15}
                  color={color}
                  anchorX="center"
                  anchorY="middle"
                >
                  {index}
                </Text>
              </group>
            );
          })}
          
          {/* Control Lines - Show lines between consecutive points */}
          {viz.controlPoints.map((point, index) => {
            if (index < viz.controlPoints.length - 1) {
              const nextPoint = viz.controlPoints[index + 1];
              return (
                <Line
                  key={`line-${index}`}
                  points={[point, nextPoint]}
                  color={viz.isActive ? "#888888" : "#666666"}
                  lineWidth={viz.isActive ? 2 : 1}
                  dashed
                />
              );
            }
            return null;
          })}
          
          {/* Curve Path - Show if we have at least 2 points */}
          {viz.curvePoints && viz.curvePoints.length > 0 && (
            <Line
              points={viz.curvePoints}
              color={viz.isActive ? "#ffff00" : "#ffffff"}
              lineWidth={viz.isActive ? 3 : 2}
            />
          )}
          
          {/* Look At Target (if set and we have control points) */}
          {viz.lookAtTarget && viz.controlPoints.length > 0 && (
            <>
              <Sphere position={viz.lookAtTarget} args={[0.12, 16, 16]}>
                <meshStandardMaterial color="#ffff00" />
              </Sphere>
              {/* Line from last point to target */}
              <Line
                points={[viz.controlPoints[viz.controlPoints.length - 1], viz.lookAtTarget]}
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
