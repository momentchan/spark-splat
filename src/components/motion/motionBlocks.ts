import gsap from "gsap";
import { CameraControls } from "@react-three/drei";
import * as THREE from "three";

export interface BlockContext {
  controls: CameraControls;
  radius: number;
}

// Base interface
export interface MotionBlock {
  id: string;
  execute: (ctx: BlockContext) => gsap.core.Timeline;
}

// Unified configuration interface
export interface MotionBlockOptions {
  duration?: number;
  ease?: string; // Support easing like "power1.out", "elastic.inOut"
  
  // Relative motion parameters
  distanceDelta?: number;
  angleDelta?: number; // Angle change in radians for Pan/Tilt/Roll (converted from degrees in UI)
  panAmount?: number; // Legacy: angle in radians for Pan/Orbit (use angleDelta instead)
  truckAmount?: number; // Legacy: horizontal truck amount (use truckX instead)
  truckX?: number; // Horizontal truck amount
  truckY?: number; // Vertical truck amount (for Pedestal)
  arcAngle?: number; // Arc angle in radians (converted from degrees in UI)
  zoomFov?: number; // Target FOV for zoom effects
  
  // Absolute positioning parameters
  targetPosition?: [number, number, number]; // [x, y, z] target
  cameraPosition?: [number, number, number]; // [x, y, z] camera pos (optional)
  
  // Smart move targets (for moveTo block)
  // Specifies the final destination values
  to?: {
    azimuth?: number;   // Target horizontal angle (radians)
    polar?: number;     // Target vertical angle (radians)
    distance?: number;  // Target distance
    target?: [number, number, number]; // Target center point [x, y, z]
  };
  
  // Composite motion parameters (for simultaneous movements)
  rotate?: { azimuth?: number; polar?: number }; // Rotation angles in radians (converted from degrees in UI)
  dolly?: number; // Distance change amount
  truck?: { x?: number; y?: number }; // Translation amounts
  
  // Force start state (optional)
  startState?: {
    azimuth?: number;
    polar?: number;
    distance?: number;
    center?: [number, number, number];
    fov?: number; // Field of view
    roll?: number; // Roll angle in radians
  };
  
  // End state (for moveTo block)
  endState?: {
    azimuth?: number;
    polar?: number;
    distance?: number;
    center?: [number, number, number];
    fov?: number; // Field of view
    roll?: number; // Roll angle in radians
  };
  
  // Bezier curve parameters
  bezierCurve?: {
    controlPoints?: [number, number, number][]; // Array of control points (minimum 2 points required)
    lookAtTarget?: [number, number, number]; // Optional: camera looks at this point while following curve
    maintainOrientation?: boolean; // If true, camera maintains its orientation; if false, looks at lookAtTarget
  };
}

/**
 * Helper: Calculate shortest path for rotation
 * Ensures rotation doesn't take the long way around (e.g., from 350° to 10° should rotate 20°, not 340°)
 */
const getShortestAngle = (start: number, end: number): number => {
  const twoPi = Math.PI * 2;
  let diff = ((end - start) % twoPi + twoPi) % twoPi;
  if (diff > Math.PI) {
    diff -= twoPi;
  }
  return start + diff;
};

// Helper function: Apply forced start state
const applyStartState = (controls: CameraControls, startState?: MotionBlockOptions['startState']) => {
  if (startState) {
    if (startState.azimuth !== undefined) controls.azimuthAngle = startState.azimuth;
    if (startState.polar !== undefined) controls.polarAngle = startState.polar;
    if (startState.distance !== undefined) controls.dollyTo(startState.distance, false);
    if (startState.center) controls.setTarget(...startState.center, false);
    
    // Handle roll by rotating camera around its forward axis
    if (startState.roll !== undefined) {
      const forward = new THREE.Vector3();
      controls.camera.getWorldDirection(forward);
      const rotationMatrix = new THREE.Matrix4().makeRotationAxis(forward, startState.roll);
      const newUp = controls.camera.up.clone().applyMatrix4(rotationMatrix);
      controls.camera.up.copy(newUp);
      controls.camera.updateProjectionMatrix();
    }
    
    // Handle FOV (requires direct camera manipulation)
    if (startState.fov !== undefined && controls.camera instanceof THREE.PerspectiveCamera) {
      controls.camera.fov = startState.fov;
      controls.camera.updateProjectionMatrix();
    }
  }
};

