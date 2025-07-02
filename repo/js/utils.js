// utils.js
// Funciones utilitarias generales

/**
 * Calcula la desviación estándar de un array de números.
 * @param {number[]} arr - Array de números.
 * @returns {number} Desviación estándar.
 */
export function calcularDesviacionEstandar(arr) {
  if (arr.length < 2) return 0;
  const media = arr.reduce((acc, val) => acc + val, 0) / arr.length;
  // Calcula los cuadrados de las diferencias
  const desviaciones = arr.reduce((acc, val) => acc.concat((val - media) ** 2), []);
  const varianza = desviaciones.reduce((acc, val) => acc + val, 0) / arr.length;
  return Math.sqrt(varianza);
}

/**
 * Hace un elemento arrastrable mediante mouse.
 * @param {HTMLElement} element - Elemento a hacer draggable.
 */
export function makeDraggable(element) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  element.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - element.offsetLeft;
    offsetY = e.clientY - element.offsetTop;
    element.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    element.style.left = `${e.clientX - offsetX}px`;
    element.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    element.style.cursor = 'grab';
  });
}
