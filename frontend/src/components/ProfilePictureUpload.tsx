import { useState } from 'react';
import toast from 'react-hot-toast';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
}

export default function ProfilePictureUpload({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('יש לבחור קובץ תמונה');
      return;
    }
    setUploading(true);
    try {
      const asset = await uploadToCloudinary({ file, type: 'IMAGE' });
      onChange(asset.thumbnailUrl ?? asset.url);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error('העלאת התמונה נכשלה');
    } finally {
      setUploading(false);
    }
  }

  return (
    <label className="cursor-pointer group">
      <div className="relative w-24 h-24 rounded-full bg-navy-50 overflow-hidden flex items-center justify-center border-2 border-dashed border-navy-200 hover:border-teal-500 transition-colors">
        {value ? (
          <img src={value} alt="profile" className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl">📷</span>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs text-navy-700">
            מעלה...
          </div>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <p className="text-center text-xs text-navy-500 mt-2 group-hover:text-teal-600">
        תמונת פרופיל (אופציונלי)
      </p>
    </label>
  );
}