/**
 * Motion Block Core Template Specification:
 * 1. Always capture controls' current state in onStart
 * 2. Use progress (0 -> 1) with LERP (linear interpolation) to calculate values
 * 3. Ensure control is "clean" when each Block ends
 * 
 * Template for creating new motion blocks (Pan, Tilt, Zoom, etc.)
 */
export const createGenericBlock = (opts: MotionBlockOptions = {}): MotionBlock => ({
  id: "generic-action",
  execute: ({ controls }) => {
    const tl = gsap.timeline();
    const duration = opts.duration ?? 2;
    const ease = opts.ease ?? "power2.inOut";
    
    // Proxy object to hold eased progress value
    const progressProxy = { value: 0 };
    let initialState = { azimuth: 0, polar: 0, distance: 0 };

    tl.to(progressProxy, {
      value: 1,
      duration,
      ease,
      onStart: () => {
        applyStartState(controls, opts.startState);
        // Capture all relevant state
        initialState.azimuth = controls.azimuthAngle;
        initialState.polar = controls.polarAngle;
        initialState.distance = controls.distance;
      },
      onUpdate: function() {
        // Template: use progressProxy.value for interpolation (this is eased)
        // Example: const p = progressProxy.value;
        // controls.azimuthAngle = initialState.azimuth + (p * offset);
        void progressProxy.value; // Placeholder - implement your motion logic here
      }
    });
    return tl;
  }
});

/**
 * Block: Dolly (Move forward/backward)
 */
export const createDollyBlock = (opts: MotionBlockOptions = {}): MotionBlock => ({
  id: "dolly",
  execute: ({ controls, radius }) => {
    const tl = gsap.timeline();
    const duration = opts.duration ?? 2;
    const ease = opts.ease ?? "power2.inOut";
    const delta = opts.distanceDelta ?? radius * 0.5;
    
    // Proxy object to hold eased progress value
    const progressProxy = { value: 0 };
    let startDistance: number;

    tl.to(progressProxy, {
      value: 1, // Tween from 0 to 1
      duration,
      ease, // Easing now applies to progressProxy.value
      onStart: () => {
        applyStartState(controls, opts.startState);
        startDistance = controls.distance;
      },
      onUpdate: function () {
        const p = progressProxy.value; // This is the eased progress value
        controls.dollyTo(startDistance + delta * p, false);
      }
    });
    return tl;
  }
});

/**
 * Block: Pan / Look Around
 * Camera position stays fixed, only the viewing direction changes (by moving the target).
 * Visual effect: Background moves, object moves out of frame center.
 * This is like turning your head while standing still.
 */
export const createPanBlock = (opts: MotionBlockOptions = {}): MotionBlock => ({
  id: "pan",
  execute: ({ controls }) => {
    const tl = gsap.timeline();
    const duration = opts.duration ?? 2;
    const ease = opts.ease ?? "power2.inOut";
    const angle = opts.angleDelta ?? Math.PI / 4; // Angle to look left/right

    // Proxy object to hold eased progress value
    const progressProxy = { value: 0 };
    
    // Record initial state
    let startPos = new THREE.Vector3();
    let startTarget = new THREE.Vector3();
    let forwardVec = new THREE.Vector3(); // Camera forward vector

    tl.to(progressProxy, {
      value: 1,
      duration,
      ease,
      onStart: () => {
        applyStartState(controls, opts.startState);
        
        controls.getPosition(startPos);
        controls.getTarget(startTarget);
        
        // Calculate original "view vector" (Target - Position)
        forwardVec.subVectors(startTarget, startPos);
      },
      onUpdate: () => {
        const p = progressProxy.value; // Eased progress value
        
        // Rotate the vector
        // Rotate view vector around Y-axis (world vertical axis)
        const currentVec = forwardVec.clone();
        currentVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle * p);
        
        // Calculate new Target position
        // New Target = Camera Position + New Vector
        // This keeps Camera Position fixed, only Target moves
        const newTarget = startPos.clone().add(currentVec);

        controls.setLookAt(
          startPos.x, startPos.y, startPos.z, // Camera position stays fixed
          newTarget.x, newTarget.y, newTarget.z, // Target position changes
          false // Disable built-in transition
        );
      }
    });
    return tl;
  }
});

