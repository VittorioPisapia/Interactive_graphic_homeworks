export function createShader(gl, type, source) {
    const shader = gl.createShader(type); // with type = gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("error in compiling shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

export function initShaderProgram(gl, vsSource, fsSource) {
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("error in linking program:", gl.getProgramInfoLog(prog));
        return null;
    }
    return prog;
}

export function hexToGlColor(hex) {
    hex = hex.replace("#", "");

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    return [r, g, b];
}

export function generateSphere(radius = 1, segments = 32, rings = 16) {

    // Generates a sphere using polar coordinates. It creates (segment + 1) x (rings + 1) verteces along normals and indices. 
    
    const positions = []; 
    const normals = [];
    const indices = [];

    // polar coords parametrization 

    for (let j = 0; j <= rings; j++) {
        const v = j / rings;
        const theta = v * Math.PI; // from 0 to pi
        for (let i = 0; i <= segments; i++) {
            const u = i / segments;
            const phi = u * Math.PI * 2; // from 0 to 2pi

            const x = Math.cos(phi) * Math.sin(theta);
            const y = Math.cos(theta);
            const z = Math.sin(phi) * Math.sin(theta);

            positions.push(radius * x, radius * y, radius * z);
            normals.push(x, y, z);
        }
    }
    for (let j = 0; j < rings; j++) {
        for (let i = 0; i < segments; i++) {
                                                            // verteces matrix is (rings+1) row * (segments+1) * columns.
            const first = j * (segments + 1) + i;           // j * (segments + 1) skips all previous row, + i selects the current position in the current row
            const second = first + (segments + 1);          // (segments + 1) goes down by one row

            indices.push(first, second, first + 1, second, second + 1, first + 1);

            // indices.push(first, second);                 // if you want to draw better lines 
            // indices.push(first, first+1);

        }
    }
    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        indices: new Uint16Array(indices)
    };
}
