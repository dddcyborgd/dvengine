import type { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import type { CType } from "@oncyberio/engine/space/components/components";
import type { Component3DEditor } from "../component-editor/ui-editor";

type EditorConstructor = new (component: Component3D) => Component3DEditor;

const editorRegistry = new Map<string, EditorConstructor>();

export function registerEditor(type: CType, Editor: EditorConstructor) {
  editorRegistry.set(type, Editor);
}

export function getEditorClass(
  type: string
): EditorConstructor | undefined {
  return editorRegistry.get(type);
}

const editorMap = new WeakMap<Component3D, Component3DEditor>();

export function getOrCreateEditor(
  component: Component3D
): Component3DEditor | null {
  if (component == null || component.wasDisposed) return null;

  const existing = editorMap.get(component);
  if (existing != null) return existing;

  const EditorClass = getEditorClass(component.componentType as string);
  if (EditorClass == null) return null;

  const editor = new EditorClass(component);
  editorMap.set(component, editor);
  editor._onInit();

  component.on("DISPOSED", () => {
    editor._onDispose();
    editorMap.delete(component);
  });

  return editor;
}
