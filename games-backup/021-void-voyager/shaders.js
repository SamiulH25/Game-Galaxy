// Void Voyager - WebGL2 Shaders

const ShaderSources = {
    basicVertex: `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aNormal;
in vec3 aColor;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;

out vec3 vColor;
out vec3 vNormal;
out vec3 vWorldPos;

void main() {
    vec4 worldPos = uModel * vec4(aPosition, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(uNormalMatrix * aNormal);
    vColor = aColor;
    gl_Position = uProjection * uView * worldPos;
}
`,

    basicFragment: `#version 300 es
precision highp float;

in vec3 vColor;
in vec3 vNormal;
in vec3 vWorldPos;

uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbientColor;
uniform vec3 uCameraPos;
uniform float uEmissive;

out vec4 fragColor;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightDir);
    
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * uLightColor;
    
    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specular = spec * uLightColor * 0.5;
    
    vec3 ambient = uAmbientColor;
    
    vec3 result = (ambient + diffuse + specular) * vColor;
    result = mix(result, vColor, uEmissive);
    
    fragColor = vec4(result, 1.0);
}
`,

    particleVertex: `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aColor;
in float aSize;
in float aLife;

uniform mat4 uView;
uniform mat4 uProjection;
uniform vec3 uCameraPos;

out vec3 vColor;
out float vLife;

void main() {
    vColor = aColor;
    vLife = aLife;
    
    vec4 viewPos = uView * vec4(aPosition, 1.0);
    gl_Position = uProjection * viewPos;
    gl_PointSize = aSize * (300.0 / -viewPos.z);
}
`,

    particleFragment: `#version 300 es
precision highp float;

in vec3 vColor;
in float vLife;

out vec4 fragColor;

void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    if (dist > 0.5) discard;
    
    float alpha = smoothstep(0.5, 0.0, dist) * vLife;
    fragColor = vec4(vColor * 1.5, alpha);
}
`,

    skyVertex: `#version 300 es
precision highp float;

in vec3 aPosition;

uniform mat4 uView;
uniform mat4 uProjection;

out vec3 vPosition;

void main() {
    vPosition = aPosition;
    mat4 viewNoTranslation = mat4(mat3(uView));
    vec4 pos = uProjection * viewNoTranslation * vec4(aPosition * 500.0, 1.0);
    gl_Position = pos.xyww;
}
`,

    skyFragment: `#version 300 es
precision highp float;

in vec3 vPosition;

out vec4 fragColor;

void main() {
    vec3 dir = normalize(vPosition);
    float y = dir.y * 0.5 + 0.5;
    
    vec3 bottom = vec3(0.02, 0.02, 0.05);
    vec3 middle = vec3(0.05, 0.03, 0.08);
    vec3 top = vec3(0.08, 0.04, 0.12);
    
    vec3 color = mix(bottom, middle, smoothstep(0.0, 0.5, y));
    color = mix(color, top, smoothstep(0.5, 1.0, y));
    
    float stars = step(0.998, fract(sin(dot(dir.xz, vec2(12.9898, 78.233))) * 43758.5453));
    color += stars * vec3(0.8, 0.8, 1.0);
    
    fragColor = vec4(color, 1.0);
}
`
};

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    
    if (!vertexShader || !fragmentShader) return null;
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    
    return program;
}