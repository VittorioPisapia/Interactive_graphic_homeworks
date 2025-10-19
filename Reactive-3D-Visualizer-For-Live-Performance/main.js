import { ensureAudioContext, audioContext, setAudioBuffer, setAudioStream, getBassStrength, audioVars } from './audio.js';
import { createShader, initShaderProgram, generateSphere, hexToGlColor } from './gl_utils.js';
import { updateMouseNDC } from './input.js';

window.mat4 = glMatrix.mat4;  // window global object
window.mat3 = glMatrix.mat3;
window.vec3 = glMatrix.vec3;

window.mainLightDirection = vec3.fromValues(0.5, 0.7, 1.0);
vec3.normalize(window.mainLightDirection, window.mainLightDirection);

window.onload = function() {
    const canvas = document.getElementById('visualizerCanvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const gl = canvas.getContext('webgl');

    const bg_color = hexToGlColor('#CCE5CC') //mint
    //const bg_color = hexToGlColor('#00FF00') //green screen
    const sphere_color = hexToGlColor('#99CCFF') //baby blue


    gl.viewport(0, 0, canvas.width, canvas.height); //draw area = all canvas
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(bg_color[0], bg_color[1], bg_color[2], 1.0);

    const mouseNDC = [2.0, 2.0];


    // ----------------------------------------------------------- UI ----------------------------------------------------------------------

    // DRAWMODE
    const select = document.getElementById("drawModeSelect");
    if (select) {
    select.addEventListener("change", () => {
        const val = select.value;
        if (val === "TRIANGLES") 
            drawMode = gl.TRIANGLES;
        else if (val === "LINES") 
            drawMode = gl.LINES;
        else if (val === "POINTS") 
            drawMode = gl.POINTS;
    });
    }

    let drawMode = gl.TRIANGLES; // default


    // NOISE SETTINGS
    [
        ['sliderBaseLevel', 'baseLevel'],
        ['sliderAttack', 'attack'],
        ['sliderRelease', 'release'],
        ['sliderThreshold', 'threshold'],
        ['sliderMinFreq', 'minFreq'],
        ['sliderMaxFreq', 'maxFreq']
    ].forEach(([id, varName]) => {
        const slider = document.getElementById(id);
        if (!slider) return;
        slider.addEventListener('input', () => {
            audioVars[varName] = parseFloat(slider.value);
            if (varName === 'baseLevel') audioVars.bassLevel = audioVars.baseLevel;
            console.log(varName, '=', slider.value);
        });
    });

    let RotY = 0.3;
    const rotYSlider = document.getElementById("rotYSlider");
    if (rotYSlider) {
        rotYSlider.addEventListener("input", () => {
            RotY = parseFloat(rotYSlider.value);
        });
    }

    // AUDIO INPUT
    const fileInput = document.getElementById('audioFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', async (event) => { // when user select a file, start {...}
            const file = event.target.files?.[0];
            if (!file) 
                return;
            ensureAudioContext(); //AudioContext on
            const reader = new FileReader(); // create FileReader to read user's file
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result; // raw bytes
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer); // decote raw bytes
                    setAudioBuffer(audioBuffer); //AudioBuffer to pipeline
                    console.log("file correctly uploaded");
                } catch (err) {
                    console.error("decodeAudioData failed: ", err);
                }
            };
            reader.readAsArrayBuffer(file); // starts reading file
        });
    }

    // AUDIO STREAM
    const captureBtn = document.getElementById('captureAudioBtn');
    if (captureBtn) {
        captureBtn.addEventListener('click', async () => {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true }); // request to capture video and audio - VIDEO IS NEEDED OTHERWISE IT WON'T WORK
                ensureAudioContext(); //AudioContext on
                setAudioStream(stream); //connect stream to analysernode
                console.log("audio correctly captured ");
            } catch (err) {
                console.error("error in capture:", err);
            }
        });
    }

    // LIGHT CONTROL
    ['X','Y','Z'].forEach(axis => {
        const slider = document.getElementById(`light${axis}`);
        slider.addEventListener('input', () => { //input event triggers everytime user changes slider
            const x = parseFloat(document.getElementById('lightX').value);
            const y = parseFloat(document.getElementById('lightY').value);
            const z = parseFloat(document.getElementById('lightZ').value);
            window.mainLightDirection = vec3.fromValues(x,y,z);
            vec3.normalize(window.mainLightDirection, window.mainLightDirection);
        });
    });

    // ---------------------------------------------------------------------------------------------------------------------------------------------------

    // SHADER INIT
    const program = initShaderProgram(gl, vertexShaderSource, fragmentShaderSource);

    // GENERATE SPHERE
    const sphereData = generateSphere(1.0, 200, 200); // (radius, segments, rings)

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphereData.positions, gl.STATIC_DRAW); // fills aPosition in shader

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphereData.normals, gl.STATIC_DRAW); // fills aNormals in shader

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); // gl.ELEMENT_ARRAY_BUFFER for indices
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphereData.indices, gl.STATIC_DRAW); 

    const aPosition = gl.getAttribLocation(program, 'aPosition'); //find aPosition's index in shader (for each vertex)
    const aNormals = gl.getAttribLocation(program, 'aNormals'); //find aNormals's index in shader (for each vertex)

    const uProjectionMatrix = gl.getUniformLocation(program, 'uProjectionMatrix');  //find uProjectionMatrix's index in shader (for all vertex)
    const uViewMatrix = gl.getUniformLocation(program, 'uViewMatrix');
    const uModelMatrix = gl.getUniformLocation(program, 'uModelMatrix');
    const uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uBassStrength = gl.getUniformLocation(program, 'uBassStrength');
    const uColor = gl.getUniformLocation(program, 'uColor');
    const uLightDir = gl.getUniformLocation(program, 'uLightDir');
    const uAmbient = gl.getUniformLocation(program, 'uAmbient');
    const uMouseNDC = gl.getUniformLocation(program, 'uMouseNDC');

    // CAMERA
    let isDragging = false;
    let prevMouseX = 0, prevMouseY = 0;
    let cameraRotationX = 0, cameraRotationY = 0;
    const cameraDistance = 5;

    canvas.addEventListener('mousedown', (e) => { isDragging = true; prevMouseX = e.clientX; prevMouseY = e.clientY; }); // drag is started
    canvas.addEventListener('mouseup', () => { isDragging = false; }); // drag is ended (button released)
    canvas.addEventListener('mouseout', () => { isDragging = false; }); // drag is ended (outside of canvas)
    canvas.addEventListener('mousemove', (e) => { //update position when mouse is moved
        if (isDragging) {
            const deltaX = (e.clientX - prevMouseX) * 0.001; // difference between actual and previous, 0.001 for sensitivy
            const deltaY = (e.clientY - prevMouseY) * 0.001; 
            cameraRotationY += deltaX;
            cameraRotationX += deltaY;
            const maxRotX = Math.PI/2-0.1;
            cameraRotationX = Math.max(-maxRotX, Math.min(maxRotX, cameraRotationX)); //avoid flipping
            prevMouseX = e.clientX;
            prevMouseY = e.clientY;
        }
        updateMouseNDC(canvas, mouseNDC, e.clientX, e.clientY);
    });
    canvas.addEventListener('mouseleave', () => { mouseNDC[0]=2.0; mouseNDC[1]=2.0; }); 



    // LOOP
    function render(now) { // called at every frame
        now *= 0.001;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);

        const bass = getBassStrength();
        gl.clearColor(
            bg_color[0] * (1.0 - 0.5 * bass),
            bg_color[1],
            bg_color[2] * (1.0 + 0.2 * bass),
            1.0
        );
        //gl.clearColor(
        //    bg_color[0],
        //    bg_color[1],
        //    bg_color[2],
        //    1.0
        //);

        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, 45*Math.PI/180, canvas.width/canvas.height, 0.1, 100);

        const viewMatrix = mat4.create();
        mat4.rotateX(viewMatrix, viewMatrix, cameraRotationX);
        mat4.rotateY(viewMatrix, viewMatrix, cameraRotationY);
        mat4.translate(viewMatrix, viewMatrix, [0,0,-cameraDistance]);

        const modelMatrix = mat4.create();
        // mat4.rotateX(modelMatrix, modelMatrix, now*0.3);
        mat4.rotateY(modelMatrix, modelMatrix, now*RotY+getBassStrength()*0.8);

        const normalMatrix = mat3.create();
        mat3.fromMat4(normalMatrix, modelMatrix);
        mat3.invert(normalMatrix, normalMatrix);
        mat3.transpose(normalMatrix, normalMatrix);

        gl.uniformMatrix4fv(uProjectionMatrix,false,projectionMatrix);
        gl.uniformMatrix4fv(uViewMatrix,false,viewMatrix);
        gl.uniformMatrix4fv(uModelMatrix,false,modelMatrix);
        gl.uniformMatrix3fv(uNormalMatrix,false,normalMatrix);
        gl.uniform1f(uTime, now);
        gl.uniform1f(uBassStrength, getBassStrength()*3.0);
        // gl.uniform3f(uColor, 1,0,0);
        gl.uniform3f(uColor,sphere_color[0] ,sphere_color[1]*(1.0 - 1 * bass),sphere_color[2]*(1.0 + 0.2 * bass));
        gl.uniform3fv(uLightDir, window.mainLightDirection);
        gl.uniform1f(uAmbient, 0.12);
        gl.uniform2fv(uMouseNDC, mouseNDC);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(aPosition,3,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(aPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.vertexAttribPointer(aNormals,3,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(aNormals);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.drawElements(drawMode, sphereData.indices.length, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
};

// RESIZE
window.addEventListener('resize', () => {
    const canvas = document.getElementById('visualizerCanvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const gl = canvas.getContext('webgl');
    gl.viewport(0, 0, canvas.width, canvas.height);
});

// ----------------------------------------------------------- SHADERS  ----------------------------------------------------------------------

const vertexShaderSource = `

attribute vec3 aPosition;    
attribute vec3 aNormals;     

uniform mat4 uProjectionMatrix; 
uniform mat4 uViewMatrix; 
uniform mat4 uModelMatrix;
uniform mat3 uNormalMatrix;

uniform float uTime;         
uniform float uBassStrength; 
uniform vec2 uMouseNDC;      

varying vec3 vNormal;        


// ------------------------- PERLIN NOISE -----------------------

// generate "random" number in [0,1] from p
float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 124525.2345233);
}

// generate another random number in [0,1] from p
float hash2(vec3 p) {
    return fract(sin(dot(p, vec3(269.5,183.3,246.1))) * 25423.63456345);
}

vec3 gradient(vec3 cell) {

    // creates a random gradient starting from a point (unitary vector randomly oriented)

    float u = hash(cell); 
    float v = hash2(cell);
    float theta = u * 6.28318530718; //maps to [0,2pi]
    float z = v * 2.0 - 1.0; //maps to [-1,1] 
    float r = sqrt(1.0 - z*z); // circle at height z in XY plane
    return vec3(r*cos(theta), r*sin(theta), z);
}

float fade(float t) {

    // provides smooth interpolation - maps t ([0,1]) in [0,1] but in a smooth curve, with first and second derivative = 0 at boundaries (gives continuity for Perlin noise)

    return 6.0*pow(t,5.0) - 15.0*pow(t,4.0) + 10.0*pow(t,3.0);
}

float perlinNoise(vec3 p) {

    //3d perlin noise

    vec3 pi = floor(p);                // select the 1x1x1 cell
    vec3 pf = p - pi;                  // location within the cell
    vec3 f  = vec3(fade(pf.x), fade(pf.y), fade(pf.z));
    // vec3 f = pf; // test without fade


    // compute weights for all verteces of the cell
    float n000 = dot(gradient(pi+vec3(0.0,0.0,0.0)), pf-vec3(0.0,0.0,0.0)); //dot between diplacement vector and gradient in the corner
    float n100 = dot(gradient(pi+vec3(1.0,0.0,0.0)), pf-vec3(1.0,0.0,0.0));
    float n010 = dot(gradient(pi+vec3(0.0,1.0,0.0)), pf-vec3(0.0,1.0,0.0));
    float n110 = dot(gradient(pi+vec3(1.0,1.0,0.0)), pf-vec3(1.0,1.0,0.0));
    float n001 = dot(gradient(pi+vec3(0.0,0.0,1.0)), pf-vec3(0.0,0.0,1.0));
    float n101 = dot(gradient(pi+vec3(1.0,0.0,1.0)), pf-vec3(1.0,0.0,1.0));
    float n011 = dot(gradient(pi+vec3(0.0,1.0,1.0)), pf-vec3(0.0,1.0,1.0));
    float n111 = dot(gradient(pi+vec3(1.0,1.0,1.0)), pf-vec3(1.0,1.0,1.0));


    //trilinar interpolation (x,y,z)
    
    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);

    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);

    float nxyz = mix(nxy0, nxy1, f.z);

    return nxyz; // Perlin noise in p
}

// ------------------------- MAIN -----------------------

void main() {
    float freq = 4.0;
    float tscale = 0.5; // larger -> faster anim.
    vec3 noisePos = aPosition * freq + vec3(uTime * tscale);
    float noise   = perlinNoise(noisePos);
    //float noise = perlinNoise(aPosition * freq); // debug, noise still

    float displacement = noise * uBassStrength * 0.5;

    vec4 clip = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition + aNormals * displacement, 1.0);
    float w = (abs(clip.w) < 1e-6) ? 1e-6 : clip.w;
    vec3 ndc = clip.xyz / w; 

    float d = distance(ndc.xy, uMouseNDC);
    float r = 0.1; // how far vertices get influenced by mouse

    float influence = 1.0 - smoothstep(0.0, r, d); // smoothstep(0.0, r, d) returns 0 if d<=0 and 1 if d>=r, in between smoothly iterpoles
    float falloff   = exp(-d * 8.0); // exponential decay: at d=0 -> falloff=1 (max influence), decreases quickly with distance
    float pulse     = 0.5 + 0.1 * sin(uTime * 6.0 ); 

    float hoverContribution = influence * falloff * pulse * 0.3;
    displacement += hoverContribution;

    vec3 morphedPosition = aPosition + aNormals * displacement;

    vNormal = normalize(uNormalMatrix * aNormals);
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(morphedPosition, 1.0);
    gl_PointSize = 4.0;
}

`;

const fragmentShaderSource = `

precision mediump float;
varying vec3 vNormal;
uniform vec3 uColor;
uniform vec3 uLightDir;
uniform float uAmbient;
void main(){
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDir);
    float diff = max(dot(N, L), 0.0);
    vec3 color = uColor * (uAmbient + (1.0 - uAmbient) * diff);
    gl_FragColor = vec4(color, 1.0);
}

`;
