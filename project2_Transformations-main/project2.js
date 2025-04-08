// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.
function MultiplyMatrix(a, b) {
    let result = new Array(9);

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            result[col * 3 + row] = 
                a[0 * 3 + row] * b[col * 3 + 0] +
                a[1 * 3 + row] * b[col * 3 + 1] +
                a[2 * 3 + row] * b[col * 3 + 2];
        }
    }

    return result;
}
function GetTransform( positionX, positionY, rotation, scale )
{
	let rot_matrix = Array(Math.cos(rotation*Math.PI/180),Math.sin(rotation*Math.PI/180),0, -Math.sin(rotation*Math.PI/180),Math.cos(rotation*Math.PI/180),0, 0,0,1)
	let scale_matrix = Array(scale,0,0, 0,scale,0 , 0,0,1)
	let translation_matrix = Array(1,0,0, 0,1,0, positionX,positionY,1)
	let result = MultiplyMatrix(translation_matrix, MultiplyMatrix(rot_matrix, scale_matrix));
	return result;
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.
function ApplyTransform( trans1, trans2 )
{
	let result = MultiplyMatrix(trans2, trans1);
	return result
}
