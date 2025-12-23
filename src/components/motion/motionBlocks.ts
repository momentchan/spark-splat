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
  panAmount?: number;
  truckAmount?: number;
  arcAngle?: number;
  
  // Absolute positioning parameters
  targetPosition?: [number, number, number]; // [x, y, z] target
  cameraPosition?: [number, number, number]; // [x, y, z] camera pos (optional)
  
  // Composite motion parameters (for simultaneous movements)
  rotate?: { azimuth?: number; polar?: number }; // Rotation angles in radians
  dolly?: number; // Distance change amount
  truck?: { x?: number; y?: number }; // Translation amounts
  
  // Force start state (optional)
  startState?: {
    azimuth?: number;
    polar?: number;
    distance?: number;
    center?: [number, number, number];
  };
}

// Helper function: Apply forced start state
const applyStartState = (controls: CameraControls, startState?: MotionBlockOptions['startState']) => {
  if (startState) {
    if (startState.azimuth !== undefined) controls.azimuthAngle = startState.azimuth;
    if (startState.polar !== undefined) controls.polarAngle = startState.polar;
    if (startState.distance !== undefined) controls.dollyTo(startState.distance, false);
    if (startState.center) controls.setTarget(...startState.center, false);
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
    let initialState = { azimuth: 0, polar: 0, distance: 0 };

    tl.to({}, {
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
        // Template: use this.progress() for interpolation
        // Example: const p = this.progress();
        // controls.azimuthAngle = initialState.azimuth + (p * offset);
        void this.progress(); // Placeholder - implement your motion logic here
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
    
    let startDistance: number;

    tl.to({}, {
      duration,
      ease,
      onStart: () => {
        applyStartState(controls, opts.startState);
        startDistance = controls.distance;
      },
      onUpdate: function () {
        const p = this.progress();
        controls.dollyTo(startDistance + delta * p, false);
      }
    });
    return tl;
  }
});

/**
 * Block: Pan - Move camera left or right horizontally
 */
export const createPanBlock = (opts: MotionBlockOptions = {}): MotionBlock => ({
  id: "pan",
  execute: ({ controls, radius }) => {
    const tl = gsap.timeline();
    const duration = opts.duration ?? 2;
    const ease = opts.ease ?? "power2.inOut";
    const amount = opts.panAmount ?? radius * 0.5;
    
    let lastProgress = 0;
    
    tl.to({}, {
      duration,
      ease,
      onStart: function () {
        applyStartState(controls, opts.startState);
        lastProgress = 0;
      },
      onUpdate: function () {
        const p = this.progress();
        const deltaProgress = p - lastProgress;
        // Truck horizontally using incremental delta
        controls.truck(amount * deltaProgress, 0, false);
        lastProgress = p;
      }
    });
    return tl;
  }
});

/**
 * Block: Truck - Move camera left or right (similar to pan but uses truck method directly)
 */
export const createTruckBlock = (opts: MotionBlockOptions = {}): MotionBlock => ({
  id: "truck",
  execute: ({ controls, radius }) => {
    const tl = gsap.timeline();
    const duration = opts.duration ?? 2;
    const ease = opts.ease ?? "power2.inOut";
    const amount = opts.truckAmount ?? radius * 0.5;
    
    let lastProgress = 0;
    
    tl.to({}, {
      duration,
      ease,
      onStart: function () {
        applyStartState(controls, opts.startState);
        lastProgress = 0;
      },
      onUpdate: function () {
        const p = this.progress();
        const deltaProgress = p - lastProgress;
        // Truck horizontally using incremental delta
        controls.truck(amount * deltaProgress, 0, false);
        lastProgress = p;
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
    
    let startAngle: number;
    let startDistance: number;
    
    tl.to({}, {
      duration,
      ease,
      onStart: function () {
        applyStartState(controls, opts.startState);
        startAngle = controls.azimuthAngle;
        startDistance = controls.distance;
      },
      onUpdate: function () {
        const p = this.progress();
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

    // Initial state cache
    let startState = { 
      azimuth: 0, 
      polar: 0, 
      distance: 0 
    };
    
    // Truck needs special handling because it's incremental - track last progress
    let lastProgress = 0;

    tl.to({}, {
      duration,
      ease,
      onStart: () => {
        applyStartState(controls, opts.startState);
        // Lock initial state
        startState.azimuth = controls.azimuthAngle;
        startState.polar = controls.polarAngle;
        startState.distance = controls.distance;
        lastProgress = 0;
      },
      onUpdate: function () {
        const p = this.progress(); // Progress from 0 to 1
        const deltaProgress = p - lastProgress; // Increment for this frame (for Truck)

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
 * Block: MoveTo (Absolute positioning - Core new feature)
 * Allows you to specify exact "target point (LookAt)" or "camera position".
 * This is the key to achieving Start/End Pos control.
 */
export const createMoveToBlock = (opts: MotionBlockOptions = {}): MotionBlock => {
  // If both cameraPosition and targetPosition are provided, use absolute move
  if (opts.targetPosition && opts.cameraPosition) {
    return createAbsoluteMoveBlock(opts);
  }

  // Otherwise, handle as spherical coordinate interpolation
  return {
    id: "moveTo",
    execute: ({ controls }) => {
      const tl = gsap.timeline();
      const duration = opts.duration ?? 2;
      const ease = opts.ease ?? "power2.inOut";

      // Record start state
      const start = { az: 0, pol: 0, dist: 0 };
      
      tl.to({}, {
        duration,
        ease,
        onStart: () => {
          applyStartState(controls, opts.startState);
          
          start.az = controls.azimuthAngle;
          start.pol = controls.polarAngle;
          start.dist = controls.distance;
          
          // If targetPosition is provided but no cameraPosition,
          // we could calculate spherical angles here
          // For now, this is a placeholder for future enhancement
        },
        onUpdate: function () {
          // Placeholder: If you want to move to specific angles,
          // you would interpolate here using this.progress()
          // For full XYZ positioning, use the absolute move block below
          void this.progress(); // Placeholder - implement interpolation logic here
        }
      });
      
      return tl;
    }
  };
};

/**
 * Specialized block for absolute path movement
 * Moves from current position -> specified Camera Position and Target Position
 */
const createAbsoluteMoveBlock = (opts: MotionBlockOptions): MotionBlock => ({
  id: "absoluteMove",
  execute: ({ controls }) => {
    const tl = gsap.timeline();
    const duration = opts.duration ?? 2;
    const ease = opts.ease ?? "power2.inOut";
    
    const startState = { cx: 0, cy: 0, cz: 0, tx: 0, ty: 0, tz: 0 };
    const endState = { 
      cx: opts.cameraPosition![0], 
      cy: opts.cameraPosition![1], 
      cz: opts.cameraPosition![2],
      tx: opts.targetPosition![0], 
      ty: opts.targetPosition![1], 
      tz: opts.targetPosition![2]
    };

    tl.to(startState, {
      cx: endState.cx, 
      cy: endState.cy, 
      cz: endState.cz,
      tx: endState.tx, 
      ty: endState.ty, 
      tz: endState.tz,
      duration,
      ease,
      onStart: () => {
        applyStartState(controls, opts.startState);
        const pos = new THREE.Vector3();
        const target = new THREE.Vector3();
        controls.getPosition(pos);
        controls.getTarget(target);
        startState.cx = pos.x; 
        startState.cy = pos.y; 
        startState.cz = pos.z;
        startState.tx = target.x; 
        startState.ty = target.y; 
        startState.tz = target.z;
      },
      onUpdate: function () {
        // Each frame, set interpolated coordinates back to camera
        controls.setLookAt(
          startState.cx, startState.cy, startState.cz,
          startState.tx, startState.ty, startState.tz,
          false // disable transition, let gsap handle it
        );
      }
    });
    return tl;
  }
});