/**
 * Block: Truck - Move camera left or right horizontally
 */
export const createTruckBlock = (opts: MotionBlockOptions = {}): MotionBlock => ({
  id: "truck",
  execute: ({ controls, radius }) => {
    const tl = gsap.timeline();
    const duration = opts.duration ?? 2;
    const ease = opts.ease ?? "power2.inOut";
    // Use truckX if provided, otherwise fall back to truckAmount for backward compatibility
    const amount = opts.truckX ?? opts.truckAmount ?? radius * 0.5;
    
    // Proxy object to hold eased progress value
    const progressProxy = { value: 0 };
    let lastProgress = 0;
    
    tl.to(progressProxy, {
      value: 1,
      duration,
      ease,
      onStart: function () {
        applyStartState(controls, opts.startState);
        lastProgress = 0;
      },
      onUpdate: function () {
        const p = progressProxy.value; // Eased progress value
        const deltaProgress = p - lastProgress; // Delta will now reflect easing curve
        // Truck horizontally using incremental delta
        controls.truck(amount * deltaProgress, 0, false);
        lastProgress = p;
      }
    });
    return tl;
  }
});

/**
 * Block: Tilt - Rotate camera vertically around the target (change polar angle)
 * This allows viewing the top or bottom of the model.
 */
export const createTiltBlock = (opts: MotionBlockOptions = {}): MotionBlock => ({
  id: "tilt",
  execute: ({ controls }) => {
    const tl = gsap.timeline();
    const duration = opts.duration ?? 2;
    const ease = opts.ease ?? "power2.inOut";
    const angle = opts.angleDelta ?? Math.PI / 6; // Default: 30 degrees
    
    // Proxy object to hold eased progress value
    const progressProxy = { value: 0 };
    let startAngle: number;
    
    tl.to(progressProxy, {
      value: 1,
      duration,
      ease,
      onStart: function () {
        applyStartState(controls, opts.startState);
        startAngle = controls.polarAngle;
      },
      onUpdate: function () {
        const p = progressProxy.value; // Eased progress value
        // Note: Polar angle is typically constrained between 0 (top) and PI (bottom)
        controls.polarAngle = startAngle + angle * p;
      }
    });
    return tl;
  }
});

/**
 * Block: Pedestal - Move camera vertically (vertical truck)
 * This moves the entire camera up or down, not rotating.
 * Great for showcasing height details of models.
 */
export const createPedestalBlock = (opts: MotionBlockOptions = {}): MotionBlock => ({
  id: "pedestal",
  execute: ({ controls, radius }) => {
    const tl = gsap.timeline();
    const duration = opts.duration ?? 2;
    const ease = opts.ease ?? "power2.inOut";
    const yAmount = opts.truckY ?? radius * 0.5;
    
    // Proxy object to hold eased progress value
    const progressProxy = { value: 0 };
    let lastProgress = 0;
    
    tl.to(progressProxy, {
      value: 1,
      duration,
      ease,
      onStart: function () {
        applyStartState(controls, opts.startState);
        lastProgress = 0;
      },
      onUpdate: function () {
        const p = progressProxy.value; // Eased progress value
        const deltaProgress = p - lastProgress; // Delta will now reflect easing curve
        // Truck vertically: second parameter controls vertical movement
        controls.truck(0, yAmount * deltaProgress, false);
        lastProgress = p;
      }
    });
    return tl;
  }
});

/**
 * Block: Roll - Rotate camera around its forward axis (Dutch angle)
 * Creates a tilted, dynamic feel. Great for artistic or energetic shots.
 */
