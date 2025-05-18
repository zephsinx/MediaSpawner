import Header from "./components/layout/Header";
import GlobalSettingsCard from "./components/layout/GlobalSettingsCard";
import MediaGroupCard from "./components/config_cards/MediaGroupCard";
import { useConfigStore } from "./store/configStore";
import type { MediaGroup } from "./types"; // For new group creation
import { v4 as uuidv4 } from "uuid"; // For generating unique IDs
import "./App.css";

function App() {
  const mediaGroups = useConfigStore((state) => state.mediaGroups);
  const addMediaGroup = useConfigStore((state) => state.addMediaGroup);
  const deleteMediaGroup = useConfigStore((state) => state.deleteMediaGroup);
  // const updateMediaGroup = useConfigStore((state) => state.updateMediaGroup); // For later use

  const handleAddNewGroup = () => {
    const newGroup: MediaGroup = {
      id: uuidv4(),
      name: `New Media Group ${mediaGroups.length + 1}`,
      // visualSettings: undefined, // Optional, can be omitted
      // audioSettings: undefined, // Optional, can be omitted
    };
    addMediaGroup(newGroup);
    console.log("Added new group:", newGroup);
  };

  const handleEditGroup = (id: string) => {
    console.log("Edit group clicked:", id);
    // Placeholder for actual edit logic (e.g., open a modal with MediaGroupForm)
  };

  const handleDeleteGroup = (id: string) => {
    console.log("Delete group clicked:", id);
    deleteMediaGroup(id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      <main className="flex-1 p-6">
        <GlobalSettingsCard />

        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Media Groups</h2>
            <button
              onClick={handleAddNewGroup}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded shadow"
            >
              Add New Media Group
            </button>
          </div>
          {mediaGroups.length === 0 ? (
            <p className="text-gray-500">
              No media groups configured yet. Click "Add New Media Group" to get
              started.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mediaGroups.map((group) => (
                <MediaGroupCard
                  key={group.id}
                  group={group}
                  onEdit={handleEditGroup}
                  onDelete={handleDeleteGroup}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
