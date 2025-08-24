// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix(translationX, translationY, translationZ, rotationX, rotationY) {
	let trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];

	let rotX = [
		1, 0, 0, 0,
		0, Math.cos(rotationX), Math.sin(rotationX), 0,
		0, -Math.sin(rotationX), Math.cos(rotationX), 0,
		0, 0, 0, 1
	];

	let rotY = [
		Math.cos(rotationY), 0, -Math.sin(rotationY), 0,
		0, 1, 0, 0,
		 Math.sin(rotationY), 0, Math.cos(rotationY), 0,
		0, 0, 0, 1
	];

	let rotation = MatrixMult(rotX, rotY); 
	let mv = MatrixMult(trans, rotation);
	return mv;
}


// [TO-DO] Complete the implementation of the following class.

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor() {
		this.prog = InitShaderProgram(meshVS, meshFS);

		this.aPosition = gl.getAttribLocation(this.prog, "aPosition");
		this.aTexCoord = gl.getAttribLocation(this.prog, "aTexCoord");
		this.aNormals  = gl.getAttribLocation(this.prog, "aNormals");
		this.texture = gl.createTexture();
		this.uMvp        = gl.getUniformLocation(this.prog, "uMvp");
		this.uMV         = gl.getUniformLocation(this.prog, "uMv");
		this.uNormal     = gl.getUniformLocation(this.prog, "uNormal");
		this.uSwapYZ     = gl.getUniformLocation(this.prog, "uSwapYZ");
		this.uShowTexture= gl.getUniformLocation(this.prog, "uShowTexture");
		this.uLightDir   = gl.getUniformLocation(this.prog, "uLightDir");
		this.uLightColor = gl.getUniformLocation(this.prog, "uLightColor");
		this.uShininess  = gl.getUniformLocation(this.prog, "uShininess");
		this.uTex        = gl.getUniformLocation(this.prog, "uTex");

		this.vertexBuffer   = gl.createBuffer();
		this.texCoordBuffer = gl.createBuffer();
		this.normalBuffer   = gl.createBuffer();

		gl.useProgram(this.prog);
		gl.uniform3f(this.uLightColor, 1.0, 1.0, 1.0);

		this.swap = false;
		this.swapMatrix = [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		];

		this.numVertices = 0;
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions,
	// an array of 2D texture coordinates, and an array of vertex normals.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex and every three consecutive 
	// elements in the normals array form a vertex normal.
	// Note that this method can be called multiple times.
	setMesh(vertPos, texCoords, normals)
	 {
		this.numVertices = vertPos.length / 3;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ( swap )
	{
		// [TO-DO] Set the uniform parameter(s) of the vertex shader

		this.swap = swap;
		if (this.swap) {
			this.swapMatrix = [
				1, 0, 0, 0,
				0, 0, 1, 0,
				0, 1, 0, 0,
				0, 0, 0, 1
			];
		} else {
			this.swapMatrix = [
				1, 0, 0, 0,
				0, 1, 0, 0,
				0, 0, 1, 0,
				0, 0, 0, 1
			];
		}
	}
	
	// This method is called to draw the triangular mesh.
	// The arguments are the model-view-projection transformation matrixMVP,
	// the model-view transformation matrixMV, the same matrix returned
	// by the GetModelViewProjection function above, and the normal
	// transformation matrix, which is the inverse-transpose of matrixMV.
	draw(matrixMVP, matrixMV, matrixNormal) {

		// [TO-DO] Complete the WebGL initializations before drawing

		gl.useProgram(this.prog);

		gl.uniformMatrix4fv(this.uMvp, false, matrixMVP);
		gl.uniformMatrix4fv(this.uMV, false, matrixMV);
		gl.uniformMatrix3fv(this.uNormal, false, matrixNormal);
		gl.uniformMatrix4fv(this.uSwapYZ, false, this.swapMatrix);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(this.uTex, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.aPosition);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.aTexCoord);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.vertexAttribPointer(this.aNormals, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.aNormals);

		gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture(img) {

		// [TO-DO] Bind the texture

		gl.useProgram(this.prog);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

		this.is_texture_exist = true;
		gl.uniform1i(this.uTex, 0);
		gl.uniform1i(this.uShowTexture, 1); 
	}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture( show )
	{

		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify if it should use the texture.

		gl.useProgram(this.prog);
		gl.uniform1i(this.uShowTexture, show && this.is_texture_exist ? 1 : 0);
	}
	
	// This method is called to set the incoming light direction
	setLightDir( x, y, z )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the light direction.

		gl.useProgram(this.prog);
		gl.uniform3f(this.uLightDir, x, y, z);
	}

	
	// This method is called to set the shininess of the material
	setShininess( shininess )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the shininess.

		gl.useProgram(this.prog);
		gl.uniform1f(this.uShininess, shininess);
	}
}


