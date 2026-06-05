/**
 * image.service.js
 * Servicio centralizado para la gestión de imágenes con Cloudinary.
 *
 * Responsabilidades:
 *  - Resolver la URL final de la imagen a partir del archivo subido por Multer/Cloudinary.
 *  - Proveer una imagen por defecto cuando no se sube ningún archivo.
 *
 * Al centralizar aquí la lógica de imágenes, los controladores solo necesitan
 * llamar a `resolveImageUrl(req.file)` y olvidarse del detalle de implementación.
 */

/** Nombre de la imagen usada cuando el producto no tiene foto propia. */
const DEFAULT_PRODUCT_IMAGE = "default_producto.png";

/**
 * Resuelve la URL definitiva de la imagen de un producto.
 *
 * Cuando se usa Cloudinary con multer-storage-cloudinary, Multer almacena
 * la URL pública de Cloudinary en `file.path`.  Si no se sube ningún archivo
 * se retorna la imagen por defecto.
 *
 * @param {Express.Multer.File | undefined} file - Objeto de archivo de Multer.
 * @returns {string} URL de la imagen o nombre de la imagen por defecto.
 */
export const resolveImageUrl = (file) => {
  return file?.path ?? DEFAULT_PRODUCT_IMAGE;
};
