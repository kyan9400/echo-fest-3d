/*
  GLSL for the Echo Tunnel. The tunnel bends away from the camera; the same bend is mirrored in JS
  (bendX / bendY in engine.ts) so the light gates follow the walls exactly.
*/

export const TUNNEL_LENGTH = 110;
export const TUNNEL_RADIUS = 4;
export const HISTORY = 64; // rows of spectrum history = how far an echo travels down the tunnel
export const BANDS = 64;

const bend = /* glsl */ `
  uniform float uTime;
  vec2 bend(float z) {
    float d = clamp(-z / ${TUNNEL_LENGTH.toFixed(1)}, 0.0, 1.0);
    float k = pow(d, 1.5) * 15.0;
    return vec2(sin(z * 0.045 + uTime * 0.35), cos(z * 0.032 + uTime * 0.27) * 0.8) * k;
  }
`;

export const tunnelVertex = /* glsl */ `
  ${bend}
  uniform sampler2D uHistory;
  uniform float uHead;
  varying float vDepth;
  varying float vAmp;
  varying float vSide;
  varying float vZ;

  void main() {
    vec3 p = position;
    float d = clamp(-p.z / ${TUNNEL_LENGTH.toFixed(1)}, 0.0, 1.0);
    vec2 n = normalize(p.xy);
    // 0 at the floor (bass) -> 1 at the ceiling (treble), mirrored left/right
    float side = acos(clamp(-n.y, -1.0, 1.0)) / 3.14159265;
    // the newest spectrum row is at the camera; older rows lie deeper in the tunnel
    float row = uHead - d * ${((HISTORY - 1) / HISTORY).toFixed(4)};
    float amp = texture2D(uHistory, vec2(0.02 + side * 0.9, row)).r;
    float r = ${TUNNEL_RADIUS.toFixed(1)} * (1.0 - amp * 0.3 * (0.35 + 0.65 * (1.0 - d)));
    p.xy = n * r + bend(p.z);
    vDepth = d;
    vAmp = amp;
    vSide = side;
    vZ = position.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const tunnelFragment = /* glsl */ `
  uniform float uTravel;
  uniform float uBass;
  uniform vec3 uAcid;
  uniform vec3 uCoral;
  uniform vec3 uCyan;
  uniform vec3 uNight;
  uniform vec3 uPlum;
  varying float vDepth;
  varying float vAmp;
  varying float vSide;
  varying float vZ;

  float gridLine(float coord, float width) {
    float f = abs(fract(coord) - 0.5);
    float w = fwidth(coord) * 1.2 + width;
    return 1.0 - smoothstep(width, w, 0.5 - f);
  }

  void main() {
    float rings = gridLine((vZ + uTravel) * 0.32, 0.02);
    float ribs = gridLine(vSide * 18.0, 0.015);
    float grid = max(rings, ribs * 0.55);

    vec3 hue = mix(uAcid, uCoral, smoothstep(0.04, 0.42, vDepth));
    hue = mix(hue, uCyan, smoothstep(0.45, 0.85, vDepth));
    hue = mix(hue, uCyan, smoothstep(0.55, 1.0, vSide) * 0.5);

    vec3 col = uPlum * (0.35 + vAmp * 1.4);
    col += hue * grid * (0.55 + vAmp * 2.6);
    col += hue * vAmp * vAmp * 0.9;
    col += uAcid * uBass * grid * 0.6 * (1.0 - vDepth);

    float fog = smoothstep(0.25, 0.98, vDepth);
    col = mix(col, uNight, fog);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const sparkVertex = /* glsl */ `
  ${bend}
  uniform float uTravel;
  uniform float uPixelRatio;
  attribute vec4 aSeed; // angle, radius, phase, size
  varying float vFade;
  varying float vHue;

  void main() {
    float z = -mod(aSeed.z * ${TUNNEL_LENGTH.toFixed(1)} - uTravel * 1.4, ${TUNNEL_LENGTH.toFixed(1)});
    float a = aSeed.x + uTime * 0.12 * (aSeed.w > 0.5 ? 1.0 : -1.0);
    vec3 p = vec3(cos(a) * aSeed.y, sin(a) * aSeed.y, z);
    p.xy += bend(z);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.0 + aSeed.w * 2.5) * uPixelRatio * 18.0 / max(0.5, -mv.z);
    float d = -z / ${TUNNEL_LENGTH.toFixed(1)};
    vFade = smoothstep(0.0, 0.04, d) * (1.0 - smoothstep(0.45, 0.95, d));
    vHue = aSeed.w;
  }
`;

export const sparkFragment = /* glsl */ `
  uniform vec3 uAcid;
  uniform vec3 uCoral;
  uniform vec3 uCyan;
  varying float vFade;
  varying float vHue;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.0, length(c));
    vec3 col = vHue < 0.33 ? uAcid : (vHue < 0.66 ? uCoral : uCyan);
    gl_FragColor = vec4(col * 1.6, a * vFade);
    #include <colorspace_fragment>
  }
`;
