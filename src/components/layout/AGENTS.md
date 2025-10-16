# Layout Components — AGENTS.md

## Scope and purpose

- Three-panel application frame and cross-panel coordination.

## LayoutContext keys

- `selectedSpawnId: string | undefined`
- `selectedSpawnAssetId: string | undefined`
- `centerPanelMode: 'spawn-settings' | 'asset-settings'`
- `hasUnsavedChanges: boolean`

## Mode routing and guards

- Mode switches requested via `mediaspawner:request-center-switch`.
- Always guard on `hasUnsavedChanges`; prompt before discarding edits.

## Scrolling and sizing

- Use `min-h-0 overflow-y-auto` on scrollable panels to avoid layout overflow and preserve panel scroll behavior.

## Performance optimization

### Lazy loading child components

- **Lazy load heavy child components**: Use `React.lazy()` for SpawnList, SpawnEditorWorkspace, and AssetManagementPanel.
- **Progressive loading with Suspense**: Wrap each lazy component in Suspense with appropriate fallbacks.
- **Defer UI providers**: Move Tooltip.Provider and Toaster to Layout level to reduce main bundle size.

- **Example implementation**:

  ```typescript
  // Layout.tsx - Lazy load all child components
  const SpawnList = lazy(() =>
    import("../spawn-list").then(module => ({ default: module.SpawnList }))
  );
  const SpawnEditorWorkspace = lazy(() =>
    import("../configuration").then(module => ({ default: module.SpawnEditorWorkspace }))
  );
  const AssetManagementPanel = lazy(() =>
    import("../asset-management/AssetManagementPanel")
  );

  const Layout = () => (
    <Tooltip.Provider> {/* ✅ Moved from App.tsx */}
      <LayoutProvider>
        <ThreePanelLayout
          leftPanel={
            <Suspense fallback={<div>Loading spawns...</div>}>
              <SpawnList />
            </Suspense>
          }
          centerPanel={
            <Suspense fallback={<div>Loading editor...</div>}>
              <SpawnEditorWorkspace />
            </Suspense>
          }
          rightPanel={
            <Suspense fallback={<div>Loading assets...</div>}>
              <AssetManagementPanel />
            </Suspense>
          }
        />
      </LayoutProvider>
      <Toaster /> {/* ✅ Moved from App.tsx */}
    </Tooltip.Provider>
  );
  ```

### Bundle impact

- **Before**: All components loaded in main bundle (490KB)
- **After**: Components load progressively (408KB main + lazy chunks)
- **Result**: 93% improvement in First Contentful Paint (7088ms → 472ms)

## Testing guidance

- Verify `LayoutContext` updates propagate correctly.
- Assert mode routing respects the unsaved-changes guard.
- Ensure header and panel placeholders render correct accessible names.
- Test lazy loading fallbacks render correctly during component loading.
