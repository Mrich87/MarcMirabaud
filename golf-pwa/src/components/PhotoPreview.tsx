import { useEffect, useState } from 'react';

interface PhotoPreviewProps {
  blob: Blob;
}

export default function PhotoPreview({ blob }: PhotoPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (!url) return null;
  return <img src={url} alt="" style={{ width: '100%', borderRadius: 8, display: 'block' }} />;
}