export const createRollBlock = (opts: MotionBlockOptions = {}): MotionBlock => ({
  id: "roll",
  execute: ({ controls }) => {
    const tl = gsap.timeline();
    const duration = opts.duration ?? 1;
    const ease = opts.ease ?? "power2.inOut";
    const angle = opts.angleDelta ?? Math.PI / 6; // Default: 30 degrees
    
    // Proxy object to hold eased progress value
    const progressProxy = { value: 0 };
    let startUp = new THREE.Vector3();
    let forward = new THREE.Vector3();
    
    tl.to(progressProxy, {
      value: 1,
      duration,
      ease,
      onStart: function () {
        applyStartState(controls, opts.startState);
        // Capture initial camera orientation
        startUp.copy(controls.camera.up);
        controls.camera.getWorldDirection(forward);
      },
      onUpdate: function () {
        const p = progressProxy.value; // Eased progress value
        const currentRoll = angle * p;
        
        // Rotate camera up vector around forward axis
        const rotationMatrix = new THREE.Matrix4().makeRotationAxis(forward, currentRoll);
        const newUp = startUp.clone().applyMatrix4(rotationMatrix);
        controls.camera.up.copy(newUp);
        controls.camera.updateProjectionMatrix();
      }
    });
    return tl;
  }
});

/**
 * Block: Zoom - Change field of view (FOV)
 * This is optical zoom, not camera movement.
 */
export const createZoomBlock = (opts: MotionBlockOptions = {}): MotionBlock => ({
  id: "zoom",
  execute: ({ controls }) => {
    const tl = gsap.timeline();
    const duration = opts.duration ?? 2;
    const ease = opts.ease ?? "power2.inOut";
    const targetFov = opts.zoomFov ?? 20; // Default: zoom in to 20 (telephoto)
    
    // Proxy object to hold eased progress value
    const progressProxy = { value: 0 };
    let startFov = 50;
    
    tl.to(progressProxy, {
      value: 1,
      duration,
      ease,
      onStart: function () {
        applyStartState(controls, opts.startState);
        if (controls.camera instanceof THREE.PerspectiveCamera) {
          startFov = controls.camera.fov;
        }
      },
      onUpdate: function () {
        if (controls.camera instanceof THREE.PerspectiveCamera) {
          const p = progressProxy.value; // Eased progress value
          // Interpolate FOV
          controls.camera.fov = startFov + (targetFov - startFov) * p;
          controls.camera.updateProjectionMatrix(); // Must call this, otherwise view won't update
        }
      }
    });
    return tl;
  }
});

/**
 * Block: Dolly Zoom (Vertigo Effect) - Hitchcock zoom
 * Simultaneously dolly in (move forward) and zoom out (wider FOV), or vice versa.
 * Subject size stays constant, but background perspective changes dramatically.
 */
export const createDollyZoomBlock = (opts: MotionBlockOptions = {}): MotionBlock => ({
  id: "dollyZoom",
  execute: ({ controls }) => {
    const tl = gsap.timeline();
    const duration = opts.duration ?? 3;
    const ease = opts.ease ?? "power2.inOut";
    const targetFov = opts.zoomFov ?? 10; // Zoom target
    
    // Dolly logic needs to compensate inversely: if FOV gets smaller (zoom in),
    // camera needs to move back (dolly out) to maintain subject size
    
    // Proxy object to hold eased progress value
    const progressProxy = { value: 0 };
    let startFov = 45;
    let startDist = 0;
    
    tl.to(progressProxy, {
      value: 1,
      duration,
      ease,
      onStart: function () {
        applyStartState(controls, opts.startState);
        if (controls.camera instanceof THREE.PerspectiveCamera) {
          startFov = controls.camera.fov;
        }
        startDist = controls.distance;
      },
      onUpdate: function () {
        if (controls.camera instanceof THREE.PerspectiveCamera) {
          const p = progressProxy.value; // Eased progress value
          
          // 1. Calculate current FOV
          const currentFov = startFov + (targetFov - startFov) * p;
          controls.camera.fov = currentFov;
          controls.camera.updateProjectionMatrix();
          
          // 2. Calculate compensating distance (formula to maintain subject size)
          // Distance2 = Distance1 * tan(FOV1 / 2) / tan(FOV2 / 2)
          const rad1 = (startFov * Math.PI) / 360;
          const rad2 = (currentFov * Math.PI) / 360;
          const newDist = startDist * (Math.tan(rad1) / Math.tan(rad2));
          
          controls.dollyTo(newDist, false);
        }
      }
    });
    return tl;
  }
});

