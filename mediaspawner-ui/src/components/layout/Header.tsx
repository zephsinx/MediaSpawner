import React from "react";

const Header: React.FC = () => {
  const handleSaveToSB = () => {
    console.log("Save to Streamer.bot clicked");
    // Placeholder for actual save logic
  };

  const handleLoadFromSB = () => {
    console.log("Load from Streamer.bot clicked");
    // Placeholder for actual load logic
  };

  const handleImportJson = () => {
    console.log("Import JSON clicked");
    // Placeholder for actual import logic
  };

  const handleExportJson = () => {
    console.log("Export JSON clicked");
    // Placeholder for actual export logic
  };

  return (
    <header className="bg-blue-600 text-white py-4 px-6 shadow-md flex justify-between items-center">
      <h1 className="text-2xl font-bold">
        Streamer.bot Media Asset Configurator
      </h1>
      <div className="space-x-2">
        <button
          onClick={handleSaveToSB}
          className="bg-blue-500 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
          // disabled // Initially disabled/mocked as per plan
        >
          Save to SB
        </button>
        <button
          onClick={handleLoadFromSB}
          className="bg-green-500 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded shadow"
          // disabled // Initially disabled/mocked as per plan
        >
          Load from SB
        </button>
        <button
          onClick={handleImportJson}
          className="bg-gray-500 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded shadow"
        >
          Import JSON
        </button>
        <button
          onClick={handleExportJson}
          className="bg-gray-500 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded shadow"
        >
          Export JSON
        </button>
      </div>
    </header>
  );
};

export default Header;
