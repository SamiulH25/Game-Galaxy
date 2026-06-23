/**
 * Neon Siege — WebGL2 renderer (direct-to-screen with additive glow)
 */
window.NeonRenderer = (function() {

  var FS_VERT = [
    '#version 300 es',
    'in vec2 aPos;',
    'out vec2 vUV;',
    'void main() {',
    '  vUV = aPos * 0.5 + 0.5;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var GRID_FRAG = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUV;',
    'uniform float uTime;',
    'uniform vec2 uResolution;',
    'out vec4 fragColor;',
    'void main() {',
    '  vec2 uv = vUV;',
    '  vec2 grid = abs(fract(uv * 24.0 - 0.5) - 0.5) / fwidth(uv * 24.0);',
    '  float line = 1.0 - min(min(grid.x, grid.y), 1.0);',
    '  line = pow(line, 1.5);',
    '  float pulse = 0.5 + 0.5 * sin(uTime * 1.2 + uv.x * 6.0 + uv.y * 4.0);',
    '  vec3 base = vec3(0.01, 0.04, 0.06);',
    '  vec3 gridCol = mix(vec3(0.0, 0.35, 0.45), vec3(0.4, 0.0, 0.5), uv.y);',
    '  vec3 col = base + gridCol * line * (0.15 + 0.1 * pulse);',
    '  col *= 1.0 - length(uv - 0.5) * 0.9;',
    '  col *= 0.95 + 0.05 * sin(uv.y * uResolution.y * 1.5 + uTime * 8.0);',
    '  fragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  var ENTITY_VERT = [
    '#version 300 es',
    'in vec2 aPos;',
    'in vec2 aOffset;',
    'in vec2 aScale;',
    'in float aRot;',
    'in vec4 aColor;',
    'uniform vec2 uResolution;',
    'out vec4 vColor;',
    'out vec2 vLocal;',
    'void main() {',
    '  float c = cos(aRot), s = sin(aRot);',
    '  vec2 local = aPos * aScale;',
    '  vec2 rotated = vec2(local.x * c - local.y * s, local.x * s + local.y * c);',
    '  vec2 world = aOffset + rotated;',
    '  vec2 clip = (world / uResolution) * 2.0 - 1.0;',
    '  clip.y = -clip.y;',
    '  gl_Position = vec4(clip, 0.0, 1.0);',
    '  vColor = aColor;',
    '  vLocal = aPos;',
    '}'
  ].join('\n');

  var ENTITY_FRAG = [
    '#version 300 es',
    'precision highp float;',
    'in vec4 vColor;',
    'in vec2 vLocal;',
    'out vec4 fragColor;',
    'void main() {',
    '  float d = length(vLocal);',
    '  if (d > 1.0) discard;',
    '  float core = 1.0 - smoothstep(0.3, 1.0, d);',
    '  float glow = exp(-d * 2.5) * 0.8;',
    '  vec3 col = vColor.rgb * (core + glow);',
    '  float alpha = (core + glow * 0.5) * vColor.a;',
    '  fragColor = vec4(col, alpha);',
    '}'
  ].join('\n');

  var PARTICLE_VERT = [
    '#version 300 es',
    'in vec2 aPos;',
    'in vec2 aVel;',
    'in float aLife;',
    'in float aMaxLife;',
    'in vec4 aColor;',
    'uniform vec2 uResolution;',
    'out vec4 vColor;',
    'out float vLife;',
    'void main() {',
    '  float t = 1.0 - aLife / aMaxLife;',
    '  vec2 pos = aPos + aVel * t * t * 80.0;',
    '  vec2 clip = (pos / uResolution) * 2.0 - 1.0;',
    '  clip.y = -clip.y;',
    '  gl_Position = vec4(clip, 0.0, 1.0);',
    '  gl_PointSize = mix(6.0, 1.0, t) * aColor.a;',
    '  vColor = aColor;',
    '  vLife = 1.0 - t;',
    '}'
  ].join('\n');

  var PARTICLE_FRAG = [
    '#version 300 es',
    'precision highp float;',
    'in vec4 vColor;',
    'in float vLife;',
    'out vec4 fragColor;',
    'void main() {',
    '  vec2 uv = gl_PointCoord * 2.0 - 1.0;',
    '  float d = length(uv);',
    '  if (d > 1.0) discard;',
    '  float alpha = (1.0 - d) * vLife * vColor.a;',
    '  fragColor = vec4(vColor.rgb * 2.0, alpha);',
    '}'
  ].join('\n');

  var LINE_VERT = [
    '#version 300 es',
    'in vec2 aPos;',
    'in vec4 aColor;',
    'uniform vec2 uResolution;',
    'out vec4 vColor;',
    'void main() {',
    '  vec2 clip = (aPos / uResolution) * 2.0 - 1.0;',
    '  clip.y = -clip.y;',
    '  gl_Position = vec4(clip, 0.0, 1.0);',
    '  vColor = aColor;',
    '}'
  ].join('\n');

  var LINE_FRAG = [
    '#version 300 es',
    'precision highp float;',
    'in vec4 vColor;',
    'out vec4 fragColor;',
    'void main() { fragColor = vColor; }'
  ].join('\n');

  var FLASH_FRAG = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUV;',
    'uniform float uFlash;',
    'uniform vec3 uFlashColor;',
    'out vec4 fragColor;',
    'void main() {',
    '  float f = uFlash * (1.0 - length(vUV - 0.5) * 0.5);',
    '  fragColor = vec4(uFlashColor * f, f);',
    '}'
  ].join('\n');

  function compile(gl, type, src, label) {
    if (!src) throw new Error('Missing shader source: ' + label);
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(s) || 'unknown compile error';
      gl.deleteShader(s);
      throw new Error('Shader compile failed (' + label + '): ' + log);
    }
    return s;
  }

  function link(gl, vs, fs, label) {
    var p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      var log = gl.getProgramInfoLog(p) || 'unknown link error';
      gl.deleteProgram(p);
      throw new Error('Program link failed (' + label + '): ' + log);
    }
    return p;
  }

  function makeProgram(gl, vert, frag, label) {
    return link(
      gl,
      compile(gl, gl.VERTEX_SHADER, vert, label + '.vert'),
      compile(gl, gl.FRAGMENT_SHADER, frag, label + '.frag'),
      label
    );
  }

  var TRI_VERTS = new Float32Array([0, -1, 0.866, 0.5, -0.866, 0.5]);

  function NeonRenderer(canvas) {
    var gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 required');
    this.gl = gl;
    this.canvas = canvas;
    this.w = 1;
    this.h = 1;
    this.time = 0;
    this.flash = 0;
    this.flashColor = [1, 1, 1];

    this.progGrid = makeProgram(gl, FS_VERT, GRID_FRAG, 'grid');
    this.progEntity = makeProgram(gl, ENTITY_VERT, ENTITY_FRAG, 'entity');
    this.progParticle = makeProgram(gl, PARTICLE_VERT, PARTICLE_FRAG, 'particle');
    this.progLine = makeProgram(gl, LINE_VERT, LINE_FRAG, 'line');
    this.progFlash = makeProgram(gl, FS_VERT, FLASH_FRAG, 'flash');

    var fsBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fsBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,-1, 1,1, -1,1]), gl.STATIC_DRAW);
    this.fsBuf = fsBuf;

    var triBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
    gl.bufferData(gl.ARRAY_BUFFER, TRI_VERTS, gl.STATIC_DRAW);
    this.triBuf = triBuf;

    this.entityData = new Float32Array(16384);
    this.lineData = new Float32Array(8192);
    this.particleData = new Float32Array(12288);
    this.entityCount = 0;
    this.lineVertCount = 0;
    this.particleCount = 0;
  }

  NeonRenderer.prototype.resize = function(w, h) {
    this.w = w;
    this.h = h;
    this.canvas.width = w;
    this.canvas.height = h;
  };

  NeonRenderer.prototype.clearBatches = function() {
    this.entityCount = 0;
    this.lineVertCount = 0;
    this.particleCount = 0;
  };

  NeonRenderer.prototype._pushEntity = function(x, y, sx, sy, rot, r, g, b, a) {
    var i = this.entityCount * 9;
    if (i + 9 > this.entityData.length) return;
    var d = this.entityData;
    d[i] = x; d[i+1] = y; d[i+2] = sx; d[i+3] = sy; d[i+4] = rot;
    d[i+5] = r; d[i+6] = g; d[i+7] = b; d[i+8] = a;
    this.entityCount++;
  };

  NeonRenderer.prototype.drawTriangle = function(x, y, size, rot, r, g, b, a) {
    this._pushEntity(x, y, size, size, rot, r, g, b, a || 1);
  };

  NeonRenderer.prototype.drawCircle = function(x, y, radius, r, g, b, a) {
    this._pushEntity(x, y, radius, radius, 0, r, g, b, a || 1);
  };

  NeonRenderer.prototype.drawLine = function(x1, y1, x2, y2, r, g, b, a) {
    var i = this.lineVertCount * 6;
    if (i + 12 > this.lineData.length) return;
    var d = this.lineData;
    d[i]=x1; d[i+1]=y1; d[i+2]=r; d[i+3]=g; d[i+4]=b; d[i+5]=a||1;
    d[i+6]=x2; d[i+7]=y2; d[i+8]=r; d[i+9]=g; d[i+10]=b; d[i+11]=a||1;
    this.lineVertCount += 2;
  };

  NeonRenderer.prototype.drawParticle = function(x, y, vx, vy, life, maxLife, r, g, b, a) {
    var i = this.particleCount * 10;
    if (i + 10 > this.particleData.length) return;
    var d = this.particleData;
    d[i]=x; d[i+1]=y; d[i+2]=vx; d[i+3]=vy;
    d[i+4]=life; d[i+5]=maxLife; d[i+6]=r; d[i+7]=g; d[i+8]=b; d[i+9]=a||1;
    this.particleCount++;
  };

  NeonRenderer.prototype._drawFullscreen = function(prog) {
    var gl = this.gl;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fsBuf);
    var loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  NeonRenderer.prototype.render = function() {
    var gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.w, this.h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.progGrid);
    gl.uniform1f(gl.getUniformLocation(this.progGrid, 'uTime'), this.time);
    gl.uniform2f(gl.getUniformLocation(this.progGrid, 'uResolution'), this.w, this.h);
    this._drawFullscreen(this.progGrid);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    if (this.lineVertCount > 0) {
      gl.useProgram(this.progLine);
      gl.uniform2f(gl.getUniformLocation(this.progLine, 'uResolution'), this.w, this.h);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, this.lineData.subarray(0, this.lineVertCount * 6), gl.DYNAMIC_DRAW);
      var stride = 24;
      var aPos = gl.getAttribLocation(this.progLine, 'aPos');
      var aCol = gl.getAttribLocation(this.progLine, 'aColor');
      gl.enableVertexAttribArray(aPos);
      gl.enableVertexAttribArray(aCol);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
      gl.vertexAttribPointer(aCol, 4, gl.FLOAT, false, stride, 8);
      gl.drawArrays(gl.LINES, 0, this.lineVertCount);
    }

    if (this.entityCount > 0) {
      gl.useProgram(this.progEntity);
      gl.uniform2f(gl.getUniformLocation(this.progEntity, 'uResolution'), this.w, this.h);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.triBuf);
      var triLoc = gl.getAttribLocation(this.progEntity, 'aPos');
      gl.enableVertexAttribArray(triLoc);
      gl.vertexAttribPointer(triLoc, 2, gl.FLOAT, false, 0, 0);

      var instBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.entityData.subarray(0, this.entityCount * 9), gl.DYNAMIC_DRAW);
      var iStride = 36;
      var attrs = ['aOffset', 'aScale', 'aRot', 'aColor'];
      var sizes = [2, 2, 1, 4];
      var offsets = [0, 2, 4, 5];
      for (var ai = 0; ai < attrs.length; ai++) {
        var loc = gl.getAttribLocation(this.progEntity, attrs[ai]);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, sizes[ai], gl.FLOAT, false, iStride, offsets[ai] * 4);
        gl.vertexAttribDivisor(loc, 1);
      }
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, this.entityCount);
      for (var aj = 0; aj < attrs.length; aj++) {
        gl.vertexAttribDivisor(gl.getAttribLocation(this.progEntity, attrs[aj]), 0);
      }
      gl.deleteBuffer(instBuf);
    }

    if (this.particleCount > 0) {
      gl.useProgram(this.progParticle);
      gl.uniform2f(gl.getUniformLocation(this.progParticle, 'uResolution'), this.w, this.h);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, this.particleData.subarray(0, this.particleCount * 10), gl.DYNAMIC_DRAW);
      var ps = 40;
      var pAttrs = [
        { name: 'aPos', size: 2, off: 0 },
        { name: 'aVel', size: 2, off: 2 },
        { name: 'aLife', size: 1, off: 4 },
        { name: 'aMaxLife', size: 1, off: 5 },
        { name: 'aColor', size: 4, off: 6 }
      ];
      for (var pi = 0; pi < pAttrs.length; pi++) {
        var pl = gl.getAttribLocation(this.progParticle, pAttrs[pi].name);
        gl.enableVertexAttribArray(pl);
        gl.vertexAttribPointer(pl, pAttrs[pi].size, gl.FLOAT, false, ps, pAttrs[pi].off * 4);
      }
      gl.drawArrays(gl.POINTS, 0, this.particleCount);
    }

    if (this.flash > 0.01) {
      gl.useProgram(this.progFlash);
      gl.uniform1f(gl.getUniformLocation(this.progFlash, 'uFlash'), this.flash);
      gl.uniform3fv(gl.getUniformLocation(this.progFlash, 'uFlashColor'), this.flashColor);
      this._drawFullscreen(this.progFlash);
    }

    gl.disable(gl.BLEND);
  };

  return NeonRenderer;
})();
