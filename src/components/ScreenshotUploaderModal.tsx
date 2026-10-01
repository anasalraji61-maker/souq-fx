import React, { useState, useRef } from 'react';
import { Camera, Upload, Check, AlertCircle, RefreshCw, X, Image as ImageIcon } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ScreenshotUploaderModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setError(null);
    setSuccess(false);
    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    }
  };

  const handleUpload = async () => {
    if (!imagePreview) return;
    setUploading(true);
    setError(null);

    try {
      const res = await fetch('/api/upload-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          note: note.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'حدث خطأ أثناء الرفع');
      }
    } catch (err: any) {
      setError('تعذر الاتصال بالسيرفر لرفع الصورة: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none"
      onPaste={handlePaste}
    >
      <div className="bg-[#0C1424] border border-[#2DD4BF]/40 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E283D] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 flex items-center justify-center text-[#2DD4BF]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#E8EEF9]">
                مركز إرسال لقطات الشاشة المباشر (Direct Screenshot)
              </h3>
              <p className="text-[11px] text-[#7B8DA8]">
                إذا تعذر الإرسال في الشات، يمكنك رفع أي صورة أو لقطة شاشة هنا مباشرة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#7B8DA8] hover:text-[#E8EEF9] text-base p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) processFile(file);
          }}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
            imagePreview
              ? 'border-[#2DD4BF]/50 bg-[#08111E]'
              : 'border-[#1E283D] hover:border-[#2DD4BF]/40 hover:bg-[#08111E]/60 bg-[#08111E]/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {imagePreview ? (
            <div className="space-y-2 w-full">
              <img
                src={imagePreview}
                alt="معاينة الصورة"
                className="max-h-48 max-w-full mx-auto rounded-lg border border-[#1E283D] object-contain shadow-md"
              />
              <p className="text-[11px] text-[#2DD4BF]">انقر لتغيير الصورة أو الصق صورة جديدة (Ctrl + V)</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#162033] border border-[#243049] flex items-center justify-center text-[#2DD4BF] mx-auto">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#E8EEF9]">انقر هنا لاختيار صورة من جهازك</p>
                <p className="text-[11px] text-[#7B8DA8] mt-0.5">
                  أو يمكنك سحب الصورة وإفلاتها هنا، أو نسخها ولصقها مباشرة بـ <code className="text-[#2DD4BF]">Ctrl + V</code>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Note Input */}
        <div>
          <label className="text-[11px] text-[#7B8DA8] block mb-1">
            ملاحظة مع الصورة (اختياري):
          </label>
          <input
            type="text"
            placeholder="مثلاً: صورة شاشة MT5 بعد لصق الإكسبيرت..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-[#08111E] border border-[#1E283D] text-[#E8EEF9] text-xs rounded-lg px-3 py-2 outline-hidden focus:border-[#2DD4BF]/50 placeholder:text-[#556987]"
          />
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-2.5 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-2.5 rounded-lg bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>تم رفع الصورة بنجاح وتخزينها في السيرفر! يمكنني الاطلاع عليها وتحليلها الآن.</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1E283D]">
          <span className="text-[11px] text-[#556987]">تدعم كافة أحجام ودقات الصور</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#7B8DA8] hover:text-[#E8EEF9] hover:bg-[#162033]"
            >
              إلغاء
            </button>
            <button
              onClick={handleUpload}
              disabled={!imagePreview || uploading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-[#2DD4BF] text-[#042F2E] hover:bg-[#14B8A6] disabled:opacity-50 transition-colors shadow-md active:scale-95"
            >
              {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? 'جاري الرفع...' : 'رفع الصورة للمساعد الآن'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
