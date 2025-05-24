import React from "react";

const DashboardPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Dashboard</h1>
      <p className="text-gray-600">
        Configuration overview and recent activity will be displayed here.
      </p>
    </div>
  );
};

export default DashboardPage;
