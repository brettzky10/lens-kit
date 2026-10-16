import * as THREE from "three";

export function exportCanvasImage(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  filename = "shot-reference.png"
) {
  // Force a fresh render right before reading pixels so the buffer is current.
  gl.render(scene, camera);
  const dataUrl = gl.domElement.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
