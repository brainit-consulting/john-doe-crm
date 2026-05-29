"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";

export type UploadedFile = {
  id?: string;
  url: string;
  pathname: string;
  size: number;
  contentType: string;
};

export function FileUpload({
  endpoint,
  onUploaded,
}: {
  endpoint: string;
  onUploaded?: (file: UploadedFile) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const upload = useCallback(
    (file: File) => {
      setPending(true);
      setProgress(0);
      setError(null);

      // fetch() can't surface upload progress in browsers — XHR can.
      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint);

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener("load", () => {
        setPending(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText) as UploadedFile;
            onUploaded?.(data);
            setProgress(100);
          } catch {
            setError("Upload succeeded but response was not JSON.");
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText) as { error?: string };
            setError(data.error ?? `Upload failed (${xhr.status})`);
          } catch {
            setError(`Upload failed (${xhr.status})`);
          }
        }
      });

      xhr.addEventListener("error", () => {
        setPending(false);
        setError("Network error while uploading.");
      });

      const form = new FormData();
      form.append("file", file);
      xhr.send(form);
    },
    [endpoint, onUploaded],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={[
          "flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-6 text-center text-sm transition-colors",
          dragging
            ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900"
            : "border-neutral-300 hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500",
        ].join(" ")}
      >
        <p className="font-medium">Drop a file or click to upload</p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Files are stored under john-doe-crm/&lt;your-id&gt;/
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
      </div>

      {pending && (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-full bg-neutral-900 transition-all dark:bg-white"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Uploading… {progress}%
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
