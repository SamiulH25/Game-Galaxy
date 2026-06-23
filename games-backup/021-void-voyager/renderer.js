// Void Voyager - WebGL2 Renderer

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2', {
            antialias: true,
            alpha: false,
            premultipliedAlpha: false
        });
        
        if (!this.gl) {
            throw new Error('WebGL2 not supported');
        }
        
        this.programs = {};
        this.meshes = {};
        this.buffers = {};
        
        this.projection = mat4.create();
        this.view = mat4.create();
        this.model = mat4.create();
        this.normalMatrix = mat3.create();
        
        this.cameraPos = [0, 0, 10];
        this.cameraTarget = [0, 0, 0];
        this.cameraUp = [0, 1, 0];
        
        this.init();
    }
    
    init() {
        const gl = this.gl;
        
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0.02, 0.02, 0.05, 1.0);
        
        this.programs.basic = createProgram(gl, ShaderSources.basicVertex, ShaderSources.basicFragment);
        this.programs.particle = createProgram(gl, ShaderSources.particleVertex, ShaderSources.particleFragment);
        this.programs.sky = createProgram(gl, ShaderSources.skyVertex, ShaderSources.skyFragment);
        
        this.meshes.cube = this.createCubeMesh();
        this.meshes.pyramid = this.createPyramidMesh();
        this.meshes.skybox = this.createSkyboxMesh();
        
        this.particleBuffer = gl.createBuffer();
    }
    
    createCubeMesh() {
        const gl = this.gl;
        
        const positions = [
            -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,
            -1, -1, -1,  -1,  1, -1,   1,  1, -1,   1, -1, -1,
            -1,  1, -1,  -1,  1,  1,   1,  1,  1,   1,  1, -1,
            -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,
             1, -1, -1,   1,  1, -1,   1,  1,  1,   1, -1,  1,
            -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1
        ];
        
        const normals = [
            0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
            0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
            0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
            0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
            1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
            -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0
        ];
        
        const indices = [
            0, 1, 2,    0, 2, 3,
            4, 5, 6,    4, 6, 7,
            8, 9, 10,   8, 10, 11,
            12, 13, 14, 12, 14, 15,
            16, 17, 18, 16, 18, 19,
            20, 21, 22, 20, 22, 23
        ];
        
        return this.createMesh(positions, normals, indices);
    }
    
    createPyramidMesh() {
        const gl = this.gl;
        
        const positions = [
            -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,
            -1, -1,  1,   1, -1,  1,   0,  1,  0,
             1, -1,  1,   1, -1, -1,   0,  1,  0,
             1, -1, -1,  -1, -1, -1,   0,  1,  0,
            -1, -1, -1,  -1, -1,  1,   0,  1,  0
        ];
        
        const normals = [
            0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
            0, 0.5, 1,  0, 0.5, 1,  0, 0.5, 1,
            1, 0.5, 0,  1, 0.5, 0,  1, 0.5, 0,
            0, 0.5, -1,  0, 0.5, -1,  0, 0.5, -1,
            -1, 0.5, 0,  -1, 0.5, 0,  -1, 0.5, 0
        ];
        
        const indices = [
            0, 1, 2,  0, 2, 3,
            4, 5, 6,
            7, 8, 9,
            10, 11, 12,
            13, 14, 15
        ];
        
        return this.createMesh(positions, normals, indices);
    }
    
    createSkyboxMesh() {
        const gl = this.gl;
        
        const positions = [
            -1, -1, -1,  -1,  1, -1,   1,  1, -1,   1, -1, -1,
            -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,
            -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1,
             1, -1, -1,   1,  1, -1,   1,  1,  1,   1, -1,  1,
            -1,  1, -1,  -1,  1,  1,   1,  1,  1,   1,  1, -1,
            -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1
        ];
        
        const indices = [
            0, 1, 2,  0, 2, 3,
            4, 5, 6,  4, 6, 7,
            8, 9, 10, 8, 10, 11,
            12, 13, 14, 12, 14, 15,
            16, 17, 18, 16, 18, 19,
            20, 21, 22, 20, 22, 23
        ];
        
        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        
        return {
            posBuffer,
            indexBuffer,
            indexCount: indices.length
        };
    }
    
    createMesh(positions, normals, indices) {
        const gl = this.gl;
        
        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
        
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        
        return {
            posBuffer,
            normalBuffer,
            indexBuffer,
            indexCount: indices.length
        };
    }
    
    resize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
            this.gl.viewport(0, 0, width, height);
        }
        
        const aspect = width / height;
        mat4.perspective(this.projection, Math.PI / 4, aspect, 0.1, 1000.0);
    }
    
    setCamera(pos, target, up = [0, 1, 0]) {
        this.cameraPos = pos;
        this.cameraTarget = target;
        this.cameraUp = up;
        mat4.lookAt(this.view, pos, target, up);
    }
    
    drawSkybox() {
        const gl = this.gl;
        const program = this.programs.sky;
        
        gl.useProgram(program);
        gl.depthFunc(gl.LEQUAL);
        
        const skyPos = gl.getAttribLocation(program, 'aPosition');
        const skyView = gl.getUniformLocation(program, 'uView');
        const skyProj = gl.getUniformLocation(program, 'uProjection');
        
        gl.uniformMatrix4fv(skyView, false, this.view);
        gl.uniformMatrix4fv(skyProj, false, this.projection);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.meshes.skybox.posBuffer);
        gl.enableVertexAttribArray(skyPos);
        gl.vertexAttribPointer(skyPos, 3, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.meshes.skybox.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.meshes.skybox.indexCount, gl.UNSIGNED_SHORT, 0);
        
        gl.depthFunc(gl.LESS);
    }
    
    drawMesh(mesh, position, rotation, scale, color, emissive = 0) {
        const gl = this.gl;
        const program = this.programs.basic;
        
        gl.useProgram(program);
        
        mat4.identity(this.model);
        mat4.translate(this.model, this.model, position);
        if (rotation) {
            mat4.rotateX(this.model, this.model, rotation[0]);
            mat4.rotateY(this.model, this.model, rotation[1]);
            mat4.rotateZ(this.model, this.model, rotation[2]);
        }
        if (scale) {
            mat4.scale(this.model, this.model, scale);
        }
        
        mat3.normalFromMat4(this.normalMatrix, this.model);
        
        const posLoc = gl.getAttribLocation(program, 'aPosition');
        const normLoc = gl.getAttribLocation(program, 'aNormal');
        const colorLoc = gl.getAttribLocation(program, 'aColor');
        
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.posBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
        gl.enableVertexAttribArray(normLoc);
        gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
        
        gl.vertexAttrib3f(colorLoc, color[0], color[1], color[2]);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModel'), false, this.model);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uView'), false, this.view);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjection'), false, this.projection);
        gl.uniformMatrix3fv(gl.getUniformLocation(program, 'uNormalMatrix'), false, this.normalMatrix);
        
        gl.uniform3f(gl.getUniformLocation(program, 'uLightDir'), 0.5, 1.0, 0.3);
        gl.uniform3f(gl.getUniformLocation(program, 'uLightColor'), 1.0, 0.95, 0.9);
        gl.uniform3f(gl.getUniformLocation(program, 'uAmbientColor'), 0.15, 0.12, 0.2);
        gl.uniform3fv(gl.getUniformLocation(program, 'uCameraPos'), this.cameraPos);
        gl.uniform1f(gl.getUniformLocation(program, 'uEmissive'), emissive);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
    }
    
    drawParticles(particles) {
        if (particles.length === 0) return;
        
        const gl = this.gl;
        const program = this.programs.particle;
        
        gl.useProgram(program);
        gl.depthMask(false);
        
        const data = new Float32Array(particles.length * 8);
        particles.forEach((p, i) => {
            const offset = i * 8;
            data[offset] = p.position[0];
            data[offset + 1] = p.position[1];
            data[offset + 2] = p.position[2];
            data[offset + 3] = p.color[0];
            data[offset + 4] = p.color[1];
            data[offset + 5] = p.color[2];
            data[offset + 6] = p.size;
            data[offset + 7] = p.life;
        });
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        
        const stride = 32;
        const posLoc = gl.getAttribLocation(program, 'aPosition');
        const colorLoc = gl.getAttribLocation(program, 'aColor');
        const sizeLoc = gl.getAttribLocation(program, 'aSize');
        const lifeLoc = gl.getAttribLocation(program, 'aLife');
        
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, stride, 0);
        
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, stride, 12);
        
        gl.enableVertexAttribArray(sizeLoc);
        gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, stride, 24);
        
        gl.enableVertexAttribArray(lifeLoc);
        gl.vertexAttribPointer(lifeLoc, 1, gl.FLOAT, false, stride, 28);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uView'), false, this.view);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjection'), false, this.projection);
        
        gl.drawArrays(gl.POINTS, 0, particles.length);
        
        gl.depthMask(true);
    }
    
    clear() {
        const gl = this.gl;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
}