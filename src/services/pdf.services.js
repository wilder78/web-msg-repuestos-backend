import PDFDocument from "pdfkit";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import cloudinary from "../config/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateReturnPDF = async (returnData, details) => {
  return new Promise(async (resolve, reject) => {
    const fileName = `NotaCredito_${returnData.idDevolucion}.pdf`;
    const tempDir = path.join(__dirname, "../../temp/returns");
    const filePath = path.join(tempDir, fileName);

    try {
      await fs.ensureDir(tempDir);
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // --- CONFIGURACIÓN ESTÉTICA ---
      const primaryColor = "#1e293b";
      const secondaryColor = "#64748b";
      const accentColor = "#f8fafc";
      const successColor = "#059669";

      // --- ENCABEZADO ---
      doc.fillColor(primaryColor).fontSize(22).font("Helvetica-Bold").text("MSG REPUESTOS", 40, 40);
      doc.fontSize(10).font("Helvetica").text("Repuestos y Accesorios para Motocicletas", 40, 65);
      doc.text("Medellín, Colombia", 40, 78);

      // Bloque Nro Devolución (Lado Derecho)
      doc.rect(380, 40, 180, 65).fill(accentColor).stroke("#e2e8f0");
      doc.fillColor(primaryColor).fontSize(11).font("Helvetica-Bold").text("NOTA DE CRÉDITO", 390, 50);
      doc.fontSize(14).fillColor("#e11d48").text(`N° ${returnData.idDevolucion.toString().padStart(5, "0")}`, 390, 65);
      doc.fontSize(8).fillColor(secondaryColor).font("Helvetica").text(`Emisión: ${new Date().toLocaleString()}`, 390, 85);

      doc.moveDown(4);

      // --- SECCIÓN INFORMACIÓN DEL CLIENTE ---
      const infoTop = 135;
      doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Bold").text("INFORMACIÓN DEL CLIENTE", 40, infoTop);
      doc.moveTo(40, infoTop + 12).lineTo(560, infoTop + 12).stroke("#e2e8f0");

      doc.font("Helvetica").fontSize(9).fillColor(primaryColor);

      // Columna Izquierda: Datos Fiscales
      doc.font("Helvetica-Bold").text("Razón Social:", 40, infoTop + 25);
      doc.font("Helvetica").text(`${returnData.cliente?.razonSocial || returnData.clienteNombre || "CLIENTE NO IDENTIFICADO"}`, 110, infoTop + 25);

      doc.font("Helvetica-Bold").text("NIT / CC:", 40, infoTop + 38);
      doc.font("Helvetica").text(`${returnData.numeroDocumento || returnData.cliente?.numeroDocumento || returnData.id_cliente || "N/A"}`, 110, infoTop + 38);

      doc.font("Helvetica-Bold").text("Ref. Venta:", 40, infoTop + 51);
      doc.font("Helvetica").text(`# ${returnData.id_venta || returnData.idVenta || "N/A"}`, 110, infoTop + 51);

      // Columna Derecha: Motivo
      doc.font("Helvetica-Bold").text("Motivo de Devolución:", 280, infoTop + 25);
      doc.font("Helvetica").text(returnData.motivo || "No se especificaron detalles.", 280, infoTop + 38, { width: 270 });

      // --- TABLA DE PRODUCTOS ---
      const tableTop = 225;
      doc.rect(40, tableTop, 520, 22).fill(primaryColor);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
      doc.text("ID", 50, tableTop + 7);
      doc.text("DESCRIPCIÓN DEL PRODUCTO", 100, tableTop + 7);
      doc.text("CANT", 350, tableTop + 7, { width: 40, align: "center" });
      doc.text("P. UNITARIO", 400, tableTop + 7, { width: 70, align: "right" });
      doc.text("SUBTOTAL", 480, tableTop + 7, { width: 70, align: "right" });

      let y = tableTop + 28;
      doc.fillColor(primaryColor).font("Helvetica").fontSize(9);

      details.forEach((item, index) => {
        if (index % 2 === 0) doc.rect(40, y - 5, 520, 20).fill(accentColor);
        doc.fillColor(primaryColor);
        doc.text(item.idProducto?.toString() || "—", 50, y);
        doc.text(item.nombreProducto || `Producto Ref. ${item.idProducto}`, 100, y, { width: 230 });
        doc.text(item.cantidadDevuelta.toString(), 350, y, { width: 40, align: "center" });
        doc.text(`$ ${Number(item.precioUnitario).toLocaleString()}`, 400, y, { width: 70, align: "right" });
        doc.text(`$ ${Number(item.subtotalLinea).toLocaleString()}`, 480, y, { width: 70, align: "right" });
        
        y += 20;
        if (y > 700) { doc.addPage(); y = 50; }
      });

      // --- CÁLCULOS FINALES (IVA DESGLOSADO) ---
      const totalFinal = Number(returnData.total_ajuste || returnData.totalAjuste || 0);
      const subtotalBase = totalFinal / 1.19;
      const valorIva = totalFinal - subtotalBase;

      const totalTop = y + 15;
      doc.moveTo(350, totalTop).lineTo(560, totalTop).stroke("#e2e8f0");

      doc.font("Helvetica").fontSize(9).fillColor(secondaryColor);
      
      // Subtotal
      doc.text("Subtotal (Base):", 350, totalTop + 10);
      doc.text(`$ ${subtotalBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 480, totalTop + 10, { width: 70, align: "right" });

      // IVA
      doc.text("IVA (19%):", 350, totalTop + 22);
      doc.text(`$ ${valorIva.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 480, totalTop + 22, { width: 70, align: "right" });

      // Rectángulo de Total
      doc.rect(345, totalTop + 35, 215, 28).fill("#f1f5f9");
      doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(11).text("TOTAL AJUSTE", 355, totalTop + 43);
      doc.fillColor(successColor).fontSize(13).text(`$ ${totalFinal.toLocaleString()}`, 480, totalTop + 43, { width: 70, align: "right" });

      doc.end();

      stream.on("finish", async () => {
        try {
          const result = await cloudinary.uploader.upload(filePath, {
            folder: "msg_repuestos/devoluciones",
            public_id: `nota_credito_${returnData.idDevolucion}`,
            resource_type: "auto",
            type: "upload",
            access_mode: "public",
          });
          await fs.remove(filePath);
          resolve(result.secure_url);
        } catch (uploadError) {
          reject(uploadError);
        }
      });

      stream.on("error", (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};