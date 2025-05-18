import React, { useRef } from "react";

interface FilePickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (newPath: string) => void;
  selectMode: "file" | "directory";
  placeholder?: string;
  className?: string;
}

const FilePicker: React.FC<FilePickerProps> = ({
  id,
  label,
  value,
  onChange,
  selectMode,
  placeholder,
  className = "",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (selectMode === "file") {
      if (files && files.length > 0) {
        onChange(files[0].name);
      }
    } else if (selectMode === "directory") {
      if (files && files.length > 0) {
        // The webkitRelativePath includes the directory structure.
        // The first part of the path is typically the selected directory's name.
        const firstFilePath = files[0].webkitRelativePath;
        if (firstFilePath) {
          const dirName = firstFilePath.split("/")[0];
          onChange(dirName);
        }
      }
    }
    // Reset file input value to allow selecting the same file/directory again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`mb-4 ${className}`}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      <div className="flex">
        <input
          type="text"
          id={id}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="flex-grow mt-1 block w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <button
          type="button"
          onClick={handleBrowseClick}
          className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        >
          Browse...
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelected}
          className="hidden"
          {...(selectMode === "directory"
            ? { webkitdirectory: "", mozdirectory: "", directory: "" }
            : {})}
        />
      </div>
    </div>
  );
};

export default FilePicker;
