import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const companyConfigPath = path.join(__dirname, '../config/company.json');

const companyController = {
  getCompanyInfo: (req, res) => {
    try {
      const data = fs.readFileSync(companyConfigPath, 'utf8');
      const companyInfo = JSON.parse(data);
      res.json({ ok: true, data: companyInfo });
    } catch (error) {
      console.error('Error reading company.json:', error);
      res.status(500).json({ ok: false, message: 'Error interno del servidor al leer la configuración de la empresa' });
    }
  }
};

export default companyController;
