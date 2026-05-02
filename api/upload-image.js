// /api/upload-image.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const cloudName    = process.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) return res.status(500).json({ error: 'Cloudinary no configurado' });

  const { file } = req.body;
  if (!file) return res.status(400).json({ error: 'Archivo requerido' });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'placestore/products');
  formData.append('transformation', 'f_auto,q_auto,w_1200');

  const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body:   formData,
  });

  if (!cloudRes.ok) {
    const err = await cloudRes.text();
    console.error('[upload-image] Cloudinary error:', err);
    return res.status(500).json({ error: 'Error al subir imagen' });
  }

  const data = await cloudRes.json();
  return res.status(201).json({ cloudinary_id: data.public_id, url: data.secure_url });
}
