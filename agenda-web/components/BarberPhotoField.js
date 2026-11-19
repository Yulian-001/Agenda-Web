'use client';

import { useState } from 'react';
import { jpegPhotoPrefix, maxBarberPhotoBytes } from '../utils/barberPhoto';

async function encodePhoto(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) {
        throw new Error('Usa una imagen JPG, PNG o WebP de hasta 15 MB.');
    }
    const bitmap = await createImageBitmap(file);
    try {
        const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d', { alpha: false });
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.85, 0.65, 0.45]) {
            const url = canvas.toDataURL('image/jpeg', quality);
            const base64 = url.slice(jpegPhotoPrefix.length);
            if (url.startsWith(jpegPhotoPrefix) && base64.length * 0.75 <= maxBarberPhotoBytes) return url;
        }
        throw new Error('La foto supera el tamaño permitido. Prueba con otra imagen.');
    } finally {
        bitmap.close();
    }
}

export default function BarberPhotoField({ photo, onChange, onReady, processing, onProcessing }) {
    const [uploadError, setUploadError] = useState('');
    const [failedPhoto, setFailedPhoto] = useState(null);
    const embeddedPhoto = photo.startsWith(jpegPhotoPrefix);
    const preview = embeddedPhoto || /^https?:\/\//i.test(photo) ? photo : '';

    async function loadFile(file) {
        if (!file || processing) return;
        onProcessing(true);
        setUploadError('');
        try {
            onChange(await encodePhoto(file));
            setFailedPhoto(null);
        } catch (error) {
            setUploadError(error instanceof DOMException ? 'La imagen está dañada o no se puede abrir.' : error.message);
        } finally {
            onProcessing(false);
        }
    }

    function pastePhoto(event) {
        const item = Array.from(event.clipboardData.items).find(item => item.kind === 'file' && item.type.startsWith('image/'));
        if (!item) return;
        event.preventDefault();
        void loadFile(item.getAsFile());
    }

    function removePhoto() {
        onChange('');
        onReady(null);
        setFailedPhoto(null);
        setUploadError('');
    }

    return (
        <fieldset disabled={processing} onPaste={pastePhoto} className="space-y-2 rounded-xl border border-gray-200 p-3">
            <legend className="px-1 text-sm font-semibold text-gray-600">Foto del barbero (obligatoria)</legend>
            <p id="barber-photo-help" className="text-sm text-gray-500">Pega una imagen o su enlace en el campo, o selecciona un archivo.</p>
            <input aria-label="Foto o enlace de la foto" aria-describedby="barber-photo-help" aria-required="true" type="text" inputMode="url"
                placeholder={embeddedPhoto ? 'Imagen adjunta' : 'Pegar foto o enlace https://…'} value={embeddedPhoto ? '' : photo}
                onChange={event => { onChange(event.target.value.trim()); setUploadError(''); setFailedPhoto(null); }}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3" />
            <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-medium text-gray-700">
                    <span className="sr-only">Seleccionar archivo de foto</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="max-w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2"
                        onChange={event => { void loadFile(event.target.files[0]); event.target.value = ''; }} />
                </label>
                {preview && failedPhoto !== photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={preview} src={preview} alt="Vista previa de la foto" className="h-16 w-16 rounded-lg object-cover"
                        onLoad={() => onReady(photo)} onError={() => { setFailedPhoto(photo); onReady(null); }} />
                )}
                {photo && (
                    <button type="button" onClick={removePhoto} className="rounded-lg px-2 py-1 text-sm font-semibold text-red-700 hover:bg-red-50">
                        Quitar foto
                    </button>
                )}
            </div>
            {processing && <p role="status" className="text-sm text-gray-600">Preparando foto…</p>}
            {(uploadError || (preview && failedPhoto === photo)) && (
                <p role="alert" className="text-sm text-red-700">{uploadError || 'No se pudo cargar la foto. Pega otra imagen o selecciona un archivo.'}</p>
            )}
        </fieldset>
    );
}