/**
 * Block: Arc - Move camera in an arc (combination of azimuth rotation and distance change)
 */
export const createArcBlock = (opts: MotionBlockOptions = {}): MotionBlock => ({
  id: "arc",
  execute: ({ controls, radius }) => {
    const tl = gsap.timeline();
    const duration = opts.duration ?? 3;
    const ease = opts.ease ?? "power2.inOut";
    const angle = opts.arcAngle ?? Math.PI / 2;
    const delta = opts.distanceDelta ?? radius * 0.3;
    
    // Proxy object to hold eased progress value
    const progressProxy = { value: 0 };
    let startAngle: number;
    let startDistance: number;
    
    tl.to(progressProxy, {
      value: 1,
      duration,
      ease,
      onStart: function () {
        applyStartState(controls, opts.startState);
        startAngle = controls.azimuthAngle;
        startDistance = controls.distance;
      },
      onUpdate: function () {
        const p = progressProxy.value; // Eased progress value
        // Rotate azimuth
        controls.azimuthAngle = startAngle + angle * p;
        // Change distance (dolly)
        const targetDistance = startDistance + delta * p;
        controls.dollyTo(targetDistance, false);
      }
    });
    return tl;
  }
});

/**
 * Block: Composite - Execute multiple camera movements simultaneously
 * This avoids conflicts that occur when multiple blocks try to control the same camera properties.
 * All movements are calculated in a single onUpdate loop for smooth, synchronized motion.
 */
export const createCompositeBlock = (opts: MotionBlockOptions = {}): MotionBlock => ({
  id: "composite",
  execute: ({ controls }) => {
    const tl = gsap.timeline();
    const duration = opts.duration ?? 2;
    const ease = opts.ease ?? "power2.inOut";

    // Proxy object to hold eased progress value
    const progressProxy = { value: 0 };

    // Initial state cache
    let startState = { 
      azimuth: 0, 
      polar: 0, 
      distance: 0 
    };
    
    // Truck needs special handling because it's incremental - track last progress
    let lastProgress = 0;

    tl.to(progressProxy, {
      value: 1,
      duration,
      ease, // Easing now applies to progressProxy.value
      onStart: () => {
        applyStartState(controls, opts.startState);
        // Lock initial state
        startState.azimuth = controls.azimuthAngle;
        startState.polar = controls.polarAngle;
        startState.distance = controls.distance;
        lastProgress = 0;
      },
      onUpdate: function () {
        const p = progressProxy.value; // Eased progress value (0 to 1)
        const deltaProgress = p - lastProgress; // Delta will now reflect easing curve

        // A. Handle rotation (Arc/Rotate) - absolute calculation
        if (opts.rotate) {
          if (opts.rotate.azimuth !== undefined) {
            controls.azimuthAngle = startState.azimuth + (opts.rotate.azimuth * p);
          }
          if (opts.rotate.polar !== undefined) {
            controls.polarAngle = startState.polar + (opts.rotate.polar * p);
          }
        }

        // B. Handle dolly (push/pull) - absolute calculation
        if (opts.dolly !== undefined) {
          const targetDist = startState.distance + (opts.dolly * p);
          controls.dollyTo(targetDist, false);
        }

        // C. Handle truck (translation) - incremental calculation
        // Truck must use increment (delta) because it doesn't have a simple absolute setter
        // Delta will now reflect easing: slow start, fast middle, slow end (for easeInOut)
        if (opts.truck) {
          const tx = (opts.truck.x ?? 0) * deltaProgress;
          const ty = (opts.truck.y ?? 0) * deltaProgress;
          if (tx !== 0 || ty !== 0) {
            controls.truck(tx, ty, false);
          }
        }

        lastProgress = p;
      }
    });

    return tl;
  }
});

/**
 * Block: MoveTo (Smart Interpolation)
 * Smoothly transitions camera from startState (or current) to endState.
 * Uses shortest path rotation and supports all camera properties.
 */
