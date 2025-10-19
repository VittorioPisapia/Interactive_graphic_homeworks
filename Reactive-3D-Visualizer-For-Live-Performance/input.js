export function updateMouseNDC(canvas, mouseNDC, clientX, clientY) {

    // Update mouse position in Normalized Device Coordinates (NDC) [-1,+1]

    const rect = canvas.getBoundingClientRect(); // position and size of canvas
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const nx = (x / rect.width) * 2.0 - 1.0; // brings x from [0, react.width] to [-1,+1]
    const ny = - (y / rect.height) * 2.0 + 1; // flip y
    mouseNDC[0] = nx;
    mouseNDC[1] = ny;
}
