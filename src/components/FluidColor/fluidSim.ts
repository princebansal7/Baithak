// WebGL2 Navier-Stokes GPU fluid simulation
// Implements Jos Stam "Stable Fluids" on the GPU via ping-pong framebuffers

type GL2 = WebGL2RenderingContext;

// ─── Shader sources ────────────────────────────────────────────────────────

const BASE_VERT = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 texelSize;
void main() {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const CLEAR_FRAG = `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 fc;
uniform sampler2D uTexture;
uniform float value;
void main() { fc = value * texture(uTexture, vUv); }`;

const DISPLAY_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fc;
uniform sampler2D uTexture;
uniform vec3  uBgColor;
uniform float uDark;    // 1.0 = dark mode, 0.0 = light mode
void main() {
    vec3 ink = texture(uTexture, vUv).rgb;
    float mx  = max(ink.r, max(ink.g, ink.b));

    // Lower threshold so thin mixed zones are visible (0.05 vs old 0.14)
    float inkAmt = smoothstep(0.0, 0.05, mx);

    // Dark mode: boost saturation slightly, keep raw luminance depth
    vec3 rawNorm = mx > 0.001 ? ink / mx : vec3(0.0);
    float lum    = dot(rawNorm, vec3(0.299, 0.587, 0.114));
    vec3 darkInk = clamp(mix(vec3(lum), rawNorm, 1.25), 0.0, 1.0);

    // Light mode: always normalise to pure hue so diluted edges stay vivid,
    // not dark. The lerp dye splat already encodes the correct blended hue
    // (red+green = yellow) so dividing by mx shows the right mixed colour.
    vec3 lightInk = mx > 0.001 ? clamp(ink / mx, 0.0, 1.0) : uBgColor;

    vec3 inkColor = mix(lightInk, darkInk, uDark);

    vec3 c = mix(uBgColor, inkColor, inkAmt);

    // Edge fade — narrow 2% band just to soften the hard canvas border
    vec2 edge = min(vUv, 1.0 - vUv);
    float fade = smoothstep(0.0, 0.02, min(edge.x, edge.y));
    c = mix(uBgColor, c, fade);

    fc = vec4(c, 1.0);
}`;

// Zeros velocity within a few texels of any edge → no-slip wall boundary
const BOUNDARY_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fc;
uniform sampler2D uVelocity;
uniform vec2 texelSize;
void main() {
    vec2 edge = min(vUv, 1.0 - vUv);
    float mask = smoothstep(0.0, 3.0 * texelSize.x, edge.x) *
                 smoothstep(0.0, 3.0 * texelSize.y, edge.y);
    fc = vec4(texture(uVelocity, vUv).xy * mask, 0.0, 1.0);
}`;

// Velocity splat — purely additive so fluid physics are preserved
const SPLAT_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fc;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main() {
    vec2 p = vUv - point;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    fc = vec4(texture(uTarget, vUv).xyz + splat, 1.0);
}`;

// Dye splat — lerp-based so painting one colour over another blends them
const DYE_SPLAT_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fc;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main() {
    vec2 p = vUv - point;
    p.x *= aspectRatio;
    float amt = clamp(exp(-dot(p, p) / radius), 0.0, 1.0);
    vec3 existing = texture(uTarget, vUv).rgb;
    fc = vec4(mix(existing, color, amt * 0.92), 1.0);
}`;

// Laplacian diffusion — spreads mixed zones each frame
const DIFFUSION_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB;
out vec4 fc;
uniform sampler2D uTexture;
uniform float diffusion;
void main() {
    vec3 c = texture(uTexture, vUv).rgb;
    vec3 l = texture(uTexture, vL).rgb;
    vec3 r = texture(uTexture, vR).rgb;
    vec3 t = texture(uTexture, vT).rgb;
    vec3 b = texture(uTexture, vB).rgb;
    fc = vec4(c + diffusion * (l + r + t + b - 4.0 * c), 1.0);
}`;

const ADVECTION_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fc;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;
void main() {
    vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
    fc = dissipation * texture(uSource, coord);
    fc.a = 1.0;
}`;

const DIVERGENCE_FRAG = `#version 300 es
precision mediump float;
in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB;
out vec4 fc;
uniform sampler2D uVelocity;
void main() {
    float L = texture(uVelocity, vL).x;
    float R = texture(uVelocity, vR).x;
    float T = texture(uVelocity, vT).y;
    float B = texture(uVelocity, vB).y;
    fc = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

const CURL_FRAG = `#version 300 es
precision mediump float;
in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB;
out vec4 fc;
uniform sampler2D uVelocity;
void main() {
    float L = texture(uVelocity, vL).y;
    float R = texture(uVelocity, vR).y;
    float T = texture(uVelocity, vT).x;
    float B = texture(uVelocity, vB).x;
    fc = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

const VORTICITY_FRAG = `#version 300 es
precision highp float;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB;
out vec4 fc;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main() {
    float L = texture(uCurl, vL).x;
    float R = texture(uCurl, vR).x;
    float T = texture(uCurl, vT).x;
    float B = texture(uCurl, vB).x;
    float C = texture(uCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 1e-5;
    force *= curl * C;
    force.y *= -1.0;
    vec2 vel = texture(uVelocity, vUv).xy;
    fc = vec4(vel + force * dt, 0.0, 1.0);
}`;

const PRESSURE_FRAG = `#version 300 es
precision mediump float;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB;
out vec4 fc;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
    float L = texture(uPressure, vL).x;
    float R = texture(uPressure, vR).x;
    float T = texture(uPressure, vT).x;
    float B = texture(uPressure, vB).x;
    float C = texture(uDivergence, vUv).x;
    fc = vec4((L + R + B + T - C) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRADIENT_FRAG = `#version 300 es
precision mediump float;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB;
out vec4 fc;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
    float L = texture(uPressure, vL).x;
    float R = texture(uPressure, vR).x;
    float T = texture(uPressure, vT).x;
    float B = texture(uPressure, vB).x;
    vec2 vel = texture(uVelocity, vUv).xy;
    fc = vec4(vel - vec2(R - L, T - B), 0.0, 1.0);
}`;

// ─── Program helpers ────────────────────────────────────────────────────────

function compile(gl: GL2, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s) ?? 'Shader compile error');
  return s;
}

function link(gl: GL2, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.bindAttribLocation(p, 0, 'aPosition');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(p) ?? 'Program link error');
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return p;
}

function collectUniforms(gl: GL2, prog: WebGLProgram): Record<string, WebGLUniformLocation> {
  const u: Record<string, WebGLUniformLocation> = {};
  const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(prog, i)!;
    const loc = gl.getUniformLocation(prog, info.name);
    if (loc) u[info.name] = loc;
  }
  return u;
}

class Prog {
  readonly prog: WebGLProgram;
  readonly u: Record<string, WebGLUniformLocation>;
  constructor(private gl: GL2, fragSrc: string) {
    this.prog = link(gl, compile(gl, gl.VERTEX_SHADER, BASE_VERT), compile(gl, gl.FRAGMENT_SHADER, fragSrc));
    this.u = collectUniforms(gl, this.prog);
  }
  bind() { this.gl.useProgram(this.prog); }
}

// ─── FBO helpers ────────────────────────────────────────────────────────────

interface FBO {
  tex: WebGLTexture;
  fbo: WebGLFramebuffer;
  w: number; h: number;
  sx: number; sy: number; // texel sizes
  attach(unit: number): number;
}

interface DFBO {
  read: FBO;
  write: FBO;
  swap(): void;
  w: number; h: number;
  sx: number; sy: number;
}

function makeFBO(gl: GL2, w: number, h: number,
  iFmt: number, fmt: number, type: number, filter: number): FBO {
  const tex = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, iFmt, w, h, 0, fmt, type, null);
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.viewport(0, 0, w, h);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return {
    tex, fbo, w, h, sx: 1 / w, sy: 1 / h,
    attach(unit) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); return unit; },
  };
}

function makeDFBO(gl: GL2, w: number, h: number,
  iFmt: number, fmt: number, type: number, filter: number): DFBO {
  let a = makeFBO(gl, w, h, iFmt, fmt, type, filter);
  let b = makeFBO(gl, w, h, iFmt, fmt, type, filter);
  return {
    get read() { return a; },
    get write() { return b; },
    swap() { [a, b] = [b, a]; },
    w, h, sx: a.sx, sy: a.sy,
  };
}

// ─── Public types ───────────────────────────────────────────────────────────

export interface FluidConfig {
  simRes: number;
  dyeRes: number;
  densityDissipation: number;
  velocityDissipation: number;
  pressureIterations: number;
  curl: number;
  splatRadius: number;
  splatForce: number;
  dyeDiffusion: number;
  bgColor: [number, number, number];
  isDark: boolean;
}

export interface Splat {
  x: number; y: number;   // 0-1 normalized canvas coords
  dx: number; dy: number; // velocity
  color: [number, number, number]; // RGB 0-1
  radius?: number;
}

// ─── Main class ─────────────────────────────────────────────────────────────

export class FluidSim {
  private canvas!: HTMLCanvasElement;
  private gl!: GL2;

  private clearProg!: Prog;
  private displayProg!: Prog;
  private splatProg!: Prog;
  private dyeSplatProg!: Prog;
  private diffProg!: Prog;
  private advProg!: Prog;
  private divProg!: Prog;
  private curlProg!: Prog;
  private vortProg!: Prog;
  private presProg!: Prog;
  private gradProg!: Prog;
  private boundaryProg!: Prog;

  private vel!: DFBO;
  private dye!: DFBO;
  private pres!: DFBO;
  private div!: FBO;
  private curl!: FBO;

  private vao!: WebGLVertexArrayObject;
  private animId: number | null = null;
  private lastTime = 0;

  config: FluidConfig = {
    simRes: 128,
    dyeRes: 512,
    densityDissipation: 0.9997,
    velocityDissipation: 0.99,
    pressureIterations: 20,
    curl: 18,
    splatRadius: 0.09,
    splatForce: 2500,
    dyeDiffusion: 0.06,  // Laplacian spread per frame (<0.25 for stability)
    bgColor: [0.016, 0.012, 0.047],
    isDark: true,
  };

  /** Returns false if WebGL2 or float textures are not supported */
  init(canvas: HTMLCanvasElement): boolean {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: false, depth: false, stencil: false, antialias: false,
      preserveDrawingBuffer: true, // needed for readPixels in challenge mode
    }) as GL2 | null;
    if (!gl) return false;
    this.gl = gl;

    // Required for rendering to float FBOs
    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');

    gl.clearColor(0, 0, 0, 1);
    gl.disable(gl.BLEND);

    try {
      this.buildProgs();
    } catch (e) {
      console.error('[FluidSim] Shader build failed:', e);
      return false;
    }
    this.buildQuad();
    this.resizeFBOs();
    return true;
  }

  private buildProgs() {
    const g = this.gl;
    this.clearProg    = new Prog(g, CLEAR_FRAG);
    this.displayProg  = new Prog(g, DISPLAY_FRAG);
    this.splatProg    = new Prog(g, SPLAT_FRAG);
    this.dyeSplatProg = new Prog(g, DYE_SPLAT_FRAG);
    this.diffProg     = new Prog(g, DIFFUSION_FRAG);
    this.advProg      = new Prog(g, ADVECTION_FRAG);
    this.divProg      = new Prog(g, DIVERGENCE_FRAG);
    this.curlProg     = new Prog(g, CURL_FRAG);
    this.vortProg     = new Prog(g, VORTICITY_FRAG);
    this.presProg     = new Prog(g, PRESSURE_FRAG);
    this.gradProg     = new Prog(g, GRADIENT_FRAG);
    this.boundaryProg = new Prog(g, BOUNDARY_FRAG);
  }

  private buildQuad() {
    const gl = this.gl;
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  private simSize() {
    const a = this.canvas.width / this.canvas.height;
    return a > 1
      ? { w: Math.round(this.config.simRes * a), h: this.config.simRes }
      : { w: this.config.simRes, h: Math.round(this.config.simRes / a) };
  }

  private dyeSize() {
    const a = this.canvas.width / this.canvas.height;
    return a > 1
      ? { w: Math.round(this.config.dyeRes * a), h: this.config.dyeRes }
      : { w: this.config.dyeRes, h: Math.round(this.config.dyeRes / a) };
  }

  private resizeFBOs() {
    const gl = this.gl;
    const { w: sw, h: sh } = this.simSize();
    const { w: dw, h: dh } = this.dyeSize();
    const HF = gl.HALF_FLOAT;
    const L  = gl.LINEAR;
    const N  = gl.NEAREST;
    this.vel  = makeDFBO(gl, sw, sh, gl.RG16F,   gl.RG,   HF, L);
    this.dye  = makeDFBO(gl, dw, dh, gl.RGBA16F, gl.RGBA, HF, L);
    this.pres = makeDFBO(gl, sw, sh, gl.R16F,    gl.RED,  HF, N);
    this.div  = makeFBO(gl,  sw, sh, gl.R16F,    gl.RED,  HF, N);
    this.curl = makeFBO(gl,  sw, sh, gl.R16F,    gl.RED,  HF, N);
  }

  resize() {
    const c = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w   = Math.round(c.clientWidth  * dpr);
    const h   = Math.round(c.clientHeight * dpr);
    if (c.width !== w || c.height !== h) {
      c.width  = w;
      c.height = h;
      this.resizeFBOs();
    }
  }

  private blit(target: FBO | null) {
    const gl = this.gl;
    if (target) {
      gl.viewport(0, 0, target.w, target.h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    } else {
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  }

  private step(dt: number) {
    const gl = this.gl;
    gl.disable(gl.BLEND);

    // Curl (vorticity)
    this.curlProg.bind();
    gl.uniform2f(this.curlProg.u.texelSize, this.vel.sx, this.vel.sy);
    gl.uniform1i(this.curlProg.u.uVelocity, this.vel.read.attach(0));
    this.blit(this.curl);

    // Vorticity confinement
    this.vortProg.bind();
    gl.uniform2f(this.vortProg.u.texelSize, this.vel.sx, this.vel.sy);
    gl.uniform1i(this.vortProg.u.uVelocity, this.vel.read.attach(0));
    gl.uniform1i(this.vortProg.u.uCurl, this.curl.attach(1));
    gl.uniform1f(this.vortProg.u.curl, this.config.curl);
    gl.uniform1f(this.vortProg.u.dt, dt);
    this.blit(this.vel.write);
    this.vel.swap();

    // Divergence
    this.divProg.bind();
    gl.uniform2f(this.divProg.u.texelSize, this.vel.sx, this.vel.sy);
    gl.uniform1i(this.divProg.u.uVelocity, this.vel.read.attach(0));
    this.blit(this.div);

    // Clear pressure (with damping instead of zero-clear for stability)
    this.clearProg.bind();
    gl.uniform1i(this.clearProg.u.uTexture, this.pres.read.attach(0));
    gl.uniform1f(this.clearProg.u.value, 0.8);
    this.blit(this.pres.write);
    this.pres.swap();

    // Pressure Jacobi iterations
    this.presProg.bind();
    gl.uniform2f(this.presProg.u.texelSize, this.vel.sx, this.vel.sy);
    gl.uniform1i(this.presProg.u.uDivergence, this.div.attach(0));
    for (let i = 0; i < this.config.pressureIterations; i++) {
      gl.uniform1i(this.presProg.u.uPressure, this.pres.read.attach(1));
      this.blit(this.pres.write);
      this.pres.swap();
    }

    // Gradient subtraction (project velocity to be divergence-free)
    this.gradProg.bind();
    gl.uniform2f(this.gradProg.u.texelSize, this.vel.sx, this.vel.sy);
    gl.uniform1i(this.gradProg.u.uPressure, this.pres.read.attach(0));
    gl.uniform1i(this.gradProg.u.uVelocity, this.vel.read.attach(1));
    this.blit(this.vel.write);
    this.vel.swap();

    // No-slip wall: zero velocity within 3 texels of every edge
    this.boundaryProg.bind();
    gl.uniform2f(this.boundaryProg.u.texelSize, this.vel.sx, this.vel.sy);
    gl.uniform1i(this.boundaryProg.u.uVelocity, this.vel.read.attach(0));
    this.blit(this.vel.write);
    this.vel.swap();

    // Advect velocity
    this.advProg.bind();
    gl.uniform2f(this.advProg.u.texelSize, this.vel.sx, this.vel.sy);
    gl.uniform1i(this.advProg.u.uVelocity, this.vel.read.attach(0));
    gl.uniform1i(this.advProg.u.uSource, this.vel.read.attach(0));
    gl.uniform1f(this.advProg.u.dt, dt);
    gl.uniform1f(this.advProg.u.dissipation, this.config.velocityDissipation);
    this.blit(this.vel.write);
    this.vel.swap();

    // Advect dye (color)
    this.advProg.bind();
    gl.uniform2f(this.advProg.u.texelSize, this.vel.sx, this.vel.sy);
    gl.uniform1i(this.advProg.u.uVelocity, this.vel.read.attach(0));
    gl.uniform1i(this.advProg.u.uSource, this.dye.read.attach(1));
    gl.uniform1f(this.advProg.u.dt, dt);
    gl.uniform1f(this.advProg.u.dissipation, this.config.densityDissipation);
    this.blit(this.dye.write);
    this.dye.swap();

    // Diffuse dye — spreads mixed zones so blended colours grow inward over time
    if (this.config.dyeDiffusion > 0) {
      this.diffProg.bind();
      gl.uniform2f(this.diffProg.u.texelSize, this.dye.sx, this.dye.sy);
      gl.uniform1f(this.diffProg.u.diffusion, this.config.dyeDiffusion);
      gl.uniform1i(this.diffProg.u.uTexture, this.dye.read.attach(0));
      this.blit(this.dye.write);
      this.dye.swap();
    }
  }

  private render() {
    const gl = this.gl;
    this.displayProg.bind();
    const bg = this.config.bgColor;
    gl.uniform3f(this.displayProg.u.uBgColor, bg[0], bg[1], bg[2]);
    gl.uniform1f(this.displayProg.u.uDark, this.config.isDark ? 1.0 : 0.0);
    gl.uniform1i(this.displayProg.u.uTexture, this.dye.read.attach(0));
    this.blit(null);
  }

  // ── Public interaction API ──────────────────────────────────────────────

  splat(s: Splat) {
    const gl = this.gl;
    gl.disable(gl.BLEND);
    const aspect = this.canvas.width / this.canvas.height;
    const radius = ((s.radius ?? this.config.splatRadius) / 100);

    // Velocity splat — additive so fluid physics are correct
    this.splatProg.bind();
    gl.uniform1f(this.splatProg.u.aspectRatio, aspect);
    gl.uniform2f(this.splatProg.u.point, s.x, 1 - s.y);
    gl.uniform1f(this.splatProg.u.radius, radius);
    gl.uniform1i(this.splatProg.u.uTarget, this.vel.read.attach(0));
    gl.uniform3f(this.splatProg.u.color,
      s.dx * this.config.splatForce,
      -s.dy * this.config.splatForce, 0);
    this.blit(this.vel.write);
    this.vel.swap();

    // Dye splat — lerp so painting one colour over another blends them
    this.dyeSplatProg.bind();
    gl.uniform1f(this.dyeSplatProg.u.aspectRatio, aspect);
    gl.uniform2f(this.dyeSplatProg.u.point, s.x, 1 - s.y);
    gl.uniform1f(this.dyeSplatProg.u.radius, radius);
    gl.uniform1i(this.dyeSplatProg.u.uTarget, this.dye.read.attach(0));
    gl.uniform3f(this.dyeSplatProg.u.color, s.color[0], s.color[1], s.color[2]);
    this.blit(this.dye.write);
    this.dye.swap();
  }

  /** Radial burst in all directions */
  explosion(x: number, y: number, color: [number, number, number]) {
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const f = 0.5 + Math.random() * 0.5;
      this.splat({ x, y, dx: Math.cos(a) * f, dy: Math.sin(a) * f, color, radius: 0.55 });
    }
  }

  /** Color particles falling from the top */
  rain(color: [number, number, number]) {
    for (let i = 0; i < 10; i++) {
      this.splat({ x: Math.random(), y: 0.02, dx: (Math.random() - 0.5) * 0.2, dy: 0.6, color, radius: 0.12 });
    }
  }

  /** Sweeping horizontal or vertical wave */
  wave(angleRad: number, color: [number, number, number]) {
    const n = 12;
    const perp = angleRad + Math.PI / 2;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const px = 0.5 + Math.cos(perp) * (t - 0.5) * 1.8;
      const py = 0.5 + Math.sin(perp) * (t - 0.5) * 1.8;
      this.splat({
        x: Math.max(0.01, Math.min(0.99, px)),
        y: Math.max(0.01, Math.min(0.99, py)),
        dx: Math.cos(angleRad) * 0.6,
        dy: Math.sin(angleRad) * 0.6,
        color, radius: 0.35,
      });
    }
  }

  /** Erase by lerping dye toward zero */
  erase(x: number, y: number) {
    this.splat({ x, y, dx: 0, dy: 0, color: [0, 0, 0], radius: 0.6 });
  }

  /** Clear dye and velocity to zero */
  clearCanvas() {
    const gl = this.gl;
    this.clearProg.bind();
    gl.uniform1f(this.clearProg.u.value, 0);
    gl.uniform1i(this.clearProg.u.uTexture, this.dye.read.attach(0));
    this.blit(this.dye.write); this.dye.swap();
    gl.uniform1i(this.clearProg.u.uTexture, this.vel.read.attach(0));
    this.blit(this.vel.write); this.vel.swap();
    gl.uniform1i(this.clearProg.u.uTexture, this.pres.read.attach(0));
    this.blit(this.pres.write); this.pres.swap();
  }

  /** Scatter random color splats for a lively start */
  scatter(colors: [number, number, number][]) {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const x = 0.1 + Math.random() * 0.8;
      const y = 0.1 + Math.random() * 0.8;
      const a = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 0.4;
      this.splat({ x, y, dx: Math.cos(a) * speed, dy: Math.sin(a) * speed, color, radius: 0.18 });
    }
  }

  start() {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - this.lastTime) / 1000, 0.016667);
      this.lastTime = now;
      this.resize();
      this.step(dt);
      this.render();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animId !== null) { cancelAnimationFrame(this.animId); this.animId = null; }
  }

  /** Sample average color from 5 screen points for challenge scoring */
  averageColor(): [number, number, number] {
    const gl = this.gl;
    const w = this.canvas.width, h = this.canvas.height;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const pts = [[0.3, 0.3], [0.5, 0.5], [0.7, 0.7], [0.3, 0.7], [0.7, 0.3]];
    let r = 0, g = 0, b = 0;
    for (const [px, py] of pts) {
      const pix = new Uint8Array(4);
      gl.readPixels(Math.floor(px * w), Math.floor((1 - py) * h), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pix);
      r += pix[0] / 255; g += pix[1] / 255; b += pix[2] / 255;
    }
    const n = pts.length;
    return [r / n, g / n, b / n];
  }

  destroy() {
    this.stop();
  }
}
