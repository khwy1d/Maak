import { useEffect, useState } from "react";

type PassportUploadFieldProps = {
  id: string;
  title: string;
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
  language?: "ar" | "en";
};

export default function PassportUploadField({
  id, title, file, onChange, required = false, language = "ar",
}: PassportUploadFieldProps) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const isPdf = file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf");

  return (
    <div className="maak-passport-field">
      <label className="maak-passport-pick" htmlFor={id}>
        <span>{title}</span>
        <small>{file ? file.name : language === "ar" ? "اضغط لاختيار صورة أو ملف الجواز" : "Tap to choose a passport image or file"}</small>
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          required={required}
          onChange={event => onChange(event.target.files?.[0] || null)}
        />
      </label>
      {file && previewUrl && (
        <div className="maak-passport-preview" aria-live="polite">
          <div className="maak-passport-preview-head">
            <strong>{language === "ar" ? "معاينة الجواز" : "Passport preview"}</strong>
            <span>{file.name}</span>
          </div>
          {isPdf
            ? <iframe src={previewUrl} title={language === "ar" ? "معاينة ملف الجواز" : "Passport file preview"} />
            : <img src={previewUrl} alt={language === "ar" ? "معاينة صورة جواز السفر" : "Passport image preview"} />}
        </div>
      )}
    </div>
  );
}
