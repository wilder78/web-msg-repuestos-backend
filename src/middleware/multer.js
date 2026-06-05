import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// Configuración del almacenamiento optimizada
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "msg_repuestos/productos",
    
    format: async (req, file) => {
      const ext = file.originalname.split(".").pop().toLowerCase();
      const allowed = ["jpg", "jpeg", "png", "webp"];
      return allowed.includes(ext) ? ext : "jpg";
    },
    // Añadimos estas opciones para asegurar la compatibilidad con el controlador
    transformation: [{ quality: "auto" }] 
  },
});

// Filtro: solo imágenes
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("El archivo no es una imagen válida"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

export default upload;