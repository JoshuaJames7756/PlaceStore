// /api/upload-image.js
// POST — recibe imagen base64 o FormData, sube a Cloudinary, retorna url + cloudinary_id

export default async function handler(req) {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Método no permitido' }, { status: 405 });
  }

  const cloudName   = process.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    return Response.json({ error: 'Cloudinary no configurado' }, { status: 500 });
  }

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { file } = body; // base64 data URI
  if (!file) return Response.json({ error: 'Archivo requerido' }, { status: 400 });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'placestore/products');
  formData.append('transformation', 'f_auto,q_auto,w_1200');

  const cloudRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!cloudRes.ok) {
    const err = await cloudRes.text();
    console.error('[upload-image] Cloudinary error:', err);
    return Response.json({ error: 'Error al subir imagen' }, { status: 500 });
  }

  const data = await cloudRes.json();

  return Response.json({
    cloudinary_id: data.public_id,
    url:           data.secure_url,
  }, { status: 201 });
}