export const createMoveToBlock = (opts: MotionBlockOptions = {}): MotionBlock => {
  return {
    id: "moveTo",
    execute: ({ controls }) => {
      const tl = gsap.timeline();
      const duration = opts.duration ?? 2;
      const ease = opts.ease ?? "power2.inOut";

      // Proxy object to hold eased progress value
      const progressProxy = { value: 0 };

      // State variables
      const start = { 
        az: 0, pol: 0, dist: 0, 
        tx: 0, ty: 0, tz: 0,
        fov: 50, roll: 0
      };
      const end = { 
        az: 0, pol: 0, dist: 0, 
        tx: 0, ty: 0, tz: 0,
        fov: 50, roll: 0
      };

      tl.to(progressProxy, {
        value: 1,
        duration,
        ease,
        onStart: () => {
          // Apply forced start state (if provided)
          applyStartState(controls, opts.startState);

          // Capture current camera state as start
          start.az = controls.azimuthAngle;
          start.pol = controls.polarAngle;
          start.dist = controls.distance;
          
          const currentTarget = new THREE.Vector3();
          controls.getTarget(currentTarget);
          start.tx = currentTarget.x;
          start.ty = currentTarget.y;
          start.tz = currentTarget.z;
          
          if (controls.camera instanceof THREE.PerspectiveCamera) {
            start.fov = controls.camera.fov;
          }
          
          // Get roll from camera up vector (simplified)
          start.roll = 0; // Will be calculated if needed

          // Calculate end state from endState or fallback to to (for backward compatibility)
          const endState = opts.endState || {};
          
          // Use endState if provided, otherwise fallback to to (legacy support)
          const targetAz = endState.azimuth ?? opts.to?.azimuth ?? start.az;
          end.az = getShortestAngle(start.az, targetAz);
          end.pol = endState.polar ?? opts.to?.polar ?? start.pol;
          end.dist = endState.distance ?? opts.to?.distance ?? start.dist;
          
          if (endState.center) {
            end.tx = endState.center[0];
            end.ty = endState.center[1];
            end.tz = endState.center[2];
          } else if (opts.to?.target) {
            end.tx = opts.to.target[0];
            end.ty = opts.to.target[1];
            end.tz = opts.to.target[2];
          } else {
            end.tx = start.tx;
            end.ty = start.ty;
            end.tz = start.tz;
          }
          
          if (endState.fov !== undefined && controls.camera instanceof THREE.PerspectiveCamera) {
            end.fov = endState.fov;
          } else {
            end.fov = start.fov;
          }
          
          end.roll = endState.roll ?? start.roll;
        },
        onUpdate: function () {
          const p = progressProxy.value;

          // Interpolate spherical coordinates
          controls.azimuthAngle = start.az + (end.az - start.az) * p;
          controls.polarAngle = start.pol + (end.pol - start.pol) * p;
          controls.dollyTo(start.dist + (end.dist - start.dist) * p, false);
          
          // Interpolate center point
          const nextTx = start.tx + (end.tx - start.tx) * p;
          const nextTy = start.ty + (end.ty - start.ty) * p;
          const nextTz = start.tz + (end.tz - start.tz) * p;
          controls.setTarget(nextTx, nextTy, nextTz, false);
          
          // Interpolate FOV
          if (controls.camera instanceof THREE.PerspectiveCamera) {
            controls.camera.fov = start.fov + (end.fov - start.fov) * p;
            controls.camera.updateProjectionMatrix();
          }
          
          // Interpolate roll (if changed)
          if (end.roll !== start.roll) {
            const forward = new THREE.Vector3();
            controls.camera.getWorldDirection(forward);
            const rotationMatrix = new THREE.Matrix4().makeRotationAxis(
              forward, 
              start.roll + (end.roll - start.roll) * p
            );
            const initialUp = new THREE.Vector3(0, 1, 0);
            const newUp = initialUp.applyMatrix4(rotationMatrix);
            controls.camera.up.copy(newUp);
            controls.camera.updateProjectionMatrix();
          }
        }
      });

      return tl;
    }
  };
};

/**
 * Block: Bezier Curve
 * Camera follows a cubic bezier curve defined by 4 control points.
 */
