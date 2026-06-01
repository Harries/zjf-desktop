type DropzoneProps = {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function Dropzone({ active, disabled = false, onClick }: DropzoneProps) {
  return (
    <button
      className={`dropzone ${active ? "active" : ""}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <strong>{active ? "松开上传图片" : "拖放图片"}</strong>
      <span>PNG、JPG、GIF、WebP、BMP、SVG、AVIF</span>
    </button>
  );
}