// This function is called for every step of the simulation.
// Its job is to advance the simulation for the given time step duration dt.
// It updates the given positions and velocities.
function SimTimeStep( dt, positions, velocities, springs, stiffness, damping, particleMass, gravity, restitution )
{
	var forces = Array( positions.length ); // The total for per particle

	// [TO-DO] Compute the total force of each particle

	for (var i = 0; i < positions.length; ++i) {
		forces[i] = gravity.mul(particleMass);
	}

	springs.forEach(spring => {
		const i = spring.p0, j = spring.p1, rest = spring.rest;
		const d = positions[i].sub(positions[j]).unit();
		const l = positions[i].sub(positions[j]).len();
		forces[i].inc(d.mul(stiffness * (rest - l)));
		forces[j].inc(d.mul(stiffness * (l - rest)));
		forces[i].inc(d.mul(- damping * velocities[i].sub(velocities[j]).dot(d)));
		forces[j].inc(d.mul(- damping * velocities[j].sub(velocities[i]).dot(d)));
	});
	
	// [TO-DO] Update positions and velocities
	for (var i = 0; i < positions.length; ++i) {
		if (massSpring.selVert == i) continue;
		const a = forces[i].div(particleMass);
		velocities[i] = velocities[i].add(a.mul(dt));
		positions[i] = positions[i].add(velocities[i].mul(dt));
	}
	
	// [TO-DO] Handle collisions
	for (var i = 0; i < positions.length; ++i) {

		if (positions[i].x < -1.0) {
			const h = - 1.0 - positions[i].x;
			positions[i].x = restitution * h - 1;
			velocities[i].x = - velocities[i].x * restitution;
		}
		if (positions[i].x > 1.0) {
			const h = positions[i].x - 1.0;
			positions[i].x = 1.0 - restitution * h;
			velocities[i].x = - velocities[i].x * restitution;
		}

		if (positions[i].y < -1.0) {
			const h = - 1.0 - positions[i].y;
			positions[i].y = restitution * h - 1;
			velocities[i].y = - velocities[i].y * restitution;
		}
		if (positions[i].y > 1.0) {
			const h = positions[i].y - 1.0;
			positions[i].y = 1.0 - restitution * h;
			velocities[i].y = - velocities[i].y * restitution;
		}

		if (positions[i].z < -1.0) {
			const h = - 1.0 - positions[i].z;
			positions[i].z = restitution * h - 1;
			velocities[i].z = - velocities[i].z * restitution;
		}
		if (positions[i].z > 1.0) {
			const h = positions[i].z - 1.0;
			positions[i].z = 1.0 - restitution * h;
			velocities[i].z = - velocities[i].z * restitution;
		}
	}
	
}

const meshVS = `
attribute vec3 aPosition;
attribute vec3 aNormals;
attribute vec2 aTexCoord;

uniform mat4 uMvp;
uniform mat4 uMv;
uniform mat3 uNormal;
uniform mat4 uSwapYZ;

varying vec2 v_texCoord;
varying vec3 v_viewNormal;
varying vec4 v_viewFragPos;

void main() {
	v_viewNormal = uNormal * aNormals;
	v_texCoord = aTexCoord;
	v_viewFragPos = uMv * vec4(aPosition, 1.0);
	gl_Position = uMvp * uSwapYZ * vec4(aPosition, 1.0);
}
`; 

const meshFS = `
precision mediump float;

varying vec2 v_texCoord;
varying vec3 v_viewNormal;
varying vec4 v_viewFragPos;

uniform sampler2D uTex;
uniform bool uShowTexture;

uniform vec3 uLightDir;     
uniform vec3 uLightColor;   
uniform float uShininess;    

void main() {
    vec3 N = normalize(v_viewNormal);

    vec3 L = normalize(uLightDir);
    vec3 V = normalize(-v_viewFragPos.xyz);

    float diff = max(dot(N, L), 0.0);

    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), uShininess);

	vec3 baseColor;
	if (uShowTexture) {
		baseColor = texture2D(uTex, v_texCoord).rgb;
	} else {
		baseColor = vec3(1.0);
	}

    vec3 color = baseColor * uLightColor * diff + uLightColor * spec;

    gl_FragColor = vec4(color, 1.0);
}

`; 