export const createBezierCurveBlock = (opts: MotionBlockOptions = {}): MotionBlock => {
  return {
    id: "bezierCurve",
    execute: ({ controls }) => {
      const tl = gsap.timeline();
      const duration = opts.duration ?? 3;
      const ease = opts.ease ?? "power2.inOut";
      
      const bezierConfig = opts.bezierCurve;
      if (!bezierConfig) {
        console.warn("Bezier curve block: No bezier curve configuration provided");
        return tl;
      }
      
      // Proxy object to hold eased progress value
      const progressProxy = { value: 0 };
      
      let controlPoints: THREE.Vector3[] = [];
      let lookAtTarget: THREE.Vector3 | null = null;
      let maintainOrientation = bezierConfig.maintainOrientation ?? false;
      let initialForward: THREE.Vector3 | null = null;
      let initialUp: THREE.Vector3 | null = null;
      let curve: THREE.CatmullRomCurve3;
      
      tl.to(progressProxy, {
        value: 1,
        duration,
        ease,
        onStart: () => {
          // Get current camera position as default start point
          const currentPos = new THREE.Vector3();
          controls.getPosition(currentPos);
          
          // Get control points from config or use defaults
          if (bezierConfig.controlPoints && bezierConfig.controlPoints.length >= 2) {
            controlPoints = bezierConfig.controlPoints.map(p => new THREE.Vector3(...p));
          } else {
            // Default: use current position and a few offset points
            controlPoints = [
              currentPos.clone(),
              currentPos.clone().add(new THREE.Vector3(2, 0, 0)),
              currentPos.clone().add(new THREE.Vector3(4, 2, 0)),
              currentPos.clone().add(new THREE.Vector3(6, 0, 0))
            ];
          }
          
          // Set look-at target (defaults to [0, 0, 0])
          if (bezierConfig.lookAtTarget && 
              (bezierConfig.lookAtTarget[0] !== 0 || 
               bezierConfig.lookAtTarget[1] !== 0 || 
               bezierConfig.lookAtTarget[2] !== 0)) {
            lookAtTarget = new THREE.Vector3(...bezierConfig.lookAtTarget);
          } else if (bezierConfig.lookAtTarget) {
            // Explicitly set to [0, 0, 0]
            lookAtTarget = new THREE.Vector3(0, 0, 0);
          } else {
            // Not set, use null to indicate no look-at target
            lookAtTarget = null;
          }
          
          // Store initial orientation if maintaining orientation
          if (maintainOrientation) {
            initialForward = new THREE.Vector3();
            controls.camera.getWorldDirection(initialForward);
            initialUp = controls.camera.up.clone();
          }
          
          // Create the curve using CatmullRomCurve3 (supports any number of points)
          curve = new THREE.CatmullRomCurve3(controlPoints, false, 'centripetal');
        },
        onUpdate: () => {
          const t = progressProxy.value; // Eased progress value (0 to 1)
          
          // Get point on curve at parameter t
          const pointOnCurve = curve.getPoint(t);
          
          if (maintainOrientation && initialForward && initialUp) {
            // Maintain camera orientation (forward and up vectors)
            const targetPos = pointOnCurve.clone().add(initialForward);
            controls.setLookAt(
              pointOnCurve.x, pointOnCurve.y, pointOnCurve.z,
              targetPos.x, targetPos.y, targetPos.z,
              false
            );
            // Restore up vector
            controls.camera.up.copy(initialUp);
            controls.camera.updateProjectionMatrix();
          } else if (lookAtTarget) {
            // Look at specified target
            controls.setLookAt(
              pointOnCurve.x, pointOnCurve.y, pointOnCurve.z,
              lookAtTarget.x, lookAtTarget.y, lookAtTarget.z,
              false
            );
          } else {
            // Calculate tangent direction for natural camera orientation
            const tangent = curve.getTangent(t);
            const targetPos = pointOnCurve.clone().add(tangent.multiplyScalar(5));
            controls.setLookAt(
              pointOnCurve.x, pointOnCurve.y, pointOnCurve.z,
              targetPos.x, targetPos.y, targetPos.z,
              false
            );
          }
        }
      });
      return tl;
    }
  };
};