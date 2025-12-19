import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import type { Spawn } from "../../types/spawn";

interface MetadataCardProps {
  spawn: Spawn;
}

const formatDate = (ms: number | undefined) => {
  if (!ms) return "-";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
};

export const MetadataCard: React.FC<MetadataCardProps> = ({ spawn }) => {
  const [showMetadata, setShowMetadata] = useState<boolean>(true);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))]">
            Metadata
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMetadata((v) => !v)}
            aria-label="Toggle metadata"
          >
            {showMetadata ? "Hide" : "Show"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showMetadata && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                id="spawn-id"
                type="text"
                label="ID"
                value={spawn.id}
                disabled
              />
            </div>
            <div>
              <Input
                id="spawn-modified"
                type="text"
                label="Last Modified"
                value={formatDate(spawn.lastModified)}
                disabled
              />
            </div>

            <div>
              <Input
                id="spawn-assets"
                type="text"
                label="Assets"
                value={`${spawn.assets.length} item${
                  spawn.assets.length === 1 ? "" : "s"
                }`}
                disabled
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
