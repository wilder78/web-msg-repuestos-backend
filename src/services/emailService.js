import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Envía un correo electrónico de recuperación de contraseña con un diseño profesional.
 * @param {string} toEmail - Dirección de correo del destinatario.
 * @param {string} resetToken - Token para restablecer la contraseña.
 */
export const sendPasswordResetEmail = async (toEmail, resetToken) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Restablecer Contraseña - MeacSoftware / MSG Repuestos</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #f4f6f9;
          color: #333333;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border: 1px solid #e1e8ed;
        }
        .header {
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          padding: 30px 20px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.6;
        }
        .content h2 {
          margin-top: 0;
          color: #1e3a8a;
          font-size: 20px;
          font-weight: 600;
        }
        .content p {
          margin: 0 0 20px 0;
          color: #555555;
          font-size: 16px;
        }
        .btn-container {
          text-align: center;
          margin: 35px 0;
        }
        .btn-reset {
          background-color: #3b82f6;
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 28px;
          font-size: 16px;
          font-weight: bold;
          border-radius: 6px;
          display: inline-block;
          box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);
          transition: background-color 0.2s ease;
        }
        .btn-reset:hover {
          background-color: #2563eb;
        }
        .footer {
          background-color: #f8fafc;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #888888;
          border-top: 1px solid #e2e8f0;
        }
        .footer p {
          margin: 5px 0;
        }
        .link-fallback {
          font-size: 13px;
          color: #888888;
          word-break: break-all;
          margin-top: 20px;
        }
        .link-fallback a {
          color: #3b82f6;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>MeacSoftware / MSG Repuestos</h1>
        </div>
        <div class="content">
          <h2>Solicitud de recuperación de contraseña</h2>
          <p>Hola,</p>
          <p>Hemos recibido una solicitud para restablecer la contraseña de acceso a su cuenta en <strong>MSG Repuestos</strong>.</p>
          <p>Para continuar con el proceso, por favor haga clic en el siguiente botón. Tenga en cuenta que este enlace expirará en 15 minutos por razones de seguridad.</p>
          <div class="btn-container">
            <a href="${resetLink}" class="btn-reset" target="_blank">Restablecer Contraseña</a>
          </div>
          <p>Si usted no solicitó este cambio, puede ignorar este mensaje de forma segura. Su contraseña actual no se verá afectada.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p class="link-fallback">Si el botón no funciona, copie y pegue el siguiente enlace en su navegador:<br>
            <a href="${resetLink}" target="_blank">${resetLink}</a>
          </p>
        </div>
        <div class="footer">
          <p>Este es un correo automático, por favor no responda a este mensaje.</p>
          <p>&copy; ${new Date().getFullYear()} MSG Repuestos - MeacSoftware. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"MSG Repuestos / MeacSoftware" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Recuperación de contraseña - MSG Repuestos",
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Envía un correo electrónico de verificación de cuenta con un diseño profesional.
 * @param {string} toEmail - Dirección de correo del destinatario.
 * @param {string} verificationToken - Token para verificar el correo.
 */
export const sendVerificationEmail = async (toEmail, verificationToken) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifica tu Cuenta - MeacSoftware / MSG Repuestos</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #f4f6f9;
          color: #333333;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border: 1px solid #e1e8ed;
        }
        .header {
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          padding: 30px 20px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.6;
        }
        .content h2 {
          margin-top: 0;
          color: #1e3a8a;
          font-size: 20px;
          font-weight: 600;
        }
        .content p {
          margin: 0 0 20px 0;
          color: #555555;
          font-size: 16px;
        }
        .btn-container {
          text-align: center;
          margin: 35px 0;
        }
        .btn-verify {
          background-color: #3b82f6;
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 28px;
          font-size: 16px;
          font-weight: bold;
          border-radius: 6px;
          display: inline-block;
          box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);
          transition: background-color 0.2s ease;
        }
        .btn-verify:hover {
          background-color: #2563eb;
        }
        .footer {
          background-color: #f8fafc;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #888888;
          border-top: 1px solid #e2e8f0;
        }
        .footer p {
          margin: 5px 0;
        }
        .link-fallback {
          font-size: 13px;
          color: #888888;
          word-break: break-all;
          margin-top: 20px;
        }
        .link-fallback a {
          color: #3b82f6;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>MeacSoftware / MSG Repuestos</h1>
        </div>
        <div class="content">
          <h2>¡Bienvenido a MSG Repuestos!</h2>
          <p>Hola,</p>
          <p>Gracias por registrarse en <strong>MSG Repuestos</strong>. Para activar su cuenta y poder iniciar sesión, por favor confirme su dirección de correo electrónico haciendo clic en el botón a continuación:</p>
          <div class="btn-container">
            <a href="${verificationLink}" class="btn-verify" target="_blank">Activar Cuenta</a>
          </div>
          <p>Si usted no realizó este registro, puede ignorar este correo de forma segura.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p class="link-fallback">Si el botón no funciona, copie y pegue el siguiente enlace en su navegador:<br>
            <a href="${verificationLink}" target="_blank">${verificationLink}</a>
          </p>
        </div>
        <div class="footer">
          <p>Este es un correo automático, por favor no responda a este mensaje.</p>
          <p>&copy; ${new Date().getFullYear()} MSG Repuestos - MeacSoftware. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"MSG Repuestos / MeacSoftware" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Activa tu cuenta - MSG Repuestos",
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};
